// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {PoWForgeVault} from "../smart-contracts/PoWForgeVault.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DeployPoWForgeVault is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying PoWForgeVault from:", deployer);

        // Example: Use WETH on Sepolia or a test ERC20
        // For demo, use a mock or real WETH address
        address asset = 0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9; // Example WETH Sepolia (update as needed)

        vm.startBroadcast(deployerPrivateKey);

        PoWForgeVault vault = new PoWForgeVault(IERC20(asset));
        
        console.log("✅ PoWForgeVault deployed at:", address(vault));
        console.log("   Underlying Asset:", asset);
        console.log("   Share Token: PFVS");

        vm.stopBroadcast();
    }
}
```

Update abis for frontend.