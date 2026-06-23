//go:build js && wasm

package main

import (
	"crypto/sha256"
	"encoding/binary"
	"encoding/hex"
	"math/big"
	"syscall/js"
)

// Exported function for browser: minePoW(challengeHex, targetHex) -> {nonce, hash}
func minePoW(this js.Value, args []js.Value) interface{} {
	if len(args) < 2 {
		return map[string]interface{}{"error": "Need challengeHex and targetHex"}
	}

	challengeHex := args[0].String()
	targetHex := args[1].String()

	challengeBytes, _ := hex.DecodeString(strip0x(challengeHex))
	var challenge [32]byte
	copy(challenge[:], challengeBytes)

	target, _ := new(big.Int).SetString(strip0x(targetHex), 16)

	// Simple search (for demo; in production use workers or longer search)
	for nonce := uint64(0); nonce < (1 << 40); nonce++ {
		data := prepareData(challenge, nonce)
		hash := sha256.Sum256(data[:])
		hashInt := new(big.Int).SetBytes(hash[:])

		if hashInt.Cmp(target) < 0 {
			return map[string]interface{}{
				"nonce": nonce,
				"hash":  "0x" + hex.EncodeToString(hash[:]),
			}
		}
	}
	return map[string]interface{}{"error": "No solution found in range"}
}

func strip0x(s string) string {
	if len(s) >= 2 && s[:2] == "0x" {
		return s[2:]
	}
	return s
}

func prepareData(challenge [32]byte, nonce uint64) [64]byte {
	var data [64]byte
	copy(data[:32], challenge[:])
	binary.BigEndian.PutUint64(data[56:64], nonce)
	return data
}

func main() {
	js.Global().Set("minePoW", js.FuncOf(minePoW))
	// Keep the program running
	select {}
}