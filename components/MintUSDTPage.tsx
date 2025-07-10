"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CheckCircle, AlertCircle } from "lucide-react";
import { getPublicKey, connect, signTransaction } from "@/lib/stellar-wallets-kit";
import token from "@/contracts/USDTMinter";
import crypto from "crypto";

export default function MintUSDTPage() {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [amount, setAmount] = useState(1000);
  const [isMinting, setIsMinting] = useState(false);
  const [status, setStatus] = useState<null | { type: "success" | "error"; message: string }>(null);

  React.useEffect(() => {
    getPublicKey().then(setPublicKey);
  }, []);

  const handleConnect = async () => {
    await connect(async () => {
      const pk = await getPublicKey();
      setPublicKey(pk);
    });
  };

  const handleMint = async () => {
    setIsMinting(true);
    setStatus(null);
    try {
      if (!publicKey) throw new Error("Please connect your wallet first.");
      // Mint USDT with 18 decimals, to the connected wallet
      token.options.publicKey = publicKey;
      token.options.signTransaction = signTransaction;
      const tx = await token.mint({
        to: publicKey,
        amount: BigInt(amount) * BigInt(10 ** 6)
      });
      const { result } = await tx.signAndSend();
      console.log("tx result", result);
      setStatus({ type: "success", message: `Successfully minted ${amount} USDT to your wallet!` });
    } catch (error: any) {
      setStatus({ type: "error", message: error?.message || "Minting failed." });
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[80vh]">
      <Card className="w-full max-w-md shadow-2xl border-gray-700 bg-gray-900">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-green-400 flex items-center gap-2">
            Mint Test USDC
          </CardTitle>
          <p className="text-gray-400 text-sm mt-2">
            Instantly mint testnet USDC tokens to your connected wallet for development and testing.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            {/* <Label className="text-gray-300">Wallet Address</Label> */}
            {/* <div className="flex items-center gap-2 mt-1">
              {publicKey ? (
                <span className="truncate text-green-300 font-mono text-xs">{publicKey}</span>
              ) : (
                <Button onClick={handleConnect} className="bg-green-500 hover:bg-green-600 text-black font-semibold">
                  Connect Wallet
                </Button>
              )}
            </div> */}
          </div>
          <div>
            <Label htmlFor="amount" className="text-gray-300">Amount to Mint</Label>
            <Input
              id="amount"
              type="number"
              min={1}
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
              className="bg-gray-800 border-gray-700 mt-1"
              disabled={isMinting}
            />
          </div>
          <Button
            onClick={handleMint}
            className="w-full bg-green-500 hover:bg-green-600 text-black font-semibold py-3"
            disabled={isMinting || !publicKey || amount <= 0}
          >
            {isMinting ? "Minting..." : `Mint ${amount} USDC`}
          </Button>
          {status && (
            <div className={`flex items-center gap-2 mt-2 ${status.type === "success" ? "text-green-400" : "text-red-400"}`}>
              {status.type === "success" ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <span>{status.message}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 