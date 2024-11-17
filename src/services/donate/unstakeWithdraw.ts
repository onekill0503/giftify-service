import Cooldown from "../../schema/types/Cooldown";
import Donations from "../../schema/types/Donations";
import MerkleData from "../../schema/types/MerkleData";
import Withdraw from "../../schema/types/Withdraw";
import { getDonateContract, getSUSDContract } from "../../utils/blockchain";
import {
  getDonationDataAfter,
  getWithdrawDataAfter,
} from "../../utils/subgraph";
import redis from "../../utils/redis";
import { createMerkleTree } from "../../utils/MerkleTree";

/**
 * Unstake and withdraw the funds from the smart contract
 * @returns {Promise<void>}
 */
const unstakeWithdraw = async () => {
  const SmartContract = await getSUSDContract();
  const DonateSC = await getDonateContract();

  const cooldownStatus: Cooldown = await SmartContract.cooldown(
    process.env.DONATE_SMART_CONTRACT_ADDRESS ?? `0x0`
  );
  if (cooldownStatus.cooldownEnd > 0) return false;
  if (cooldownStatus.underlyingAmount === 0) return false;
  const merkleTreeData = await generateMerkleTreeData(
    String(cooldownStatus.underlyingAmount),
    await DonateSC.batchWithdrawAmount()
  );
  const updatedData = await combineMerkleTreeDataWithRedis(merkleTreeData);
  const rootHash = await generateMerkleTree(updatedData);
  await DonateSC.setMerkleRoot(rootHash);
  await DonateSC.batchWithdraw();
};

/**
 * get the initiated withdraw data from the subgraph after the last batch withdraw timestamp
 * @returns {Promise<Withdraw[]>}
 */
const getInitiedWithdrawData = async (): Promise<Withdraw[]> => {
  const SmartContract = await getDonateContract();
  const WithdrawData: Withdraw[] | undefined = (
    await getWithdrawDataAfter(SmartContract.lastBatchWithdraw().toString())
  )?.initiateWithdraw;
  if (!WithdrawData) return [];
  return WithdrawData;
};

/**
 * get the donation data from the subgraph after the last batch withdraw timestamp
 * @returns {Promise<Donations[]>}
 */
const getDonationData = async (): Promise<Donations[]> => {
  const SmartContract = await getDonateContract();
  const DonationData: Donations[] | undefined = (
    await getDonationDataAfter(SmartContract.lastBatchWithdraw().toString())
  )?.newDonations;
  if (!DonationData) return [];
  return removeDuplicateDonationsData(DonationData);
};

/**
 * removing duplication address from the donation data and sum the shares
 * @param data Raw Donation Data from subgraph
 * @returns {Donations[]} Deduplicated Donation Data
 */
const removeDuplicateDonationsData = (data: Donations[]): Donations[] => {
  const gifterMap = new Map<string, Donations>();
  data.forEach((g: Donations) => {
    if (gifterMap.has(g.gifter)) {
      const newGiftData: Donations = {
        ...g,
        gifterShares: (
          BigInt(gifterMap.get(g.gifter)!.gifterShares) + BigInt(g.gifterShares)
        ).toString(),
      };
      gifterMap.set(g.gifter, newGiftData);
    } else {
      gifterMap.set(g.gifter, g);
    }
  });
  return Array.from(gifterMap.entries()).map((d) => d[1]);
};

/**
 * Divided the USDe amount each user (creator and gifter) with specific portions
 * then generate the merkle tree data to make merkle tree
 * @param totalAmount Total amount of USDe from Withdraw
 * @param totalShares Total withdrawed shares
 * @returns {Promise<MerkleData[]>}
 */
const generateMerkleTreeData = async (
  totalAmount: string,
  totalShares: string
): Promise<MerkleData[]> => {
  const totalSharesInt = BigInt(totalShares);
  const totalAmountInt = BigInt(totalAmount);
  const WithdrawData: Withdraw[] = await getInitiedWithdrawData();
  const DonationData: Donations[] = await getDonationData();
  const MerkleDatas: MerkleData[] = [
    ...WithdrawData.map((w: Withdraw) => {
      const creatorPercentage: bigint =
        (BigInt(w.shares) / totalAmountInt) * BigInt(100);
      const creatorAmount: BigInt = BigInt(
        (BigInt(totalSharesInt) * BigInt(creatorPercentage)) / BigInt(100)
      );
      return {
        address: w.creator,
        shares: w.shares,
        amount: creatorAmount.toString(),
        yield: (totalAmountInt - totalSharesInt).toString(),
        proof: [``],
      };
    }),
  ];

  DonationData.forEach((d: Donations) => {
    const CreatorWithdrawData: MerkleData | undefined = MerkleDatas.find(
      (w: MerkleData) => w.address === d.creator
    );
    if (!CreatorWithdrawData) return;
    const gifterPercentage =
      (BigInt(d.gifterShares) / BigInt(CreatorWithdrawData.shares)) *
      BigInt(100);
    const gifterAmount =
      BigInt(
        (BigInt(CreatorWithdrawData.yield) * BigInt(gifterPercentage)) /
          BigInt(100)
      ) * BigInt(0.7);
    const creatorMerkleIndex: number = MerkleDatas.findIndex(
      (w: MerkleData) => w.address === d.creator
    );
    MerkleDatas[creatorMerkleIndex].amount = (
      BigInt(MerkleDatas[creatorMerkleIndex].amount) - gifterAmount
    ).toString();
    MerkleDatas.push({
      address: d.gifter,
      shares: d.gifterShares,
      amount: gifterAmount.toString(),
      proof: [``],
      yield: gifterAmount.toString(),
    });
  });

  return MerkleDatas;
};

/**
 * combine with user data from redis who hasn't claimed yet
 * then sum it with the merkle tree data if user data is found in the merkle tree data
 * @param merkleTree generated Merkle Tree Data
 * @returns {Promise<MerkleData[]>} Merkle Tree Data with updated amount
 */
const combineMerkleTreeDataWithRedis = async (
  merkleTree: MerkleData[]
): Promise<MerkleData[]> => {
  const SmartContract = await getDonateContract();
  for (const element of merkleTree) {
    const userData = JSON.parse((await redis.getData(element.address)) ?? `{}`);
    if (!userData?.amount) continue;
    // not handle if user data is not found
    const onChainGifterData = await SmartContract.getGifterData(
      element.address
    );
    if (
      BigInt(onChainGifterData.lastClaimed) <
      BigInt(await SmartContract.lastBatchWithdraw())
    )
      continue;
    element.amount = (
      BigInt(element.amount) + BigInt(userData.amount)
    ).toString();
  }

  return merkleTree;
};

/**
 * Generate merkle tree using merkle tree data
 * @param merkleTreeData clean merkel tree data
 * @returns {Promise<string>} root hash of the merkle tree
 */
const generateMerkleTree = async (
  merkleTreeData: MerkleData[]
): Promise<string> => {
  const params = merkleTreeData.map((m: MerkleData) => {
    return { address: m.address, amount: m.amount };
  });
  const generatedMerkleTree = createMerkleTree(params);
  for (const element of generatedMerkleTree.data) {
    await redis.saveData(
      element.address,
      JSON.stringify({
        amount: element.amount,
        markleProof: generatedMerkleTree.merkleTree.getHexProof(element.leaf),
      })
    );
  }
  return generatedMerkleTree.root;
};

export default unstakeWithdraw;
