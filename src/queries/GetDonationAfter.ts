import { gql } from "graphql-request";

const GET_DONATION_AFTER = gql`
  query GetDonationsAfter($timestamp: BigInt!) {
    newDonations(where: { timestamp_gt: $timestamp }) {
      gifter
      grossAmount
      netAmount
      creator
      gifterShares
      timestamp
    }
  }
`;

export default GET_DONATION_AFTER;
