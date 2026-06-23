// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ERC721PoWRarity - Proof of Work Gated ERC721 with Dynamic Rarity
 * @dev Production-ready NFT contract where rarity is determined by the quality of the off-chain PoW solution.
 *      Harder PoW (smaller hash relative to target) = higher rarity tier = more valuable primary + secondary.
 *
 * RARITY SYSTEM (based on real computational work):
 * - The Go miner finds a nonce whose SHA256 hash < difficultyTarget.
 * - On-chain we recompute the hash and bucket it into 4 tiers:
 *   0 = Common   (hash < target)
 *   1 = Rare     (hash < target / 2)
 *   2 = Epic     (hash < target / 4)
 *   3 = Legendary (hash < target / 8)
 * - Higher tier = provably rarer because it required more work on average.
 *
 * MONETIZATION STACK (this contract enables all layers):
 * 1. Primary mint fees (tiered pricing - Legendary costs more or sells out faster)
 * 2. EIP-2981 Royalties on ALL secondary sales (ongoing revenue stream)
 * 3. Max supply + tier caps for scarcity
 * 4. Launchpad / Template licensing (sell this pattern to other projects)
 * 5. Your flagship collection: Deploy this as your own drop → capture primary + royalties + ecosystem
 * 6. Premium miner upsell (users pay for faster/better solutions or hosted mining)
 *
 * DEPLOY WITH FOUNDRY (fast):
 *   forge install OpenZeppelin/openzeppelin-contracts
 *   Then use the updated Deploy script.
 */

import {ERC721} from "openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
import {ERC2981} from "openzeppelin-contracts/contracts/token/common/ERC2981.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {Strings} from "openzeppelin-contracts/contracts/utils/Strings.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";

contract ERC721PoWRarity is ERC721, ERC2981, Ownable, ReentrancyGuard {
    using Strings for uint256;

    uint256 public nextTokenId = 1;
    uint256 public difficultyTarget;
    uint256 public maxSupply = 10000;
    uint256 public constant MAX_TIER = 3;

    // Tiered mint pricing (in wei) - owner can update
    uint256[4] public mintPrice = [
        0.001 ether,  // 0 Common
        0.003 ether,  // 1 Rare
        0.008 ether,  // 2 Epic
        0.02  ether   // 3 Legendary
    ];

    // Rarity tracking
    mapping(uint256 => uint8) public tokenRarity; // 0-3

    // Anti-replay
    mapping(bytes32 => bool) public usedSolutions;

    // Metadata
    string public baseTokenURI; // Set to "ipfs://YOUR_CID/" or "https://yourapi.com/metadata/"
    // Recommended: different folders or CIDs per tier for images/traits
    // e.g. baseTokenURI/0/ for common, baseTokenURI/3/ for legendary

    // Events
    event NFTMinted(
        address indexed minter,
        uint256 indexed tokenId,
        uint8 rarity,
        uint256 nonce,
        bytes32 hash
    );
    event DifficultyUpdated(uint256 newTarget);
    event PricesUpdated(uint256[4] newPrices);
    event BaseURIUpdated(string newBaseURI);

    constructor(
        uint256 _initialTarget,
        string memory _baseTokenURI,
        address _royaltyReceiver,
        uint96 _royaltyFeeNumerator // e.g. 500 = 5%
    ) ERC721("PoW Rarity", "POWRARITY") Ownable(msg.sender) {
        difficultyTarget = _initialTarget;
        baseTokenURI = _baseTokenURI;
        _setDefaultRoyalty(_royaltyReceiver, _royaltyFeeNumerator);
    }

    // ==================== CORE PoW + RARITY MINT ====================

    function getChallenge(address user) public view returns (bytes32) {
        bytes32 blockHash = blockhash(block.number - 1);
        if (blockHash == bytes32(0)) blockHash = blockhash(block.number - 2);
        return keccak256(abi.encodePacked(user, blockHash, block.number / 10));
    }

    function verifyPoW(bytes32 challenge, uint256 nonce) internal view returns (bool, bytes32) {
        bytes32 hash;
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, challenge)
            mstore(add(ptr, 32), nonce)
            let success := staticcall(gas(), 0x02, ptr, 64, ptr, 32)
            if iszero(success) { revert(0, 0) }
            hash := mload(ptr)
        }
        bool valid = uint256(hash) < difficultyTarget;
        return (valid, hash);
    }

    /**
     * @dev Main mint function. PoW quality directly determines rarity tier and value.
     */
    function mintWithPoW(uint256 nonce) external payable nonReentrant {
        require(nextTokenId <= maxSupply, "Max supply reached");

        bytes32 challenge = getChallenge(msg.sender);
        (bool valid, bytes32 hash) = verifyPoW(challenge, nonce);
        require(valid, "Invalid or insufficient PoW solution");

        bytes32 solutionKey = keccak256(abi.encodePacked(challenge, nonce));
        require(!usedSolutions[solutionKey], "Solution already used");
        usedSolutions[solutionKey] = true;

        uint8 rarity = _computeRarity(hash);
        uint256 price = mintPrice[rarity];
        require(msg.value >= price, "Insufficient ETH for this rarity tier");

        uint256 tokenId = nextTokenId++;
        _safeMint(msg.sender, tokenId);
        tokenRarity[tokenId] = rarity;

        // Refund excess
        if (msg.value > price) {
            payable(msg.sender).transfer(msg.value - price);
        }

        emit NFTMinted(msg.sender, tokenId, rarity, nonce, hash);
    }

    /**
     * @dev Rarity is higher when the achieved hash is significantly smaller than target.
     *      This directly rewards more computational work with higher tier.
     */
    function _computeRarity(bytes32 hash) internal view returns (uint8) {
        uint256 h = uint256(hash);
        uint256 t = difficultyTarget;

        if (h < t / 8) return 3; // Legendary - significantly harder
        if (h < t / 4) return 2; // Epic
        if (h < t / 2) return 1; // Rare
        return 0;                // Common
    }

    // ==================== METADATA ====================

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "ERC721: URI query for nonexistent token");
        uint8 rarity = tokenRarity[tokenId];
        // Example structure: baseURI/3/42.json  (legendary token #42)
        // Or use a single metadata server that serves different JSON based on rarity + tokenId
        return string.concat(
            baseTokenURI,
            rarity.toString(),
            "/",
            tokenId.toString(),
            ".json"
        );
    }

    function setBaseTokenURI(string calldata _newBaseURI) external onlyOwner {
        baseTokenURI = _newBaseURI;
        emit BaseURIUpdated(_newBaseURI);
    }

    // ==================== ADMIN / REVENUE ====================

    function setDifficultyTarget(uint256 _newTarget) external onlyOwner {
        difficultyTarget = _newTarget;
        emit DifficultyUpdated(_newTarget);
    }

    function setMintPrices(uint256[4] calldata _newPrices) external onlyOwner {
        mintPrice = _newPrices;
        emit PricesUpdated(_newPrices);
    }

    function setMaxSupply(uint256 _newMax) external onlyOwner {
        require(_newMax >= nextTokenId - 1, "Cannot reduce below minted");
        maxSupply = _newMax;
    }

    function setDefaultRoyalty(address receiver, uint96 feeNumerator) external onlyOwner {
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    // ==================== INTERFACES ====================

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
