export const CONTRACT_ADDRESSES = {
  sepolia: {
    PoWNFT: "0xYOUR_DEPLOYED_POWNFT_ADDRESS", // Update after deploy
    PoWMinter: "0xYOUR_DEPLOYED_POWMINTER_ADDRESS",
  },
  base: {
    PoWNFT: "0x...", 
  },
};

export const CHAINLINK_VRF = {
  sepolia: {
    vrfCoordinator: "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625",
    keyHash: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
    subscriptionId: "YOUR_SUBSCRIPTION_ID", // Create at vrf.chain.link
  },
};

export const SUBGRAPH = {
  // Update after deploying your subgraph
  endpoint: process.env.NEXT_PUBLIC_SUBGRAPH_URL || 
    "https://api.studio.thegraph.com/query/your-subgraph-id/powforge/version/latest",
  // Or hosted: https://api.thegraph.com/subgraphs/name/your-username/powforge
};
