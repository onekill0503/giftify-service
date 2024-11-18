import { GraphQLClient } from "graphql-request";
import Donations from "../schema/types/Donations";
import GET_DONATION_AFTER from "../queries/GetDonationAfter";
import Withdraw from "../schema/types/Withdraw";
import GET_WITHDRAW_AFTER from "../queries/GetWithdrawAfter";

export const getSubGraphClient = () => {
  const client = new GraphQLClient(process.env.SUBGRAPH_ENDPOINT ?? ``);
  return client;
};

export const getWithdrawDataAfter = async (timestamp: BigInt) => {
  const client = getSubGraphClient();
  timestamp = BigInt(0);
  try {
    const response = (await client.request<{ initiateWithdraws: Withdraw[] }>(
      GET_WITHDRAW_AFTER,
      { timestamp: timestamp.toString() }
    )).initiateWithdraws;
    return response;
  } catch (error) {
    console.error("Error fetching donations:", error);
    return [];
  }
};
export const getDonationDataAfter = async (timestamp: BigInt) => {
  const client = getSubGraphClient();
  timestamp = BigInt(0);
  try {
    const response = (await client.request<{ newDonations: Donations[] }>(
      GET_DONATION_AFTER,
      { timestamp: timestamp.toString() }
    )).newDonations;
    return response;
  } catch (error) {
    console.error("Error fetching donations:", error);
    return [];
  }
};
