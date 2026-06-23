// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {HybridPoWNFT} from "../src/HybridPoWNFT.sol";

contract DeployHybridPoWNFT is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying HybridPoWNFT from:", deployer);

        // === CONFIGURE THESE FOR YOUR VRF SUBSCRIPTION ===
        address vrfCoordinator = 0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625; // Sepolia
        uint64 subscriptionId = 1234; // YOUR SUBSCRIPTION ID from vrf.chain.link
        bytes32 keyHash = 0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c; // Sepolia keyHash

        uint256 initialTarget = 0x00000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffff; // Easy for testnet

        vm.startBroadcast(deployerPrivateKey);

        HybridPoWNFT nft = new HybridPoWNFT(
            initialTarget,
            vrfCoordinator,
            subscriptionId,
            keyHash
        );

        console.log("✅ HybridPoWNFT deployed at:", address(nft));
        console.log("   Initial difficultyTarget:", initialTarget);
        console.log("   VRF Coordinator:", vrfCoordinator);
        console.log("   Subscription ID:", subscriptionId);
        console.log("   Max Supply:", 10000);
        console.log("   Owner:", nft.owner());

        vm.stopBroadcast();
    }
}
