"use client";

import { useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletModalButton } from "@solana/wallet-adapter-react-ui";
import { Button } from "@/components/ui/button";

export function SolanaConnector() {
  const { connected, publicKey, disconnect } = useWallet();

  const base58 = useMemo(() => publicKey?.toBase58(), [publicKey]);

  if (connected) {
    return (
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm">Solana Connected: {base58}</p>
        <Button onClick={() => disconnect()}>Disconnect Solana</Button>
      </div>
    );
  }

  return <WalletModalButton>Connect Solana Wallet</WalletModalButton>;
}
