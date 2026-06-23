"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function MyNFTsPage() {
  const { address, isConnected } = useAccount();
  const [ownedNFTs, setOwnedNFTs] = useState<any[]>([]); // Populated via events in real impl

  return (
    <div className="min-h-screen bg-dark p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-semibold tracking-tighter">My Hybrid PoW NFTs</h1>
            <p className="text-white/60">Owned NFTs with on-chain traits and royalties</p>
          </div>
          <ConnectButton />
        </div>

        {!isConnected ? (
          <div className="card text-center py-16">
            <ConnectButton />
            <p className="mt-4 text-white/50">Connect your wallet to view your collection</p>
          </div>
        ) : (
          <div>
            {ownedNFTs.length === 0 ? (
              <div className="card text-center py-12">
                <p>No NFTs found yet. Mint your first Hybrid PoW + VRF NFT from the main page!</p>
                <a href="/" className="btn btn-primary mt-6 inline-block">Go to Mint</a>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {ownedNFTs.map((nft, i) => (
                  <div key={i} className="nft-card">
                    <div className="p-6">
                      <div className="font-semibold">Token #{nft.tokenId}</div>
                      <div>Rarity Score: {nft.rarityScore}</div>
                      {/* Display traits, image from tokenURI, royalty info */}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-8 text-xs text-white/50">
          Production tip: Use `useWatchContractEvent` for `HybridMintFulfilled` filtered by your address, or query `balanceOf` + `tokenOfOwnerByIndex` if using ERC721Enumerable.
        </div>
      </div>
    </div>
  );
}
