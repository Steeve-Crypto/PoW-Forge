// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PoWMinter - Proof of Work Gated Smart Contract
 * @dev Example contract for fair launches, anti-bot minting, or spam-resistant claims.
 *      Uses off-chain fast PoW (Go miner) + on-chain verification via SHA256 precompile (0x02).
 *      Designed for revenue generation: Add fees, tokenomics, or use as template for paid launchpad.
 *
 * Revenue Model Ideas:
 * - Charge small ETH fee on mint (sent to owner/treasury)
 * - Integrate with ERC20/ERC721: PoW + pay to mint your token
 * - Whitelabel: Sell access to this pattern + optimized miner binary
 * - Launch your own token with this for fair distribution, monetize ecosystem
 *
 * Deploy flow: Foundry (recommended for speed) or Hardhat -> Sepolia testnet -> Ethereum/Polygon/Base mainnet
 */

contract PoWMinter {
    address public owner;
    uint256 public difficultyTarget;
    mapping(address => bool) public hasClaimed;
    mapping(bytes32 => bool) public usedSolutions; // Prevent nonce reuse across users if needed

    event Claimed(address indexed user, uint256 nonce, bytes32 hash, uint256 timestamp);
    event TargetUpdated(uint256 newTarget);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(uint256 _initialTarget) {
        owner = msg.sender;
        difficultyTarget = _initialTarget;
    }

    /**
     * @dev Core PoW verification using EVM SHA256 precompile at address 0x02
     *      Matches exactly the Go miner's prepareData + sha256
     */
    function verifyPoW(bytes32 challenge, uint256 nonce) internal view returns (bool) {
        bytes32 hash;
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, challenge)
            mstore(add(ptr, 32), nonce)
            let success := staticcall(gas(), 0x02, ptr, 64, ptr, 32)
            if iszero(success) {
                revert(0, 0)
            }
            hash := mload(ptr)
        }
        return uint256(hash) < difficultyTarget;
    }

    /**
     * @dev Generate challenge from user + recent block for freshness (prevents pre-mining too far ahead)
     */
    function getChallenge(address user) public view returns (bytes32) {
        // Use blockhash for some entropy. For production, consider Chainlink VRF or block.number / epoch
        bytes32 blockHash = blockhash(block.number - 1);
        if (blockHash == bytes32(0)) {
            blockHash = blockhash(block.number - 2); // fallback
        }
        return keccak256(abi.encodePacked(user, blockHash, block.number / 10)); // epoch every ~10 blocks
    }

    /**
     * @dev Main claim/mint function. Requires valid PoW solution mined off-chain.
     *      Add your token mint logic here (ERC20 _mint, ERC721 safeMint, etc.)
     *      Revenue: Add payable with fee requirement.
     */
    function claim(uint256 nonce) external {
        require(!hasClaimed[msg.sender], "Already claimed");
        
        bytes32 challenge = getChallenge(msg.sender);
        require(verifyPoW(challenge, nonce), "Invalid PoW solution or insufficient difficulty");

        // Optional: prevent solution reuse (if you want global uniqueness)
        bytes32 solutionKey = keccak256(abi.encodePacked(challenge, nonce));
        require(!usedSolutions[solutionKey], "Solution already used");
        usedSolutions[solutionKey] = true;

        hasClaimed[msg.sender] = true;

        // === REVENUE / TOKENOMICS HOOK ===
        // Example 1: Small fee
        // require(msg.value >= 0.0005 ether, "Insufficient fee");
        // payable(owner).transfer(msg.value);
        //
        // Example 2: Your ERC20 mint
        // myToken.mint(msg.sender, 1000 * 1e18);
        //
        // Example 3: NFT claim with rarity based on how hard the nonce was (extra PoW for better traits)

        emit Claimed(msg.sender, nonce, keccak256(abi.encodePacked(challenge, nonce)), block.timestamp);

        // TODO: Add your business logic here for revenue generation
    }

    // === ADMIN / REVENUE FUNCTIONS ===

    function setDifficultyTarget(uint256 _newTarget) external onlyOwner {
        difficultyTarget = _newTarget;
        emit TargetUpdated(_newTarget);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function withdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }

    // Fallback to receive ETH fees
    receive() external payable {}
}
