package main

import (
	"crypto/sha256"
	"encoding/binary"
	"encoding/hex"
	"flag"
	"fmt"
	"math/big"
	"os"
	"runtime"
	"sync"
	"sync/atomic"
	"time"
)

// leadingZeroBits returns the number of leading zero bits in the hash.
// Higher value = provably rarer solution (used for NFT rarity tiers).
func leadingZeroBits(hash [32]byte) int {
	bits := 0
	for _, b := range hash {
		if b == 0 {
			bits += 8
			continue
		}
		for i := 7; i >= 0; i-- {
			if (b & (1 << uint(i))) != 0 {
				return bits
			}
			bits++
		}
	}
	return bits
}

// PoWForge - Fast Proof of Work Miner
// Generates valid nonce for SHA256 PoW to be verified on-chain via EVM precompile 0x02
// Usage for revenue-generating contracts: Mine solutions off-chain for fair, bot-resistant mints/claims

func main() {
	challengeHex := flag.String("challenge", "", "Challenge as 64-char hex (bytes32)")
	targetHex := flag.String("target", "0x00000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffff", "Target hash as hex (hash < target to win). Lower = harder. Default ~32 bits")
	maxNonce := flag.Uint64("max-nonce", 1<<40, "Maximum nonce to search (uint64)")
	workers := flag.Int("workers", runtime.NumCPU(), "Number of parallel workers (goroutines)")
	verbose := flag.Bool("v", false, "Verbose output with hashrate updates")
	flag.Parse()

	if *challengeHex == "" {
		fmt.Println("Error: --challenge required (e.g. 0x1234...64hex)")
		fmt.Println("Example: ./pow-miner --challenge 0x0000000000000000000000000000000000000000000000000000000000000001 --target 0x0000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")
		os.Exit(1)
	}

	challengeBytes, err := hex.DecodeString(strip0x(*challengeHex))
	if err != nil || len(challengeBytes) != 32 {
		fmt.Printf("Error: challenge must be 32 bytes hex, got err=%v len=%d\n", err, len(challengeBytes))
		os.Exit(1)
	}
	var challenge [32]byte
	copy(challenge[:], challengeBytes)

	target, ok := new(big.Int).SetString(strip0x(*targetHex), 16)
	if !ok {
		fmt.Println("Error: invalid target hex")
		os.Exit(1)
	}

	fmt.Printf("PoWForge Miner starting...\n")
	fmt.Printf("Challenge: 0x%s\n", hex.EncodeToString(challenge[:]))
	fmt.Printf("Target:    0x%s (difficulty ~2^%d)\n", target.Text(16), 256-target.BitLen())
	fmt.Printf("Workers:   %d | MaxNonce: %d\n\n", *workers, *maxNonce)

	startTime := time.Now()
	var totalHashes uint64
	var foundNonce uint64
	var foundHash [32]byte
	var found bool
	var mu sync.Mutex
	var wg sync.WaitGroup

	// Channel to signal solution found
	solutionChan := make(chan struct{}, 1)

	for w := 0; w < *workers; w++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			localHashes := uint64(0)
			// Each worker starts at different offset for better distribution
			nonce := uint64(workerID) * (*maxNonce / uint64(*workers))
			step := uint64(*workers)

			for nonce < *maxNonce {
				if atomic.LoadUint64(&foundNonce) != 0 { // quick check
					return
				}

				data := prepareData(challenge, nonce)
				hash := sha256.Sum256(data[:])
				hashInt := new(big.Int).SetBytes(hash[:])

				localHashes++
				if localHashes%100000 == 0 && *verbose {
					atomic.AddUint64(&totalHashes, localHashes)
					localHashes = 0
				}

				if hashInt.Cmp(target) < 0 {
					mu.Lock()
					if !found {
						found = true
						foundNonce = nonce
						foundHash = hash
						atomic.StoreUint64(&foundNonce, nonce)
						select {
						case solutionChan <- struct{}{}:
						default:
						}
					}
					mu.Unlock()
					return
				}
				nonce += step
			}
			atomic.AddUint64(&totalHashes, localHashes)
		}(w)
	}

	// Monitor progress if verbose
	if *verbose {
		go func() {
			ticker := time.NewTicker(2 * time.Second)
			defer ticker.Stop()
			for {
				select {
				case <-ticker.C:
					elapsed := time.Since(startTime).Seconds()
					hashes := atomic.LoadUint64(&totalHashes)
					rate := float64(hashes) / elapsed / 1e6 // MH/s
					fmt.Printf("[%.1fs] Hashes: %d | Rate: %.2f MH/s\n", elapsed, hashes, rate)
				case <-solutionChan:
					return
				}
			}
		}()
	}

	wg.Wait()
	close(solutionChan)

	elapsed := time.Since(startTime)
	totalH := atomic.LoadUint64(&totalHashes)
	if totalH == 0 {
		totalH = 1 // avoid div0
	}
	rate := float64(totalH) / elapsed.Seconds() / 1e6

	if found {
		rarityBits := leadingZeroBits(foundHash)
		fmt.Printf("\n✅ SOLUTION FOUND!\n")
		fmt.Printf("Nonce:     %d (0x%x)\n", foundNonce, foundNonce)
		fmt.Printf("Hash:      0x%s\n", hex.EncodeToString(foundHash[:]))
		fmt.Printf("Rarity:    %d leading zero bits (higher = rarer tier in ERC721PoWRarity)\n", rarityBits)
		fmt.Printf("Time:      %.3fs | Hashrate: %.2f MH/s\n", elapsed.Seconds(), rate)
		fmt.Printf("\nUse this in contract call:\n")
		fmt.Printf("  mintWithPoW(%d)\n\n", foundNonce)
		fmt.Printf("JSON for scripts: {\"nonce\":%d,\"hash\":\"0x%s\",\"rarityBits\":%d}\n", foundNonce, hex.EncodeToString(foundHash[:]), rarityBits)
	} else {
		fmt.Printf("\n❌ No solution found within nonce range. Increase --max-nonce or lower difficulty (--target with more leading zeros).\n")
	}
}

func strip0x(s string) string {
	if len(s) >= 2 && s[0:2] == "0x" {
		return s[2:]
	}
	return s
}

func prepareData(challenge [32]byte, nonce uint64) [64]byte {
	var data [64]byte
	copy(data[:32], challenge[:])
	// Encode nonce as big-endian uint256 (last 8 bytes set, high bytes 0) to match abi.encodePacked(bytes32, uint256)
	binary.BigEndian.PutUint64(data[56:64], nonce)
	return data
}
