// Advanced Image Generation Service for Hybrid PoW + VRF NFTs
// Generates high-quality SVG and PNG from on-chain traits
// Integrates with IPFS pinning

export interface NFTTraits {
  background: number;
  body: number;
  accessory: number;
  eyes: number;
  rarityScore: number;
}

export function generateAdvancedSVG(traits: NFTTraits, tokenId: number): string {
  const bgHue = (traits.background * 72) % 360;
  const bodyHue = (traits.body * 36) % 360;
  const accHue = (traits.accessory * 60) % 360;
  const eyesHue = (traits.eyes * 50) % 360;

  // More advanced layered SVG with rarity effects
  const rarityGlow = traits.rarityScore > 80 ? 
    `<filter id="glow"><feGaussianBlur stdDeviation="3" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` : '';

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
      <defs>
        ${rarityGlow}
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:hsl(${bgHue},70%,40%);stop-opacity:1" />
          <stop offset="100%" style="stop-color:hsl(${bgHue},70%,60%);stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <!-- Background -->
      <rect width="600" height="600" fill="url(#bgGrad)"/>
      
      <!-- Body / Main Shape -->
      <circle cx="300" cy="300" r="180" fill="hsl(${bodyHue},80%,55%)" 
              ${traits.rarityScore > 70 ? 'filter="url(#glow)"' : ''}/>
      
      <!-- Accessory Layer -->
      <rect x="200" y="220" width="200" height="160" rx="30" 
            fill="hsl(${accHue},85%,50%)" opacity="0.9"/>
      
      <!-- Eyes -->
      <circle cx="240" cy="280" r="35" fill="hsl(${eyesHue},95%,65%)"/>
      <circle cx="360" cy="280" r="35" fill="hsl(${eyesHue},95%,65%)"/>
      <circle cx="250" cy="275" r="12" fill="#111"/>
      <circle cx="370" cy="275" r="12" fill="#111"/>
      
      <!-- Rarity Indicator -->
      <text x="300" y="480" font-family="monospace" font-size="32" fill="white" text-anchor="middle" font-weight="bold">
        RARITY: ${traits.rarityScore}
      </text>
      <text x="300" y="520" font-family="monospace" font-size="18" fill="#ccc" text-anchor="middle">
        HYBRID PoW + VRF • TOKEN #${tokenId}
      </text>
    </svg>
  `.trim();
}

export function generatePNGFromSVG(svgString: string, width: number = 600, height: number = 600): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to generate PNG'));
        }
      }, 'image/png');
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG for PNG generation'));
    };

    img.src = url;
  });
}

// Full pipeline: Generate SVG → PNG → Pin both to IPFS
export async function generateAndPinAdvancedImage(
  traits: NFTTraits, 
  tokenId: number,
  pinFunction: (file: Blob, name: string) => Promise<string>
) {
  const svg = generateAdvancedSVG(traits, tokenId);
  const pngBlob = await generatePNGFromSVG(svg);

  const svgCID = await pinFunction(new Blob([svg], { type: 'image/svg+xml' }), `nft-${tokenId}.svg`);
  const pngCID = await pinFunction(pngBlob, `nft-${tokenId}.png`);

  return {
    svgCID,
    pngCID,
    metadata: {
      name: `Hybrid PoW NFT #${tokenId}`,
      description: "Hybrid Proof of Work + VRF NFT with advanced generative art.",
      image: pngCID, // Prefer PNG for marketplaces
      animation_url: svgCID, // SVG as animation/fallback
      attributes: [
        { trait_type: "Background", value: traits.background },
        { trait_type: "Body", value: traits.body },
        { trait_type: "Accessory", value: traits.accessory },
        { trait_type: "Eyes", value: traits.eyes },
        { trait_type: "Rarity Score", value: traits.rarityScore },
      ]
    }
  };
}
