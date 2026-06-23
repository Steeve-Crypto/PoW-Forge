import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import TourGuide from "@/components/TourGuide";
import NavBar from "@/components/NavBar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PoWForge",
  description: "Hybrid PoW + VRF NFT Launchpad with Tokenized Treasury",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-dark text-white`}>
        <Providers>
          <NavBar />
          {children}
          <TourGuide autoStart={true} />
        </Providers>
      </body>
    </html>
  );
}