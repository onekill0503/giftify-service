import { gql } from "graphql-request";

const GET_WITHDRAW_AFTER = gql`
  query initiateWithdraw($timestamp: BigInt!) {
    donations(where: { timestamp_gt: $timestamp }) {
      creator
      shares
      timestamp
    }
  }
`;

export default GET_WITHDRAW_AFTER;
