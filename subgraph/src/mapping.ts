import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  HybridMintRequested,
  HybridMintFulfilled,
} from "../generated/HybridPoWNFT/HybridPoWNFT";
import { HybridMintRequest, NFT } from "../generated/schema";

export function handleHybridMintRequested(event: HybridMintRequested): void {
  let request = new HybridMintRequest(event.params.requestId.toString());
  request.requestId = event.params.requestId;
  request.user = event.params.user;
  request.nonce = event.params.nonce;
  request.timestamp = event.block.timestamp;
  request.fulfilled = false;
  request.save();
}

export function handleHybridMintFulfilled(event: HybridMintFulfilled): void {
  let requestId = event.params.requestId.toString();
  let request = HybridMintRequest.load(requestId);
  if (request) {
    request.fulfilled = true;
    request.tokenId = event.params.tokenId;
    request.rarityScore = event.params.rarityScore;
    request.save();
  }

  // Create or update NFT entity
  let nft = new NFT(event.params.tokenId.toString());
  nft.tokenId = event.params.tokenId;
  nft.owner = event.transaction.from; // or fetch from contract if needed
  nft.rarityScore = event.params.rarityScore;
  // Note: For full traits, either store in event or query contract
  nft.mintedAt = event.block.timestamp;
  nft.requestId = event.params.requestId;
  nft.save();
}