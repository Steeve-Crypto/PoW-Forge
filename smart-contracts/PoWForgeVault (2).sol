// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title PoWForgeVault
 * @dev ERC4626 Tokenized Vault for PoWForge platform treasury and user deposits.
 *      Users deposit the underlying asset (e.g. WETH or project token) and receive shares.
 *      The vault can be used to manage platform fees, royalties, and launchpad revenue.
 *      Fully compliant with ERC4626 standard.
 *
 * Revenue angle: Platform can route mint fees, deployment fees, and royalties into the vault.
 * Users can deposit to participate in platform yield strategies (extendable with strategies).
 */
contract PoWForgeVault is ERC4626, Ownable {
    constructor(IERC20 asset_)
        ERC4626(asset_)
        ERC20("PoWForge Vault Share", "PFVS")
        Ownable(msg.sender)
    {}

    /**
     * @dev Override to add any custom logic on deposit (e.g. PoW check in future versions).
     */
    function deposit(uint256 assets, address receiver) public virtual override returns (uint256) {
        // Future: Could require PoW solution here for "work-gated" deposits
        return super.deposit(assets, receiver);
    }

    /**
     * @dev Override to add custom logic on mint.
     */
    function mint(uint256 shares, address receiver) public virtual override returns (uint256) {
        return super.mint(shares, receiver);
    }

    /**
     * @dev Admin can withdraw assets in emergency or for strategy rebalancing.
     */
    function emergencyWithdraw(uint256 assets, address to) external onlyOwner {
        require(assets <= totalAssets(), "Insufficient assets");
        SafeERC20.safeTransfer(IERC20(asset()), to, assets);
    }

    /**
     * @dev View function to see current vault stats (useful for frontend).
     */
    function vaultStats() external view returns (
        uint256 totalAssets_,
        uint256 totalSupply_,
        uint256 sharePrice
    ) {
        totalAssets_ = totalAssets();
        totalSupply_ = totalSupply();
        sharePrice = totalSupply_ > 0 ? (totalAssets_ * 1e18) / totalSupply_ : 1e18;
    }

    event Harvested(
        uint256 totalAssetsAtHarvest,
        uint256 totalSupplyAtHarvest,
        uint256 sharePrice
    );

    event Deposit(
        address indexed caller,
        address indexed owner,
        uint256 assets,
        uint256 shares,
        uint256 newTotalAssets,
        uint256 newTotalSupply
    );

    event Withdraw(
        address indexed caller,
        address indexed receiver,
        address indexed owner,
        uint256 assets,
        uint256 shares,
        uint256 newTotalAssets,
        uint256 newTotalSupply
    );

    function harvest() external onlyOwner {
        uint256 currentTotalAssets = totalAssets();
        uint256 currentTotalSupply = totalSupply();
        uint256 currentSharePrice = currentTotalSupply > 0 
            ? (currentTotalAssets * 1e18) / currentTotalSupply 
            : 1e18;

        emit Harvested(currentTotalAssets, currentTotalSupply, currentSharePrice);
    }

    // Override internal functions to emit granular events for better subgraph indexing
    function _deposit(
        address caller,
        address receiver,
        uint256 assets,
        uint256 shares
    ) internal virtual override {
        super._deposit(caller, receiver, assets, shares);

        emit Deposit(
            caller,
            receiver,
            assets,
            shares,
            totalAssets(),
            totalSupply()
        );
    }

    function _withdraw(
        address caller,
        address receiver,
        address owner,
        uint256 assets,
        uint256 shares
    ) internal virtual override {
        super._withdraw(caller, receiver, owner, assets, shares);

        emit Withdraw(
            caller,
            receiver,
            owner,
            assets,
            shares,
            totalAssets(),
            totalSupply()
        );
    }
}