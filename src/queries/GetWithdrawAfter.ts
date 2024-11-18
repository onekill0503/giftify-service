import { gql } from "graphql-request";

const GET_WITHDRAW_AFTER = gql`
  query getWithdrawDataAfter($timestamp: BigInt!) {
    initiateWithdraws(where: { timestamp_gte: $timestamp }) {
      creator
      shares
      timestamp
    }
  }
`;

export default GET_WITHDRAW_AFTER;
