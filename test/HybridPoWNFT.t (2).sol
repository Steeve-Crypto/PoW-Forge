// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../smart-contracts/HybridPoWNFT.sol";

contract HybridPoWNFTTest is Test {
    HybridPoWNFT public nft;
    address public owner = address(1);
    address public user = address(2);

    // Mock VRF Coordinator for testing
    address constant MOCK_VRF_COORDINATOR = address(0x1234);
    uint64 constant SUBSCRIPTION_ID = 1;
    bytes32 constant KEY_HASH = bytes32(0);

    function setUp() public {
        vm.prank(owner);
        nft = new HybridPoWNFT(
            0x00000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffff, // easy target for testing
            MOCK_VRF_COORDINATOR,
            SUBSCRIPTION_ID,
            KEY_HASH
        );
    }

    function test_Deployment() public {
        assertEq(nft.owner(), owner);
        assertEq(nft.totalMinted(), 0);
        assertEq(nft.difficultyTarget(), 0x00000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffff);
    }

    function test_SetDifficulty() public {
        vm.prank(owner);
        nft.setDifficultyTarget(0x0000000000ffffffffffffffffffffffffffffffffffffffffffffffffff);
        assertEq(nft.difficultyTarget(), 0x0000000000ffffffffffffffffffffffffffffffffffffffffffffffffff);
    }

    function test_MintFee() public {
        assertEq(nft.mintFee(), 0.001 ether);
    }

    function test_RequestHybridMint_RevertsWithoutFee() public {
        vm.prank(user);
        vm.expectRevert("Insufficient mint fee");
        nft.requestHybridMint(12345);
    }

    function test_RoyaltyDefault() public {
        (address receiver, uint256 royaltyAmount) = nft.royaltyInfo(0, 1 ether);
        assertEq(receiver, owner);
        assertEq(royaltyAmount, 0.05 ether); // 5%
    }

    function test_SetDefaultRoyalty() public {
        vm.prank(owner);
        nft.setDefaultRoyalty(address(3), 1000); // 10%
        (address receiver, ) = nft.royaltyInfo(0, 1 ether);
        assertEq(receiver, address(3));
    }

    // Note: Full VRF + PoW testing requires more advanced mocking of VRFCoordinator
    // and actual PoW solution generation. This is a starting point.
    function test_OnlyOwnerFunctions() public {
        vm.prank(user);
        vm.expectRevert("Not owner");
        nft.setDifficultyTarget(1);
    }
}
