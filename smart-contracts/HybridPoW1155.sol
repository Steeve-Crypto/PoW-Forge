// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import {VRFConsumerBaseV2} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2.sol";
import {VRFCoordinatorV2Interface} from "@chainlink/contracts/src/v0.8/vrf/dev/interfaces/VRFCoordinatorV2Interface.sol";

/**
 * @title HybridPoW1155 - ERC1155 version with PoW + VRF
 * @dev Supports semi-fungible tokens / editions with the same fairness mechanics.
 */
contract HybridPoW1155 is ERC1155, ERC2981, Ownable, VRFConsumerBaseV2 {
    VRFCoordinatorV2Interface public immutable i_vrfCoordinator;
    uint64 public s_subscriptionId;
    bytes32 public s_keyHash;
    uint32 public s_callbackGasLimit = 500000;
    uint16 public s_requestConfirmations = 3;
    uint32 public s_numWords = 1;

    uint256 public constant MAX_SUPPLY = 10000;
    uint256 public totalMinted;
    uint256 public difficultyTarget;
    uint256 public mintFee = 0.001 ether;

    struct PendingRequest {
        address user;
        uint256 nonce;
        bytes32 challenge;
        bytes32 powHash;
        bool fulfilled;
        uint256 amount; // For ERC1155 batch minting
    }

    mapping(uint256 => PendingRequest) public s_requests;
    mapping(uint256 => uint256) public tokenSupply; // Per token ID supply

    event HybridMintRequested(uint256 indexed requestId, address indexed user, uint256 nonce, uint256 amount);
    event HybridMintFulfilled(uint256 indexed requestId, uint256 indexed tokenId, uint256 rarityScore, uint256 amount);

    constructor(
        uint256 _initialTarget,
        address _vrfCoordinator,
        uint64 _subscriptionId,
        bytes32 _keyHash
    ) 
        ERC1155("https://api.powforge.xyz/metadata/{id}.json") 
        Ownable(msg.sender) 
        VRFConsumerBaseV2(_vrfCoordinator) 
    {
        difficultyTarget = _initialTarget;
        i_vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinator);
        s_subscriptionId = _subscriptionId;
        s_keyHash = _keyHash;
        _setDefaultRoyalty(msg.sender, 500);
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
        return (uint256(hash) < difficultyTarget, hash);
    }

    function getChallenge(address user) public view returns (bytes32) {
        bytes32 blockHash = blockhash(block.number - 1);
        if (blockHash == bytes32(0)) blockHash = blockhash(block.number - 2);
        return keccak256(abi.encodePacked(user, blockHash, block.number / 10));
    }

    function requestHybridMint(uint256 nonce, uint256 amount) external payable {
        require(totalMinted + amount <= MAX_SUPPLY, "Max supply reached");
        require(msg.value >= mintFee * amount, "Insufficient mint fee");
        require(amount > 0 && amount <= 100, "Invalid amount");

        bytes32 challenge = getChallenge(msg.sender);
        (bool valid, bytes32 powHash) = verifyPoW(challenge, nonce);
        require(valid, "Invalid PoW solution");

        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            s_keyHash,
            s_subscriptionId,
            s_requestConfirmations,
            s_callbackGasLimit,
            s_numWords
        );

        s_requests[requestId] = PendingRequest({
            user: msg.sender,
            nonce: nonce,
            challenge: challenge,
            powHash: powHash,
            fulfilled: false,
            amount: amount
        });

        payable(owner()).transfer(msg.value);

        emit HybridMintRequested(requestId, msg.sender, nonce, amount);
    }

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
        PendingRequest storage request = s_requests[requestId];
        require(!request.fulfilled, "Already fulfilled");
        require(request.user != address(0), "Invalid request");

        request.fulfilled = true;

        bytes32 combinedSeed = keccak256(abi.encodePacked(request.powHash, randomWords[0]));
        uint256 rarityScore = _computeRarityScore(combinedSeed, request.powHash);

        // For ERC1155, we use a single tokenId per "edition" or increment
        uint256 tokenId = totalMinted; // Simple incrementing token ID for editions
        _mint(request.user, tokenId, request.amount, "");

        tokenSupply[tokenId] = request.amount;
        totalMinted += request.amount;

        emit HybridMintFulfilled(requestId, tokenId, rarityScore, request.amount);
    }

    function _computeRarityScore(bytes32 combinedSeed, bytes32 powHash) internal pure returns (uint256) {
        uint256 seed = uint256(combinedSeed);
        uint8 leadingZeros = 0;
        for (uint i = 0; i < 32; i++) {
            if (uint8(powHash[i]) == 0) leadingZeros++;
            else break;
        }
        uint256 score = (leadingZeros * 6) + (uint8(seed % 40)) + (uint8((uint256(powHash) >> 128) % 30));
        return score > 100 ? 100 : score;
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        // In production, this should point to IPFS or your metadata server
        return string(abi.encodePacked(super.uri(tokenId), tokenId.toString()));
    }

    // Admin functions (same as ERC721 version)
    function setDifficultyTarget(uint256 _newTarget) external onlyOwner {
        difficultyTarget = _newTarget;
    }

    function setMintFee(uint256 _newFee) external onlyOwner {
        mintFee = _newFee;
    }

    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
```

This gives a parallel ERC1155 version with the same PoW + VRF logic.

For the LaunchpadFactory, I can add a function to deploy either type, but to keep it simple, note that users can deploy the ERC1155 version separately or extend the factory.

For wiring to backend: The launchpad page already has the log call in the API. Make sure it's called after successful deployment in the frontend code.

Since the launchpad page uses `writeContract`, I can add a call to the log API after the transaction.

To "refine features", I can improve the launchpad page further or add ERC1155 option.

For now, I'll implement the contract and update the launchpad page to have a type selector (ERC721 or ERC1155) and wire the backend log.

Also, update the deployment script for the new contract.

To keep the response manageable, I'll create the contract and update key files.

First, create the deployment script for ERC1155.