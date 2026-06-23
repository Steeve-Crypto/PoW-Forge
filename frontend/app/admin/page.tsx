"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useReadContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { HybridPoWNFTABI, PoWForgeVaultABI } from "@/lib/abis";
import { CONTRACT_ADDRESSES } from "@/lib/config";

export default function AdminDashboard() {
  const { address, isConnected } = useAccount();
  const [newDifficulty, setNewDifficulty] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [analytics, setAnalytics] = useState({
    totalMints: 0,
    totalFees: "0",
    avgRarity: 0,
    topRarity: 0,
  });

  const { writeContract } = useWriteContract();

  // Example read for analytics (in production use subgraph queries)
  const { data: totalMinted } = useReadContract({
    address: CONTRACT_ADDRESSES.sepolia.PoWNFT as `0x${string}`,
    abi: HybridPoWNFTABI,
    functionName: "totalMinted",
  });

  const handleSetDifficulty = async () => {
    if (!newDifficulty) return;
    try {
      await writeContract({
        address: CONTRACT_ADDRESSES.sepolia.PoWNFT as `0x${string}`,
        abi: HybridPoWNFTABI,
        functionName: "setDifficultyTarget",
        args: [BigInt(newDifficulty)],
      });
      alert("Difficulty updated!");
    } catch (e) {
      alert("Failed to update difficulty");
    }
  };

  const handleWithdraw = async () => {
    try {
      await writeContract({
        address: CONTRACT_ADDRESSES.sepolia.PoWNFT as `0x${string}`,
        abi: HybridPoWNFTABI,
        functionName: "withdraw",
      });
      alert("Treasury withdrawn!");
    } catch (e) {
      alert("Withdraw failed");
    }
  };

  const handleHarvest = async () => {
    try {
      await writeContract({
        address: CONTRACT_ADDRESSES.sepolia.PoWForgeVault as `0x${string}`,
        abi: PoWForgeVaultABI,
        functionName: "harvest",
      });
      alert("Harvest successful! Yield has been realized.");
    } catch (e) {
      alert("Harvest failed. Make sure you are the owner and there is yield to harvest.");
    }
  };

  const handleVaultDeposit = async () => {
    if (!depositAmount) return;
    try {
      await writeContract({
        address: CONTRACT_ADDRESSES.sepolia.PoWForgeVault as `0x${string}`,
        abi: PoWForgeVaultABI,
        functionName: "deposit",
        args: [BigInt(depositAmount), address],
      });
      alert("Deposit successful!");
      setDepositAmount("");
    } catch (e) {
      alert("Deposit failed. Check your balance and allowance.");
    }
  };

  const handleVaultWithdraw = async () => {
    if (!withdrawAmount) return;
    try {
      await writeContract({
        address: CONTRACT_ADDRESSES.sepolia.PoWForgeVault as `0x${string}`,
        abi: PoWForgeVaultABI,
        functionName: "withdraw",
        args: [BigInt(withdrawAmount), address, address],
      });
      alert("Withdraw successful!");
      setWithdrawAmount("");
    } catch (e) {
      alert("Withdraw failed. Check your share balance.");
    }
  };

  // Placeholder for subgraph-powered analytics
  const refreshAnalytics = () => {
    // In production: Use Apollo Client or fetch from your hosted subgraph
    // Example query: totalMints, sum of fees, avg rarityScore, etc.
    setAnalytics({
      totalMints: Number(totalMinted) || 42,
      totalFees: "12.5",
      avgRarity: 67,
      topRarity: 98,
    });
  };

  return (
    <div className="min-h-screen bg-dark p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between mb-8">
          <h1 className="text-4xl font-semibold tracking-tighter">Admin Dashboard</h1>
          <ConnectButton />
        </div>

        {!isConnected ? (
          <div className="card text-center py-12">Connect as contract owner to access admin tools.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Difficulty Tuning */}
            <div className="card">
              <h2 className="font-semibold text-xl mb-4">Difficulty Tuning</h2>
              <p className="text-sm text-white/60 mb-4">Adjust PoW target. Lower value = harder (more leading zeros required).</p>
              <input
                type="text"
                placeholder="New target (e.g. 0x00000000ff...)"
                className="input w-full mb-4 font-mono"
                value={newDifficulty}
                onChange={(e) => setNewDifficulty(e.target.value)}
              />
              <button onClick={handleSetDifficulty} className="btn btn-primary w-full">
                Update Difficulty Target
              </button>
            </div>

            {/* Treasury Withdraw */}
            <div className="card">
              <h2 className="font-semibold text-xl mb-4">Treasury Management</h2>
              <p className="text-sm text-white/60 mb-4">Withdraw accumulated mint fees to owner address.</p>
              <button onClick={handleWithdraw} className="btn btn-primary w-full">
                Withdraw All ETH to Owner
              </button>
              <div className="text-xs text-white/50 mt-3">Contract balance is sent to owner().</div>
            </div>

            {/* Vault Harvest Strategy */}
            <div className="card lg:col-span-2">
              <h2 className="font-semibold text-xl mb-4">Treasury Vault Strategy (ERC4626)</h2>
              <p className="text-sm text-white/60 mb-4">
                Call Harvest to realize yield from platform fees and any active strategies. 
                This increases value for all vault shareholders.
              </p>
              <button onClick={handleHarvest} className="btn btn-primary w-full">
                Harvest Yield
              </button>
              <div className="text-xs text-white/50 mt-3">
                Only the vault owner can call this. Extend with real DeFi strategies (Aave, Compound, etc.).
              </div>
            </div>

            {/* Vault Deposit & Withdraw */}
            <div className="card lg:col-span-2">
              <h2 className="font-semibold text-xl mb-4">Vault Deposit & Withdraw (ERC4626)</h2>
              <p className="text-sm text-white/60 mb-4">
                Deposit assets to receive vault shares (PFVS). Withdraw assets by burning shares. 
                Share price increases as the vault accrues value.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Deposit */}
                <div>
                  <label className="block text-sm font-medium mb-2">Deposit Amount (in underlying asset)</label>
                  <input
                    type="text"
                    placeholder="e.g. 1000000000000000000 (1 token with 18 decimals)"
                    className="input w-full mb-3 font-mono"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                  />
                  <button onClick={handleVaultDeposit} className="btn btn-primary w-full">
                    Deposit into Vault
                  </button>
                </div>

                {/* Withdraw */}
                <div>
                  <label className="block text-sm font-medium mb-2">Withdraw Amount (in underlying asset)</label>
                  <input
                    type="text"
                    placeholder="Amount to withdraw"
                    className="input w-full mb-3 font-mono"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                  />
                  <button onClick={handleVaultWithdraw} className="btn btn-primary w-full">
                    Withdraw from Vault
                  </button>
                </div>
              </div>

              <div className="mt-4 text-xs text-white/50">
                Note: You may need to approve the vault to spend your underlying asset first (for ERC20 assets).
              </div>
            </div>

            {/* Analytics (Subgraph Powered) */}
            <div className="card lg:col-span-2">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold text-xl">Analytics (The Graph Powered)</h2>
                <button onClick={refreshAnalytics} className="btn border border-white/20 text-sm">Refresh from Subgraph</button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-black/40 p-4 rounded-xl">
                  <div className="text-white/50 text-sm">Total Mints</div>
                  <div className="text-3xl font-mono mt-1">{analytics.totalMints}</div>
                </div>
                <div className="bg-black/40 p-4 rounded-xl">
                  <div className="text-white/50 text-sm">Total Fees Collected</div>
                  <div className="text-3xl font-mono mt-1">{analytics.totalFees} ETH</div>
                </div>
                <div className="bg-black/40 p-4 rounded-xl">
                  <div className="text-white/50 text-sm">Average Rarity</div>
                  <div className="text-3xl font-mono mt-1">{analytics.avgRarity}</div>
                </div>
                <div className="bg-black/40 p-4 rounded-xl">
                  <div className="text-white/50 text-sm">Highest Rarity</div>
                  <div className="text-3xl font-mono mt-1 text-primary">{analytics.topRarity}</div>
                </div>
              </div>

              <div className="mt-6 text-xs text-white/50">
                Production: Query your hosted subgraph with Apollo Client or `urql` for real-time stats on mints, rarity distribution, revenue, etc.
              </div>
            </div>

            {/* Per-Token Royalty (from previous) */}
            <div className="card lg:col-span-2">
              <h2 className="font-semibold text-xl mb-4">Per-Token Royalty Fine-Tuning</h2>
              <p className="text-sm text-white/60 mb-4">Override royalty for specific high-value tokens.</p>
              {/* Form for setTokenRoyalty would go here - inputs for tokenId, receiver, feeNumerator */}
              <div className="text-sm">Use the owner functions <code>setTokenRoyalty(tokenId, receiver, feeNumerator)</code> directly or extend this UI.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
