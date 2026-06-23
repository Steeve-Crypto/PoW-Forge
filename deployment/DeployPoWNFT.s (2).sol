// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {PoWNFT} from "../src/PoWNFT.sol";

contract DeployPoWNFT is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying PoWNFT from:", deployer);
        
        vm.startBroadcast(deployerPrivateKey);

        // Easy testnet target
        uint256 initialTarget = 0x00000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffff;

        PoWNFT nft = new PoWNFT(initialTarget);
        
        console.log("✅ PoWNFT deployed at:", address(nft));
        console.log("   Initial difficultyTarget:", initialTarget);
        console.log("   Max Supply:", 10000);
        console.log("   Owner:", nft.owner());

        vm.stopBroadcast();
    }
}
