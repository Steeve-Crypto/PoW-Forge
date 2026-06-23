#!/bin/bash
# Subgraph Deployment Automation Script
# Usage: ./deploy.sh [studio|hosted] [version-label]

set -e

SUBGRAPH_NAME=${SUBGRAPH_NAME:-"powforge-hybrid"}
VERSION_LABEL=${2:-"v0.1.0"}
NETWORK=${NETWORK:-"sepolia"}

echo "🚀 Deploying PoWForge Subgraph to The Graph..."

if [ "$1" = "studio" ]; then
  echo "Deploying to The Graph Studio..."
  graph deploy --studio $SUBGRAPH_NAME --version-label $VERSION_LABEL
elif [ "$1" = "hosted" ]; then
  echo "Deploying to hosted service..."
  graph deploy $SUBGRAPH_NAME --ipfs https://api.thegraph.com/ipfs/ --node https://api.thegraph.com/deploy/
else
  echo "Usage: ./deploy.sh studio [version]  or  ./deploy.sh hosted [version]"
  exit 1
fi

echo "✅ Deployment complete!"
echo "Update your frontend .env with the new hosted endpoint."