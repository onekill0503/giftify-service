import { isAddress } from "ethers";
import BasicResponse from "../../schema/dtos/BasicResponse";
import redis from "../../utils/redis";
import ClaimData from "../../schema/types/ClaimData";

/**
 * get user claim data from redis and return as response dto
 * @param wallet user wallet address
 * @returns {Promise<String>} return response dto as string
 */
const Claim = async (wallet: string): Promise<String> => {
  if (!isAddress(wallet)) throw new Error("Invalid wallet address");
  const claimData: ClaimData = JSON.parse(await redis.getData(wallet) ?? `{}`);

  if(!claimData?.markleProof) throw new Error("No claim data found");

  return JSON.stringify(
    new BasicResponse({ data: { address: wallet, amount: claimData.amount, proof: claimData.markleProof } })
  );
};

export default Claim;
