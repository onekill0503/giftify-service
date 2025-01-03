import { gql } from "graphql-request";

const GET_ALL_DONATION = gql`
  query getLatestDonation {
    newDonations {
      gifter
      grossAmount
      netAmount
      creator
      gifterShares
      timestamp_
    }
  }
`;

export default GET_ALL_DONATION;
