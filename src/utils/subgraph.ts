import { GraphQLClient } from "graphql-request";
import Donations from "../schema/types/Donations";
import GET_DONATION_AFTER from "../queries/GetDonationAfter";
import Withdraw from "../schema/types/Withdraw";
import GET_WITHDRAW_AFTER from "../queries/GetWithdrawAfter";

export const getSubGraphClient = () => {
  const client = new GraphQLClient(process.env.SUBGRAPH_ENDPOINT ?? ``);
  return client;
};

export const getWithdrawDataAfter = async (timestamp: string) => {
  const client = getSubGraphClient();
  try {
    const response = await client.request<{ initiateWithdraw: Withdraw[] }>(
      GET_WITHDRAW_AFTER,
      { timestamp }
    );
    return response;
  } catch (error) {
    console.error("Error fetching donations:", error);
    return null;
  }
};
export const getDonationDataAfter = async (timestamp: string) => {
  const client = getSubGraphClient();
  try {
    const response = await client.request<{ newDonations: Donations[] }>(
      GET_DONATION_AFTER,
      { timestamp }
    );
    return response;
  } catch (error) {
    console.error("Error fetching donations:", error);
    return null;
  }
};
