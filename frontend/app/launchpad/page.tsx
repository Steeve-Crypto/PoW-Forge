"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWatchContractEvent } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useQuery } from "@apollo/client";
import { LaunchpadFactoryABI } from "@/lib/abis";
import { CONTRACT_ADDRESSES } from "@/lib/config";
import { GET_MY_COLLECTIONS } from "@/lib/subgraph";

export default function LaunchpadPage() {
  const { address, isConnected } = useAccount();
  const [formData, setFormData] = useState({
    name: "",
    symbol: "",
    initialTarget: "0x00000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    vrfCoordinator: "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625",
    subscriptionId: "1",
    keyHash: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
  });
  const [deploying, setDeploying] = useState(false);
  const [deployedAddress, setDeployedAddress] = useState("");
  const [myCollections, setMyCollections] = useState<any[]>([]);

  const { writeContract } = useWriteContract();

  // Historical "My Deployed Collections" from The Graph subgraph
  const { data: subgraphData, loading: subgraphLoading } = useQuery(GET_MY_COLLECTIONS, {
    variables: { deployer: address?.toLowerCase() },
    skip: !address,
  });

  // Watch for new CollectionDeployed events from the factory (real-time updates)
  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.sepolia.LaunchpadFactory as `0x${string}`,
    abi: LaunchpadFactoryABI,
    eventName: "CollectionDeployed",
    onLogs(logs) {
      logs.forEach((log: any) => {
        if (log.args.deployer?.toLowerCase() === address?.toLowerCase()) {
          setMyCollections((prev) => {
            // Avoid duplicates
            if (prev.some((c) => c.collection === log.args.collection)) return prev;
            return [
              ...prev,
              {
                collection: log.args.collection,
                name: log.args.name,
                symbol: log.args.symbol,
                initialTarget: log.args.initialTarget?.toString(),
                deployer: log.args.deployer,
                timestamp: Date.now(),
              },
            ];
          });
        }
      });
    },
  });

  const handleDeploy = async () => {
    if (!isConnected) return alert("Connect wallet");

    setDeploying(true);
    try {
      const hash = await writeContract({
        address: CONTRACT_ADDRESSES.sepolia.LaunchpadFactory as `0x${string}`,
        abi: LaunchpadFactoryABI, // Define this ABI
        functionName: "deployCollection",
        args: [
          formData.name,
          formData.symbol,
          BigInt(formData.initialTarget),
          formData.vrfCoordinator,
          BigInt(formData.subscriptionId),
          formData.keyHash,
        ],
        value: BigInt("50000000000000000"), // 0.05 ETH deployment fee
      });

      // In production, wait for receipt and parse the event for new collection address
      setDeployedAddress("Deployment successful! Check transaction for new collection address.");
      alert("New Hybrid PoW collection deployment initiated! Pay the 0.05 ETH platform fee.");
    } catch (error) {
      console.error(error);
      alert("Deployment failed. Make sure you have enough ETH and correct VRF params.");
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-semibold tracking-tighter">PoWForge Launchpad</h1>
          <ConnectButton />
        </div>

        <div className="card mb-8">
          <h2 className="text-2xl font-semibold mb-4">Deploy Your Own Hybrid PoW + VRF Collection</h2>
          <p className="text-white/60 mb-6">
            Launch a new branded NFT collection secured by Proof of Work + Verifiable Randomness. 
            Platform fee: 0.05 ETH (goes to PoWForge treasury).
          </p>

          <div className="space-y-4">
            {/* Collection Type Toggle */}
            <div>
              <label className="block text-sm font-medium mb-2">Collection Type</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCollectionType('ERC721')}
                  className={`btn flex-1 ${collectionType === 'ERC721' ? 'btn-primary' : 'border border-white/20'}`}
                >
                  ERC721 (Unique NFTs)
                </button>
                <button
                  type="button"
                  onClick={() => setCollectionType('ERC1155')}
                  className={`btn flex-1 ${collectionType === 'ERC1155' ? 'btn-primary' : 'border border-white/20'}`}
                >
                  ERC1155 (Editions)
                </button>
              </div>
              <p className="text-xs text-white/50 mt-1">
                {collectionType === 'ERC721' 
                  ? 'Unique 1-of-1 NFTs with individual rarity.' 
                  : 'Semi-fungible editions — great for limited drops and multiple copies.'}
              </p>
            </div>

            <input
              type="text"
              placeholder="Collection Name (e.g. Cosmic PoW)"
              className="input w-full"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <input
              type="text"
              placeholder="Symbol (e.g. CPOW)"
              className="input w-full"
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
            />
            <input
              type="text"
              placeholder="Initial Difficulty Target (hex)"
              className="input w-full font-mono text-sm"
              value={formData.initialTarget}
              onChange={(e) => setFormData({ ...formData, initialTarget: e.target.value })}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="VRF Coordinator"
                className="input w-full font-mono text-xs"
                value={formData.vrfCoordinator}
                onChange={(e) => setFormData({ ...formData, vrfCoordinator: e.target.value })}
              />
              <input
                type="text"
                placeholder="Subscription ID"
                className="input w-full"
                value={formData.subscriptionId}
                onChange={(e) => setFormData({ ...formData, subscriptionId: e.target.value })}
              />
            </div>

            <button
              onClick={handleDeploy}
              disabled={deploying || !formData.name || !formData.symbol}
              className="btn btn-primary w-full py-4 text-lg disabled:opacity-50"
            >
              {deploying ? "Deploying New Collection..." : "Deploy Collection (Pay 0.05 ETH)"}
            </button>
          </div>

          {deployedAddress && (
            <div className="mt-6 p-4 bg-green-900/20 border border-green-500/30 rounded-xl text-green-400">
              {deployedAddress}
            </div>
          )}
        </div>

        {/* My Deployed Collections - populated via factory events */}
        <div className="card">
          <h2 className="text-2xl font-semibold mb-4">My Deployed Collections</h2>
          <p className="text-white/60 mb-4 text-sm">
            Collections you have launched via this factory (real-time from on-chain events).
          </p>

          {subgraphLoading ? (
            <div className="text-center py-8 text-white/50">Loading your collections from The Graph...</div>
          ) : (subgraphData?.collections?.length || 0) === 0 && myCollections.length === 0 ? (
            <div className="text-center py-8 text-white/50">
              No collections deployed yet. Deploy your first one above!
            </div>
          ) : (
            <div className="space-y-4">
              {/* Historical collections from subgraph + real-time from events */}
              {(subgraphData?.collections || []).map((col: any, index: number) => (
                <div key={`subgraph-${index}`} className="bg-black/40 border border-white/10 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold text-lg">{col.name} ({col.symbol})</div>
                    <div className="font-mono text-xs text-white/60 mt-1 break-all">
                      {col.address}
                    </div>
                    <div className="text-xs text-white/50 mt-1">
                      Deployed: {new Date(Number(col.deployedAt) * 1000).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <a 
                      href={`https://sepolia.etherscan.io/address/${col.address}`} 
                      target="_blank" 
                      className="btn border border-white/20 text-sm"
                    >
                      View on Etherscan
                    </a>
                    <a 
                      href={`/admin?collection=${col.address}`} 
                      className="btn btn-primary text-sm"
                    >
                      Manage
                    </a>
                  </div>
                </div>
              ))}

              {/* New collections from real-time events (not yet in subgraph) */}
              {myCollections.map((col, index) => (
                <div key={`event-${index}`} className="bg-black/40 border border-white/10 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 opacity-80">
                  <div>
                    <div className="font-semibold text-lg">{col.name} ({col.symbol})</div>
                    <div className="font-mono text-xs text-white/60 mt-1 break-all">
                      {col.collection}
                    </div>
                    <div className="text-xs text-primary mt-1">Just deployed (indexing...)</div>
                  </div>
                  <div className="flex gap-3">
                    <a 
                      href={`https://sepolia.etherscan.io/address/${col.collection}`} 
                      target="_blank" 
                      className="btn border border-white/20 text-sm"
                    >
                      View on Etherscan
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-sm text-white/50 mt-6">
          After deployment, the new collection will appear in your Admin Dashboard and can be managed independently.
          All collections use the same secure Hybrid PoW + VRF mechanics.
        </div>
      </div>
    </div>
  );
}
