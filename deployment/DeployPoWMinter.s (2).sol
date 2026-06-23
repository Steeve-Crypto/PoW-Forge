// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {PoWMinter} from "../src/PoWMinter.sol";
import {ERC721PoWRarity} from "../src/ERC721PoWRarity.sol";

contract DeployPoWMinter is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying from:", deployer);
        
        vm.startBroadcast(deployerPrivateKey);

        // ============================================================
        // CONFIGURE FOR YOUR USE CASE
        // ============================================================
        // Testnet (easy): ~2^24 difficulty - nonces found in <1s on modern CPU
        uint256 initialTarget = 0x00000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
        
        // Mainnet (harder example): ~2^32 or tune based on your miner tests
        // uint256 initialTarget = 0x0000000000ffffffffffffffffffffffffffffffffffffffffffffffffff;

        PoWMinter minter = new PoWMinter(initialTarget);
        
        console.log("✅ PoWMinter deployed at:", address(minter));
        console.log("   Initial difficultyTarget:", initialTarget);
        console.log("   Owner:", minter.owner());
        
        // Optional: Immediately transfer ownership to a multisig or DAO
        // minter.transferOwnership(0xYourMultiSigHere);

        vm.stopBroadcast();
        
        // Post-deploy: Verify on Etherscan + announce on X/Discord for your community
    }
}

/**
 * @dev Separate deployer for the ERC721 PoW Rarity NFT (recommended for new drops)
 */
contract DeployERC721PoWRarity is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying ERC721PoWRarity from:", deployer);
        
        vm.startBroadcast(deployerPrivateKey);

        // ============================================================
        // RARITY NFT CONFIG - TUNE THESE
        // ============================================================
        uint256 initialTarget = 0x00000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffff; // Easy for testnet

        string memory baseTokenURI = "https://your-metadata-api.com/powrarity/"; 
        // Recommended production: ipfs://QmYourCID/  or decentralized storage with tier folders (0/,1/,2/,3/)

        address royaltyReceiver = deployer; // or multisig/treasury
        uint96 royaltyFee = 500; // 5% = 500 (basis points * 100)

        ERC721PoWRarity nft = new ERC721PoWRarity(
            initialTarget,
            baseTokenURI,
            royaltyReceiver,
            royaltyFee
        );
        
        console.log("✅ ERC721PoWRarity deployed at:", address(nft));
        console.log("   Initial difficultyTarget:", initialTarget);
        console.log("   Royalty receiver:", royaltyReceiver);
        console.log("   Royalty fee (basis points):", royaltyFee);
        console.log("   Max supply:", nft.maxSupply());

        vm.stopBroadcast();
    }
}
