import { gql } from "graphql-request";

const GET_WITHDRAW_AFTER = gql`
  query getWithdrawDataAfter($timestamp: BigInt!) {
    initiateWithdraws(where: { timestamp__gte: $timestamp }) {
      creator
      shares
      timestamp_
    }
  }
`;

export default GET_WITHDRAW_AFTER;
