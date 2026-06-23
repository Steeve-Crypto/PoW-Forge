"use client";

import { useState } from "react";
import { useAccount } from "wagmi";

interface NFT {
  tokenId: string;
  rarityScore: number;
  owner?: string;
  image?: string;
}

export default function NFTGallery({ nfts, title = "NFT Gallery" }: { nfts: NFT[]; title?: string }) {
  const { address } = useAccount();
  const [filter, setFilter] = useState<"all" | "mine">("all");

  const filteredNfts = filter === "mine" && address 
    ? nfts.filter(n => n.owner?.toLowerCase() === address.toLowerCase())
    : nfts;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-semibold text-2xl">{title}</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setFilter("all")} 
            className={`px-4 py-1 rounded-full text-sm ${filter === "all" ? "bg-primary text-black" : "border border-white/20"}`}
          >
            All
          </button>
          <button 
            onClick={() => setFilter("mine")} 
            className={`px-4 py-1 rounded-full text-sm ${filter === "mine" ? "bg-primary text-black" : "border border-white/20"}`}
          >
            My NFTs
          </button>
        </div>
      </div>

      {filteredNfts.length === 0 ? (
        <div className="text-center py-12 text-white/50">No NFTs yet. Mint some!</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredNfts.map((nft, index) => (
            <div key={index} className="nft-card group">
              <div className="aspect-square bg-black/60 flex items-center justify-center relative overflow-hidden">
                {/* Placeholder for real image / on-chain SVG */}
                <div className="text-center">
                  <div className="text-6xl mb-2">🪙</div>
                  <div className="font-mono text-sm text-primary">HPOW #{nft.tokenId}</div>
                </div>
                <div className="absolute top-3 right-3 bg-black/70 px-2 py-0.5 rounded text-xs font-mono">
                  Rarity: {nft.rarityScore}
                </div>
              </div>
              <div className="p-4">
                <div className="font-semibold">Hybrid PoW NFT #{nft.tokenId}</div>
                <div className="text-sm text-white/60 mt-1">Rarity Score: {nft.rarityScore}</div>
                {nft.owner && (
                  <div className="text-xs text-white/40 mt-2 font-mono truncate">
                    Owner: {nft.owner.slice(0,6)}...{nft.owner.slice(-4)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
