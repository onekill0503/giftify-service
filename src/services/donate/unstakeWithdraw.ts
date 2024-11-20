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
  const cooldownStatus = await SmartContract.cooldowns(
    process.env.DONATE_CONTRACT_ADDRESS ?? `0x0`
  );
  if (cooldownStatus[0] > BigInt(new Date().getTime())) {
    console.log(`[${new Date()}] UNSTAKE: Cooldown is not finished yet`);
    return false;
  }
  if (cooldownStatus[1] === BigInt(0)) {
    console.log(`[${new Date()}] UNSTAKE: No funds to withdraw`);
    return false;
  }

  console.log(`[${new Date()}] UNSTAKE: Initiating batch withdraw`);
  const withdrawAmount = await DonateSC.getBatchWithdrawAmount();
  if(withdrawAmount <= BigInt(0)) {
    console.log(`[${new Date()}] UNSTAKE: No funds to withdraw`);
    return false;
  }

  console.log(`[${new Date()}] UNSTAKE: Generate Mekrle Tree Data`)
  const merkleTreeData = await generateMerkleTreeData(
    String(cooldownStatus[1]),
    withdrawAmount
  );
  console.log(`[${new Date()}] UNSTAKE: Combine MerkleTree with Last Bacth Data`)
  const updatedData = await combineMerkleTreeDataWithRedis(merkleTreeData);

  console.log(`[${new Date()}] UNSTAKE: Generate Merkle Tree`)
  const rootHash = await generateMerkleTree(updatedData);

  console.log(`[${new Date()}] UNSTAKE: Update Merkle Root in SmartContract`)
  await DonateSC.setMerkleRoot(rootHash);
  
  console.log(`[${new Date()}] UNSTAKE: Unstake sUSDe to USDe into SmartContract`)
  await DonateSC.unstakeBatchWithdraw();
};

/**
 * get the initiated withdraw data from the subgraph after the last batch withdraw timestamp
 * @returns {Promise<Withdraw[]>}
 */
const getInitiedWithdrawData = async (): Promise<Withdraw[]> => {
  const SmartContract = await getDonateContract();
  const lastBatchWithdraw = await SmartContract.getLastBatchWithdraw();
  const WithdrawData: Withdraw[] = await getWithdrawDataAfter(
    BigInt(lastBatchWithdraw)
  );
  if (WithdrawData.length < 1) return [];
  return WithdrawData;
};

/**
 * get the donation data from the subgraph after the last batch withdraw timestamp
 * @returns {Promise<Donations[]>}
 */
const getDonationData = async (): Promise<Donations[]> => {
  const SmartContract = await getDonateContract();
  const lastBatchWithdraw = await SmartContract.getLastBatchWithdraw();
  const DonationData: Donations[] = await getDonationDataAfter(
    BigInt(lastBatchWithdraw)
  );
  if (DonationData.length < 1) return [];
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
  const totalYield = totalAmountInt - totalSharesInt;
  const totalAmountWithouYield = totalAmountInt - totalYield;
  const WithdrawData: Withdraw[] = await getInitiedWithdrawData();
  const DonationData: Donations[] = await getDonationData();
  const MerkleDatas: MerkleData[] = [
    ...WithdrawData.map((w: Withdraw) => {
      const creatorPercentage =
        (BigInt(w.shares) * BigInt(100e18)) / totalSharesInt;
      const creatorAmount = BigInt(
        (BigInt(totalAmountWithouYield) * creatorPercentage) / BigInt(100e18)
      );
      const creatorYield =
        BigInt(BigInt(totalYield) * creatorPercentage) / BigInt(100e18);
      return {
        address: w.creator,
        shares: w.shares,
        amount: (BigInt(creatorAmount) + BigInt(creatorYield)).toString(),
        yield: creatorYield.toString(),
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
      (BigInt(d.gifterShares) * BigInt(100e18)) /
      BigInt(CreatorWithdrawData.shares);

    const gifterAmount = BigInt(
      (BigInt(CreatorWithdrawData.yield) * BigInt(gifterPercentage)) /
        BigInt(100e18)
    );

    const creatorMerkleIndex: number = MerkleDatas.findIndex(
      (w: MerkleData) => w.address === d.creator
    );
    MerkleDatas[creatorMerkleIndex].amount = (
      BigInt(MerkleDatas[creatorMerkleIndex].amount) - gifterAmount
    ).toString();
    MerkleDatas[creatorMerkleIndex].yield = (
      BigInt(MerkleDatas[creatorMerkleIndex].yield) - gifterAmount
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
    const onChainGifterData = await SmartContract.gifters(element.address);

    if (
      onChainGifterData[0] === BigInt(0) &&
      onChainGifterData[1] === BigInt(0) &&
      onChainGifterData[2] === BigInt(0) &&
      onChainGifterData[3] === BigInt(0)
    )
      continue;

    if (
      BigInt(onChainGifterData[3]) <
      BigInt(await SmartContract.getLastBatchWithdraw())
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
