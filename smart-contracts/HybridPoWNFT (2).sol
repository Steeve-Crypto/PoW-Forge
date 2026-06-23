// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import {VRFConsumerBaseV2} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2.sol";
import {VRFCoordinatorV2Interface} from "@chainlink/contracts/src/v0.8/vrf/dev/interfaces/VRFCoordinatorV2Interface.sol";

/**
 * @title HybridPoWNFT - Full PoW + Chainlink VRF Hybrid
 * @dev Complete on-chain VRF integration (request + fulfill flow)
 *      PoW for commitment/anti-bot + VRF for unbiased randomness in traits.
 *      Stacks maximum revenue: mint fees + strong rarity premiums + royalties.
 *
 * Flow:
 * 1. User mines PoW nonce off-chain (Go miner).
 * 2. Calls requestHybridMint(nonce) → pays fee, verifies PoW, requests VRF randomness, stores pending request.
 * 3. Chainlink VRF fulfills → fulfillRandomWords combines PoW hash + randomWords → generates traits → mints NFT.
 *
 * Revenue: Base mint fee + rarity-driven secondary value + ERC2981 royalties.
 */
contract HybridPoWNFT is ERC721, ERC2981, Ownable, VRFConsumerBaseV2 {
    using Strings for uint256;

    // VRF Configuration (set at deploy or via owner)
    VRFCoordinatorV2Interface public immutable i_vrfCoordinator;
    uint64 public s_subscriptionId;
    bytes32 public s_keyHash;
    uint32 public s_callbackGasLimit = 500000; // Adjust as needed
    uint16 public s_requestConfirmations = 3;
    uint32 public s_numWords = 1;

    uint256 public constant MAX_SUPPLY = 10000;
    uint256 public totalMinted;
    uint256 public difficultyTarget;

    // Mint fee (tunable for revenue)
    uint256 public mintFee = 0.001 ether;

    struct PendingRequest {
        address user;
        uint256 nonce;
        bytes32 challenge;
        bytes32 powHash; // Stored for trait computation
        bool fulfilled;
    }

    mapping(uint256 => PendingRequest) public s_requests; // requestId => PendingRequest
    mapping(uint256 => uint256) public s_tokenIdToRequestId; // For linking

    // Traits struct (same as before, enhanced with VRF entropy)
    struct NFTTraits {
        uint8 background;
        uint8 body;
        uint8 accessory;
        uint8 eyes;
        uint8 rarityScore;
    }

    mapping(uint256 => NFTTraits) public tokenTraits;
    mapping(address => uint256) public mintedCount;
    mapping(uint256 => string) private _tokenURIs; // IPFS URIs for rich metadata

    event HybridMintRequested(uint256 indexed requestId, address indexed user, uint256 nonce);
    event HybridMintFulfilled(uint256 indexed requestId, uint256 indexed tokenId, uint256 rarityScore);
    event VRFConfigUpdated(uint64 subscriptionId, bytes32 keyHash);

    constructor(
        uint256 _initialTarget,
        address _vrfCoordinator,
        uint64 _subscriptionId,
        bytes32 _keyHash
    ) 
        ERC721("HybridPoWNFT", "HPOW") 
        Ownable(msg.sender) 
        VRFConsumerBaseV2(_vrfCoordinator) 
    {
        difficultyTarget = _initialTarget;
        i_vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinator);
        s_subscriptionId = _subscriptionId;
        s_keyHash = _keyHash;

        // Set default royalty: 5% (500 basis points) to owner
        _setDefaultRoyalty(msg.sender, 500);
    }

    /**
     * @dev Verify PoW using SHA256 precompile (matches Go miner exactly)
     */
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
        return (uint256(hash) < difficultyTarget, hash);
    }

    /**
     * @dev Generate challenge (same as before, can be enhanced with VRF later)
     */
    function getChallenge(address user) public view returns (bytes32) {
        bytes32 blockHash = blockhash(block.number - 1);
        if (blockHash == bytes32(0)) blockHash = blockhash(block.number - 2);
        return keccak256(abi.encodePacked(user, blockHash, block.number / 10));
    }

    /**
     * @dev MAIN ENTRY: Request hybrid mint (PoW + VRF)
     *      Verifies PoW, requests randomness, stores pending request.
     *      User pays mintFee upfront.
     */
    function requestHybridMint(uint256 nonce) external payable {
        require(totalMinted < MAX_SUPPLY, "Max supply reached");
        require(msg.value >= mintFee, "Insufficient mint fee");
        require(mintedCount[msg.sender] < 10, "Per address limit reached"); // Tune as needed

        bytes32 challenge = getChallenge(msg.sender);
        (bool valid, bytes32 powHash) = verifyPoW(challenge, nonce);
        require(valid, "Invalid PoW solution");

        // Request randomness from Chainlink VRF
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            s_keyHash,
            s_subscriptionId,
            s_requestConfirmations,
            s_callbackGasLimit,
            s_numWords
        );

        // Store pending request
        s_requests[requestId] = PendingRequest({
            user: msg.sender,
            nonce: nonce,
            challenge: challenge,
            powHash: powHash,
            fulfilled: false
        });

        mintedCount[msg.sender]++;

        // Transfer fee to owner/treasury immediately (revenue)
        payable(owner()).transfer(msg.value);

        emit HybridMintRequested(requestId, msg.sender, nonce);
    }

    /**
     * @dev VRF Callback - FULL ON-CHAIN FULFILL FLOW
     *      Chainlink calls this automatically with randomWords.
     *      Combines PoW hash + VRF randomness → generates traits → mints NFT.
     */
    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
        PendingRequest storage request = s_requests[requestId];
        require(!request.fulfilled, "Request already fulfilled");
        require(request.user != address(0), "Invalid request");

        request.fulfilled = true;

        // Combine PoW hash + VRF random for hybrid entropy
        bytes32 combinedSeed = keccak256(abi.encodePacked(request.powHash, randomWords[0]));

        // Generate traits from combined seed (rarity influenced by both PoW quality and VRF)
        NFTTraits memory traits = _computeHybridTraits(combinedSeed, request.powHash);

        uint256 tokenId = totalMinted;
        _safeMint(request.user, tokenId);
        tokenTraits[tokenId] = traits;
        totalMinted++;
        s_tokenIdToRequestId[tokenId] = requestId;

        emit HybridMintFulfilled(requestId, tokenId, traits.rarityScore);

        // Optional: Clean up storage if needed (gas optimization)
        // delete s_requests[requestId];
    }

    /**
     * @dev Compute traits using hybrid seed (PoW + VRF)
     *      Better PoW (smaller original hash) + good VRF random = higher rarity potential.
     */
    function _computeHybridTraits(bytes32 combinedSeed, bytes32 powHash) internal pure returns (NFTTraits memory) {
        uint256 seed = uint256(combinedSeed);
        uint256 powValue = uint256(powHash);

        // Leading zeros from original PoW for base rarity
        uint8 leadingZeros = 0;
        for (uint i = 0; i < 32; i++) {
            if (uint8(powHash[i]) == 0) leadingZeros++;
            else break;
        }

        // Hybrid rarity score: PoW effort + VRF entropy
        uint8 rarityScore = uint8(
            (leadingZeros * 6) + 
            (uint8(seed % 40)) + 
            (uint8((powValue >> 128) % 30))
        );
        if (rarityScore > 100) rarityScore = 100;

        NFTTraits memory traits;
        traits.background = uint8(seed % 5);
        traits.body = uint8((seed >> 32) % 10);
        traits.accessory = uint8((seed >> 64) % 6);
        traits.eyes = uint8((seed >> 96) % 7);
        traits.rarityScore = rarityScore;

        return traits;
    }

    /**
     * @dev tokenURI with traits (same as before, enhanced)
     */
    /**
     * @dev Returns the token URI. Prefers IPFS URI if set (rich metadata), 
     *      otherwise falls back to on-chain SVG.
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Nonexistent token");

        string memory _tokenURI = _tokenURIs[tokenId];
        if (bytes(_tokenURI).length != 0) {
            return _tokenURI; // Return IPFS URI for rich metadata
        }

        // Fallback: Basic on-chain SVG (for immediate display before IPFS pinning)
        NFTTraits memory traits = tokenTraits[tokenId];
        string memory svg = string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">',
            '<rect width="400" height="400" fill="hsl(', uint256(traits.background) * 72, ',70%,50%)"/>',
            '<circle cx="200" cy="200" r="120" fill="hsl(', uint256(traits.body) * 36, ',80%,60%)"/>',
            '<rect x="140" y="140" width="120" height="120" fill="hsl(', uint256(traits.accessory) * 60, ',90%,55%)" rx="20"/>',
            '<circle cx="200" cy="180" r="30" fill="hsl(', uint256(traits.eyes) * 50, ',100%,70%)"/>',
            '<text x="200" y="340" font-size="28" fill="white" text-anchor="middle">Rarity: ', traits.rarityScore.toString(), '</text>',
            '</svg>'
        ));

        return string(abi.encodePacked(
            "data:application/json;base64,",
            // Simplified fallback JSON with embedded SVG
            "eyJuYW1lIjoiSHlicmlkIFBvVyBORlQgIywiaW1hZ2UiOiJkYXRhOmltYWdlL3N2Zyt4bWw7YmFzZTY0LCIsImRlc2NyaXB0aW9uIjoiSHlicmlkIFBvVysgVlJGIE5GVC4gUmVhbCB3b3JrICsgdmVyaWZpYWJsZSByYW5kb21uZXNzLiIsImF0dHJpYnV0ZXMiOlt7InRyYWl0X3R5cGUiOiJCYWNrZ3JvdW5kIiwidmFsdWUiOiI",
            traits.background.toString(),
            "In0seyJ0cmFpdF90eXBlIjoiQm9keSIsInZhbHVlIjoi",
            traits.body.toString(),
            "In0seyJ0cmFpdF90eXBlIjoiQWNjZXNzb3J5IiwidmFsdWUiOiI",
            traits.accessory.toString(),
            "In0seyJ0cmFpdF90eXBlIjoiRXllcyIsInZhbHVlIjoi",
            traits.eyes.toString(),
            "In0seyJ0cmFpdF90eXBlIjoiUmFyaXR5IFNjb3JlIiwidmFsdWUiOiI",
            traits.rarityScore.toString(),
            "In1dfQ=="
        ));
    }

    /**
     * @dev Sets the token URI to an IPFS link for rich metadata.
     *      Called by the platform after pinning rich JSON + image to IPFS.
     */
    function setTokenURI(uint256 tokenId, string memory _tokenURI) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Nonexistent token");
        _tokenURIs[tokenId] = _tokenURI;
    }

    // ==================== ADMIN / REVENUE FUNCTIONS ====================

    /**
     * @dev ERC2981 royalties support
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev Set default royalty (e.g. 500 = 5%)
     */
    function setDefaultRoyalty(address receiver, uint96 feeNumerator) external onlyOwner {
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    /**
     * @dev Set royalty for a specific token (optional per-token override)
     */
    function setTokenRoyalty(uint256 tokenId, address receiver, uint96 feeNumerator) external onlyOwner {
        _setTokenRoyalty(tokenId, receiver, feeNumerator);
    }

    function setVRFConfig(
        uint64 _subscriptionId,
        bytes32 _keyHash,
        uint32 _callbackGasLimit,
        uint16 _requestConfirmations
    ) external onlyOwner {
        s_subscriptionId = _subscriptionId;
        s_keyHash = _keyHash;
        s_callbackGasLimit = _callbackGasLimit;
        s_requestConfirmations = _requestConfirmations;
        emit VRFConfigUpdated(_subscriptionId, _keyHash);
    }

    function setDifficultyTarget(uint256 _newTarget) external onlyOwner {
        difficultyTarget = _newTarget;
    }

    function setMintFee(uint256 _newFee) external onlyOwner {
        mintFee = _newFee;
    }

    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    // Fallback for receiving ETH
    receive() external payable {}
}
