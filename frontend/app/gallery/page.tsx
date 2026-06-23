"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function GalleryPage() {
  const { isConnected } = useAccount();
  const [nfts, setNfts] = useState<any[]>([
    // Demo data - in production fetch from events or subgraph
    { tokenId: "0", rarityScore: 85, tier: "Legendary", traits: { background: 2, body: 5, accessory: 1, eyes: 3 } },
    { tokenId: "1", rarityScore: 62, tier: "Epic", traits: { background: 0, body: 8, accessory: 4, eyes: 1 } },
  ]);

  return (
    <div className="min-h-screen bg-dark p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-semibold tracking-tighter">PoWForge NFT Gallery</h1>
          <ConnectButton />
        </div>

        <p className="text-white/60 mb-8">Public gallery of all Hybrid PoW + VRF NFTs. Rarity driven by real computational work + verifiable randomness.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {nfts.map((nft, index) => (
            <div key={index} className="nft-card p-5">
              <div className="aspect-square bg-white/5 rounded-2xl mb-4 flex items-center justify-center text-6xl">
                {/* Simple visual representation */}
                🎨
              </div>
              <div className="font-semibold">Hybrid PoW NFT #{nft.tokenId}</div>
              <div className="text-sm text-primary mt-1">{nft.tier} • Rarity {nft.rarityScore}</div>
              <div className="text-xs text-white/50 mt-3">
                Background: {nft.traits.background} • Body: {nft.traits.body} • Accessory: {nft.traits.accessory} • Eyes: {nft.traits.eyes}
              </div>
              <div className="mt-4 text-xs text-white/40">On-chain SVG + Hybrid PoW + VRF metadata</div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center text-sm text-white/50">
          In production: Fetch real minted NFTs via contract events or The Graph.<br />
          Metadata improvements: Upload full JSON + SVG to IPFS and update tokenURI to return ipfs://CID.
        </div>
      </div>
    </div>
  );
}
