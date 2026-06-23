import { ApolloClient, InMemoryCache, gql } from '@apollo/client';

export const apolloClient = new ApolloClient({
  uri: process.env.NEXT_PUBLIC_SUBGRAPH_URL || 'https://api.studio.thegraph.com/query/your-subgraph-id/powforge/version/latest',
  cache: new InMemoryCache(),
});

// Example queries for dashboard and gallery
export const GET_MINT_REQUESTS = gql`
  query GetMintRequests($first: Int = 100) {
    hybridMintRequests(first: $first, orderBy: timestamp, orderDirection: desc) {
      id
      requestId
      user
      nonce
      timestamp
      fulfilled
      tokenId
      rarityScore
    }
  }
`;

export const GET_NFTS = gql`
  query GetNFTs($first: Int = 50) {
    nfts(first: $first, orderBy: mintedAt, orderDirection: desc) {
      id
      tokenId
      owner
      rarityScore
      background
      body
      accessory
      eyes
      mintedAt
    }
  }
`;

export const GET_ANALYTICS = gql`
  query GetAnalytics {
    hybridMintRequests(first: 1000) {
      rarityScore
    }
    nfts(first: 1000) {
      rarityScore
    }
  }
`;
