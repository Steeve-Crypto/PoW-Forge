// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {HybridPoW1155} from "../smart-contracts/HybridPoW1155.sol";

contract DeployHybridPoW1155 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        uint256 initialTarget = 0x00000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
        address vrfCoordinator = 0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625;
        uint64 subscriptionId = 1;
        bytes32 keyHash = 0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c;

        HybridPoW1155 nft = new HybridPoW1155(initialTarget, vrfCoordinator, subscriptionId, keyHash);

        console.log("HybridPoW1155 deployed at:", address(nft));

        vm.stopBroadcast();
    }
}
```

For the frontend, to keep it simple, I'll add a note in the launchpad page that ERC1155 version is available and can be deployed similarly.

To "wire what hasn't to the backend", ensure the deployment log is called.

In the launchpad page's `handleDeploy`, after successful write, call the log API.

Since the current code has a placeholder, I can refine it.

To refine, I'll update the handleDeploy to include the log call.