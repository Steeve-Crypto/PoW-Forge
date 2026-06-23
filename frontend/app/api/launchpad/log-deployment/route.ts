import { NextRequest, NextResponse } from 'next/server';

// Advanced Backend: In-memory database simulation for launchpad deployments
// In production: Replace with Prisma + PostgreSQL, Supabase, or PlanetScale

interface Deployment {
  id: string;
  deployer: string;
  collectionAddress: string;
  name: string;
  symbol: string;
  txHash: string;
  feeCollected: string;
  timestamp: string;
}

// Simple in-memory store (resets on server restart - for demo only)
let deploymentsDB: Deployment[] = [];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deployer, collectionAddress, name, symbol, txHash } = body;

    if (!deployer || !collectionAddress || !name || !symbol) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const newDeployment: Deployment = {
      id: `dep_${Date.now()}`,
      deployer: deployer.toLowerCase(),
      collectionAddress: collectionAddress.toLowerCase(),
      name,
      symbol,
      txHash: txHash || "pending",
      feeCollected: "0.05 ETH",
      timestamp: new Date().toISOString(),
    };

    // Save to "database"
    deploymentsDB.push(newDeployment);

    // Production integration example with Prisma:
    // import { prisma } from '@/lib/prisma';
    // await prisma.deployment.create({ data: newDeployment });

    console.log("✅ New Launchpad Deployment logged to backend DB:", newDeployment);

    return NextResponse.json({
      success: true,
      message: "Deployment logged successfully to backend",
      deploymentId: newDeployment.id,
      feeCollected: newDeployment.feeCollected,
      totalDeployments: deploymentsDB.length,
    });
  } catch (error: any) {
    console.error("Backend error logging deployment:", error);
    return NextResponse.json(
      { success: false, error: "Failed to log deployment" },
      { status: 500 }
    );
  }
}

// Optional GET endpoint to retrieve all logged deployments (for admin/debug)
export async function GET() {
  return NextResponse.json({
    success: true,
    deployments: deploymentsDB,
    count: deploymentsDB.length,
  });
}

