import { gql } from "graphql-request";

const GET_DONATION_AFTER = gql`
  query GetDonationsAfter($timestamp: BigInt!) {
    newDonations(where: { timestamp__gte: $timestamp }) {
      gifter
      grossAmount
      netAmount
      creator
      gifterShares
      timestamp_
    }
  }
`;

export default GET_DONATION_AFTER;
