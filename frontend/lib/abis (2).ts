export const PoWNFTABI = [ /* previous simple one kept for compatibility */ ] as const;

export const HybridPoWNFTABI = [
  {
    "inputs": [{"internalType": "uint256", "name": "nonce", "type": "uint256"}],
    "name": "requestHybridMint",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
    "name": "getChallenge",
    "outputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "requestId", "type": "uint256"}],
    "name": "s_requests",
    "outputs": [
      {"internalType": "address", "name": "user", "type": "address"},
      {"internalType": "uint256", "name": "nonce", "type": "uint256"},
      {"internalType": "bytes32", "name": "challenge", "type": "bytes32"},
      {"internalType": "bytes32", "name": "powHash", "type": "bytes32"},
      {"internalType": "bool", "name": "fulfilled", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "requestId", "type": "uint256"},
      {"indexed": true, "internalType": "address", "name": "user", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "nonce", "type": "uint256"}
    ],
    "name": "HybridMintRequested",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "requestId", "type": "uint256"},
      {"indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "rarityScore", "type": "uint256"}
    ],
    "name": "HybridMintFulfilled",
    "type": "event"
  }
] as const;

// Note: For full production ABI, run `forge build` and extract from out/HybridPoWNFT.sol/HybridPoWNFT.json
