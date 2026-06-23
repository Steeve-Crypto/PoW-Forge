// IPFS Pinning Service Integration (Pinata example)
// Set NEXT_PUBLIC_PINATA_JWT in .env.local for production use

export async function pinToIPFS(file: File | Blob, name: string): Promise<string> {
  const jwt = process.env.NEXT_PUBLIC_PINATA_JWT;
  
  if (!jwt) {
    console.warn("No Pinata JWT found. Using mock CID for demo.");
    // In production, throw error or use alternative
    return `ipfs://QmDemo${Date.now()}${name.replace(/\s+/g, '')}`;
  }

  const formData = new FormData();
  formData.append('file', file, name);

  const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
    body: formData,
  });

  if (!res.ok) {
    throw new Error('Failed to pin to IPFS');
  }

  const data = await res.json();
  return `ipfs://${data.IpfsHash}`;
}

export async function pinJSONToIPFS(json: object, name: string): Promise<string> {
  const blob = new Blob([JSON.stringify(json)], { type: 'application/json' });
  return pinToIPFS(blob, `${name}.json`);
}

// Helper to generate and pin improved metadata + image
export async function generateAndPinMetadata(traits: any, tokenId: number) {
  // Generate better SVG or use canvas for image
  const svg = generateSVGFromTraits(traits);
  const imageFile = new Blob([svg], { type: 'image/svg+xml' });
  
  const imageCID = await pinToIPFS(imageFile, `hybrid-pow-nft-${tokenId}.svg`);
  
  const metadata = {
    name: `Hybrid PoW NFT #${tokenId}`,
    description: "Hybrid Proof of Work + VRF NFT. Real computational effort + verifiable randomness.",
    image: imageCID,
    attributes: [
      { trait_type: "Background", value: traits.background },
      { trait_type: "Body", value: traits.body },
      { trait_type: "Accessory", value: traits.accessory },
      { trait_type: "Eyes", value: traits.eyes },
      { trait_type: "Rarity Score", value: traits.rarityScore },
      { trait_type: "Hybrid", value: "PoW + VRF" }
    ]
  };

  return await pinJSONToIPFS(metadata, `hybrid-pow-nft-${tokenId}`);
}

function generateSVGFromTraits(traits: any): string {
  // Enhanced SVG generator (can be improved with more complex art)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
    <rect width="400" height="400" fill="hsl(${traits.background * 72}, 70%, 50%)"/>
    <circle cx="200" cy="200" r="120" fill="hsl(${traits.body * 36}, 80%, 60%)"/>
    <rect x="140" y="140" width="120" height="120" fill="hsl(${traits.accessory * 60}, 90%, 55%)" rx="20"/>
    <circle cx="200" cy="180" r="30" fill="hsl(${traits.eyes * 50}, 100%, 70%)"/>
    <text x="200" y="340" font-size="28" fill="white" text-anchor="middle" font-family="sans-serif">Rarity: ${traits.rarityScore}</text>
  </svg>`;
}
