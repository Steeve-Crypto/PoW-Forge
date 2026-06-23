"use client";

import { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

interface TourGuideProps {
  autoStart?: boolean;
}

export default function TourGuide({ autoStart = false }: TourGuideProps) {
  const startTour = () => {
    const driverObj = driver({
      showProgress: true,
      progressText: 'Step {{current}} of {{total}}',
      nextBtnText: 'Next',
      prevBtnText: 'Back',
      doneBtnText: 'Finish Tour',
      steps: [
        {
          element: '#hero-section',
          popover: {
            title: 'Welcome to PoWForge',
            description: 'The premier platform for fair, bot-resistant NFT launches powered by Proof of Work and Verifiable Randomness. Real computational effort meets unbiased on-chain randomness.',
          }
        },
        {
          element: '#mining-section',
          popover: {
            title: 'Mine PoW Solutions In-Browser',
            description: 'Use our high-performance WebAssembly miner to find valid Proof of Work solutions directly in your browser. No CLI required. This ensures only genuine participants can mint or claim.',
          }
        },
        {
          element: '#mint-section',
          popover: {
            title: 'Request Hybrid Mint',
            description: 'Submit your PoW solution to request a mint. Our system combines your work with Chainlink VRF for truly fair and unpredictable outcomes. Pay a small fee to support the platform.',
          }
        },
        {
          element: '#launchpad-section',
          popover: {
            title: 'Launch Your Own Collection (ERC721 or ERC1155)',
            description: 'Deploy a new branded Hybrid PoW + VRF collection as ERC721 (unique) or ERC1155 (editions). Pay a one-time platform fee. All collections inherit the same fair mechanics.',
          }
        },
        {
          element: '#analytics-section',
          popover: {
            title: 'Live On-Chain Insights',
            description: 'Real-time analytics powered by The Graph. Track total mints, rarity distribution, revenue, and more across all collections. Transparent data for informed decisions.',
          }
        },
        {
          element: '#vault-section',
          popover: {
            title: 'Treasury Vault (ERC4626) + Harvest Strategy',
            description: 'Tokenized platform treasury. Deposit to own shares. Owners can call Harvest to realize and distribute yield from platform fees and strategies.',
          }
        },
        {
          element: '#admin-section',
          popover: {
            title: 'Platform Controls',
            description: 'For collection owners and platform admins: Adjust difficulty, withdraw treasury, fine-tune royalties, and monitor performance. Full control over your ecosystem.',
          }
        },
        {
          element: '#my-collections',
          popover: {
            title: 'Your Portfolio & Deployed Collections',
            description: 'View all NFTs you own and collections you have launched. Everything is indexed on-chain for complete transparency and easy management.',
          }
        }
      ]
    });

    driverObj.drive();
  };

  useEffect(() => {
    if (autoStart) {
      // Optional: Auto-start on first visit (can be controlled by localStorage)
      const hasSeenTour = localStorage.getItem('powforge_tour_seen');
      if (!hasSeenTour) {
        setTimeout(() => {
          startTour();
          localStorage.setItem('powforge_tour_seen', 'true');
        }, 1500);
      }
    }
  }, [autoStart]);

  return (
    <button 
      onClick={startTour}
      className="fixed bottom-6 right-6 z-50 btn btn-primary px-6 py-3 shadow-lg flex items-center gap-2"
    >
      🎯 Start Interactive Tour
    </button>
  );
}