// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title PoWNFT - ERC721 with PoW-gated minting + rarity based on solution quality
 * @dev Stacks revenue: Mint fees + secondary royalties + rarity-driven value (rarer NFTs sell for more).
 *      Users mine harder PoW for better traits.
 *      Extends the core PoW verification.
 */
contract PoWNFT is ERC721, Ownable {
    using Strings for uint256;

    uint256 public constant MAX_SUPPLY = 10000;
    uint256 public totalMinted;
    uint256 public difficultyTarget; // Same as PoWMinter

    // Rarity tiers based on how small the hash is (more leading zeros = rarer)
    struct NFTTraits {
        uint8 background;   // 0-4
        uint8 body;         // 0-9
        uint8 accessory;    // 0-5
        uint8 eyes;         // 0-6
        uint8 rarityScore;  // 0-100
    }

    mapping(uint256 => NFTTraits) public tokenTraits;
    mapping(address => uint256) public mintedCount; // Limit per address if wanted

    event PoWMinted(uint256 tokenId, address minter, uint256 nonce, uint256 rarityScore);

    constructor(uint256 _initialTarget) ERC721("PoWNFT", "POW") Ownable(msg.sender) {
        difficultyTarget = _initialTarget;
    }

    /**
     * @dev Verify PoW (same as PoWMinter)
     */
    function verifyPoW(bytes32 challenge, uint256 nonce) internal view returns (bool, bytes32) {
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
        return (uint256(hash) < difficultyTarget, hash);
    }

    /**
     * @dev Compute rarity from hash quality (smaller hash = better traits)
     */
    function computeRarity(bytes32 hash) internal pure returns (NFTTraits memory) {
        uint256 h = uint256(hash);
        uint8 rarityScore = uint8((h >> 240) % 101); // Simple scoring, higher better? Or invert

        // More sophisticated: leading zero bits for rarity
        uint8 leadingZeros = 0;
        for (uint i = 0; i < 32; i++) {
            if (uint8(hash[i]) == 0) {
                leadingZeros++;
            } else {
                break;
            }
        }
        rarityScore = uint8(leadingZeros * 4 + (uint8(hash[leadingZeros]) % 60)); // Example scaling

        NFTTraits memory traits;
        traits.background = uint8(uint256(hash) % 5);
        traits.body = uint8((uint256(hash) >> 32) % 10);
        traits.accessory = uint8((uint256(hash) >> 64) % 6);
        traits.eyes = uint8((uint256(hash) >> 96) % 7);
        traits.rarityScore = rarityScore > 100 ? 100 : rarityScore;

        return traits;
    }

    /**
     * @dev PoW-gated mint. Harder solutions yield better rarity.
     *      Revenue stacked: Base fee + potential premium for rare traits.
     */
    function mint(uint256 nonce) external payable {
        require(totalMinted < MAX_SUPPLY, "Max supply reached");
        // require(mintedCount[msg.sender] < 5, "Per address limit"); // optional

        // Revenue fee (stacked monetization)
        uint256 mintFee = 0.001 ether; // Tune for market
        require(msg.value >= mintFee, "Insufficient mint fee");
        payable(owner()).transfer(msg.value); // Or split, treasury, etc.

        bytes32 challenge = keccak256(abi.encodePacked(msg.sender, blockhash(block.number - 1), block.number / 10));
        (bool valid, bytes32 solutionHash) = verifyPoW(challenge, nonce);
        require(valid, "Invalid PoW");

        // Rarity based on solution quality
        NFTTraits memory traits = computeRarity(solutionHash);

        uint256 tokenId = totalMinted;
        _safeMint(msg.sender, tokenId);
        tokenTraits[tokenId] = traits;
        totalMinted++;
        mintedCount[msg.sender]++;

        emit PoWMinted(tokenId, msg.sender, nonce, traits.rarityScore);

        // Optional: Ultra-rare bonus logic or emit for marketplace integration
    }

    /**
     * @dev Token URI with on-chain traits (or baseURI + JSON)
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Nonexistent token");
        NFTTraits memory traits = tokenTraits[tokenId];

        // Simple on-chain metadata or return SVG / JSON string
        // In production: Use IPFS or dynamic server, or full on-chain SVG
        return string(abi.encodePacked(
            "data:application/json;base64,",
            // Base64 encoded metadata with traits (simplified here)
            "eyJuYW1lIjoiUG9XIE5GVCAj", 
            tokenId.toString(),
            "\",\"description\":\"PoW Mined NFT with rarity based on computational work\",\"attributes\":[",
            "{\"trait_type\":\"Background\",\"value\":", traits.background.toString(), "},",
            "{\"trait_type\":\"Body\",\"value\":", traits.body.toString(), "},",
            "{\"trait_type\":\"Accessory\",\"value\":", traits.accessory.toString(), "},",
            "{\"trait_type\":\"Eyes\",\"value\":", traits.eyes.toString(), "},",
            "{\"trait_type\":\"Rarity Score\",\"value\":", traits.rarityScore.toString(), "}]"
        ));
    }

    // Admin functions for revenue / management
    function setDifficulty(uint256 _newTarget) external onlyOwner {
        difficultyTarget = _newTarget;
    }

    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
