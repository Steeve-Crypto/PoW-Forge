// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./HybridPoWNFT.sol";

/**
 * @title LaunchpadFactory
 * @dev Factory pattern for deploying multiple HybridPoWNFT collections.
 *      Enables the multi-project launchpad UI.
 */
contract LaunchpadFactory {
    address public immutable owner;
    address[] public deployedCollections;

    event CollectionDeployed(
        address indexed collection,
        address indexed deployer,
        string name,
        string symbol,
        uint256 initialTarget
    );

    constructor() {
        owner = msg.sender;
    }

    uint256 public constant DEPLOYMENT_FEE = 0.05 ether; // Platform fee for launching a new collection

    /**
     * @dev Deploy a new HybridPoWNFT collection (payable - collects platform fee)
     */
    function deployCollection(
        string memory name,
        string memory symbol,
        uint256 initialTarget,
        address vrfCoordinator,
        uint64 subscriptionId,
        bytes32 keyHash
    ) external payable returns (address) {
        require(msg.value >= DEPLOYMENT_FEE, "Insufficient deployment fee");

        HybridPoWNFT newCollection = new HybridPoWNFT(
            initialTarget,
            vrfCoordinator,
            subscriptionId,
            keyHash
        );

        newCollection.transferOwnership(msg.sender);

        deployedCollections.push(address(newCollection));

        emit CollectionDeployed(
            address(newCollection),
            msg.sender,
            name,
            symbol,
            initialTarget
        );

        // Send fee to factory owner
        payable(owner).transfer(msg.value);

        return address(newCollection);
    }

    function getDeployedCollections() external view returns (address[] memory) {
        return deployedCollections;
    }

    function getCollectionCount() external view returns (uint256) {
        return deployedCollections.length;
    }
}
