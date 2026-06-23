"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useReadContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { PoWForgeVaultABI } from "@/lib/abis";
import { CONTRACT_ADDRESSES } from "@/lib/config";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// Minimal ERC20 ABI for approval
const ERC20ABI = [
  {
    "inputs": [{"internalType": "address", "name": "spender", "type": "address"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}],
    "name": "approve",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "owner", "type": "address"}, {"internalType": "address", "name": "spender", "type": "address"}],
    "name": "allowance",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export default function VaultPage() {
  const { address, isConnected } = useAccount();
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isApproving, setIsApproving] = useState(false);

  const vaultAddress = CONTRACT_ADDRESSES.sepolia.PoWForgeVault as `0x${string}`;

  // Read vault stats
  const { data: vaultStats } = useReadContract({
    address: vaultAddress,
    abi: PoWForgeVaultABI,
    functionName: "vaultStats",
  });

  // Read underlying asset address
  const { data: assetAddress } = useReadContract({
    address: vaultAddress,
    abi: PoWForgeVaultABI,
    functionName: "asset",
  });

  // Read user's share balance
  const { data: userShares } = useReadContract({
    address: vaultAddress,
    abi: PoWForgeVaultABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  // Fetch historical vault data from The Graph for the chart
  const { data: vaultHistoryData } = useQuery(GET_VAULT_HISTORY, {
    variables: { first: 50 },
  });

  // Real-time subscription for live share price updates
  const { data: subscriptionData } = useSubscription(SUBSCRIBE_VAULT_SNAPSHOTS);

  // Transform subgraph data into chart format (historical + live updates)
  const baseChartData = vaultHistoryData?.vaultSnapshots?.map((snapshot: any) => {
    const totalAssetsNum = Number(snapshot.totalAssets);
    const totalSupplyNum = Number(snapshot.totalSupply) || 1;
    const calculatedPrice = totalSupplyNum > 0 ? (totalAssetsNum / totalSupplyNum) / 1e18 : 1;
    
    return {
      time: new Date(Number(snapshot.timestamp) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      price: calculatedPrice,
      block: snapshot.blockNumber,
    };
  }) || [];

  // Merge live subscription data
  const liveUpdate = subscriptionData?.vaultSnapshots?.[0];
  const chartData = liveUpdate 
    ? [...baseChartData, {
        time: new Date(Number(liveUpdate.timestamp) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        price: Number(liveUpdate.totalSupply) > 0 
          ? (Number(liveUpdate.totalAssets) / Number(liveUpdate.totalSupply)) / 1e18 
          : 1,
        block: liveUpdate.blockNumber,
      }]
    : baseChartData;

  // Read allowance for deposit
  const { data: allowance } = useReadContract({
    address: assetAddress as `0x${string}`,
    abi: ERC20ABI,
    functionName: "allowance",
    args: address && assetAddress ? [address, vaultAddress] : undefined,
  });

  const { writeContract } = useWriteContract();

  // Use real data from subgraph + live subscription if available
  const displayChartData = chartData.length > 0 ? chartData : [
    { time: "Now", price: sharePrice }
  ];

  const totalAssets = vaultStats ? Number(vaultStats[0]) : 0;
  const totalSupply = vaultStats ? Number(vaultStats[1]) : 0;
  const sharePrice = vaultStats ? Number(vaultStats[2]) / 1e18 : 1;

  const needsApproval = depositAmount && allowance !== undefined && 
    BigInt(depositAmount) > (allowance as bigint);

  const handleApprove = async () => {
    if (!depositAmount || !assetAddress) return;
    setIsApproving(true);
    try {
      await writeContract({
        address: assetAddress as `0x${string}`,
        abi: ERC20ABI,
        functionName: "approve",
        args: [vaultAddress, BigInt(depositAmount)],
      });
      alert("Approval successful! You can now deposit.");
    } catch (e) {
      alert("Approval failed.");
    } finally {
      setIsApproving(false);
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount) return;
    try {
      await writeContract({
        address: vaultAddress,
        abi: PoWForgeVaultABI,
        functionName: "deposit",
        args: [BigInt(depositAmount), address],
      });
      alert("Deposit successful!");
      setDepositAmount("");
    } catch (e) {
      alert("Deposit failed. Check balance and approval.");
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount) return;
    try {
      await writeContract({
        address: vaultAddress,
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

  return (
    <div className="min-h-screen bg-dark">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm mb-4">
            ERC4626 Tokenized Treasury
          </div>
          <h1 className="text-6xl font-semibold tracking-tighter mb-4">PoWForge Vault</h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            Deposit assets to receive shares in the platform treasury. 
            Earn from mint fees, launchpad revenue, and yield strategies.
          </p>
        </div>

        {!isConnected ? (
          <div className="card max-w-md mx-auto text-center py-12">
            <ConnectButton />
            <p className="mt-4 text-white/50">Connect your wallet to interact with the vault</p>
          </div>
        ) : (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
              <div className="card">
                <div className="text-white/50 text-sm">Total Value Locked</div>
                <div className="text-4xl font-mono mt-2">{(totalAssets / 1e18).toFixed(2)}</div>
                <div className="text-xs text-white/50 mt-1">in underlying assets</div>
              </div>
              <div className="card">
                <div className="text-white/50 text-sm">Share Price</div>
                <div className="text-4xl font-mono mt-2 text-primary">{sharePrice.toFixed(4)}</div>
                <div className="text-xs text-white/50 mt-1">assets per share</div>
              </div>
              <div className="card">
                <div className="text-white/50 text-sm">Your Shares (PFVS)</div>
                <div className="text-4xl font-mono mt-2">{userShares ? (Number(userShares) / 1e18).toFixed(4) : "0.0000"}</div>
              </div>
              <div className="card">
                <div className="text-white/50 text-sm">Your Assets Value</div>
                <div className="text-4xl font-mono mt-2">
                  {userShares && sharePrice ? ((Number(userShares) / 1e18) * sharePrice).toFixed(4) : "0.0000"}
                </div>
              </div>
            </div>

            {/* Share Price Chart */}
            <div className="card mb-12">
              <h3 className="font-semibold text-xl mb-6">Share Price History</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={displayChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="time" stroke="#666" />
                    <YAxis stroke="#666" domain={['auto', 'auto']} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="price" 
                      stroke="#00ff9d" 
                      strokeWidth={3}
                      dot={{ fill: '#00ff9d', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-white/50 mt-4 text-center">
                Share price increases as the vault accrues platform revenue and yield.
              </p>
            </div>

            {/* Deposit & Withdraw */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Deposit */}
              <div className="card">
                <h3 className="font-semibold text-2xl mb-2">Deposit</h3>
                <p className="text-white/60 mb-6">Deposit the underlying asset to receive vault shares.</p>
                
                <input
                  type="text"
                  placeholder="Amount in smallest units (e.g. 1000000000000000000)"
                  className="input w-full mb-4 font-mono"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                />

                {needsApproval ? (
                  <button 
                    onClick={handleApprove} 
                    disabled={isApproving}
                    className="btn btn-primary w-full mb-3"
                  >
                    {isApproving ? "Approving..." : "Approve Vault to Spend"}
                  </button>
                ) : null}

                <button 
                  onClick={handleDeposit} 
                  disabled={!depositAmount || needsApproval}
                  className="btn btn-primary w-full"
                >
                  Deposit & Receive Shares
                </button>
              </div>

              {/* Withdraw */}
              <div className="card">
                <h3 className="font-semibold text-2xl mb-2">Withdraw</h3>
                <p className="text-white/60 mb-6">Burn shares to withdraw underlying assets.</p>
                
                <input
                  type="text"
                  placeholder="Amount of underlying asset to withdraw"
                  className="input w-full mb-4 font-mono"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                />

                <button 
                  onClick={handleWithdraw} 
                  disabled={!withdrawAmount}
                  className="btn btn-primary w-full"
                >
                  Withdraw Assets
                </button>

                <div className="mt-4 text-xs text-white/50">
                  You can withdraw up to your current share value.
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
