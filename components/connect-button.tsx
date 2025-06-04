"use client"

import { ConnectKitButton } from "connectkit"
import { Button } from "@/components/ui/button"
import { Wallet } from "lucide-react"

export function ConnectButton() {
  return (
    <ConnectKitButton.Custom>
      {({ isConnected, show, truncatedAddress, ensName }) => {
        return (
          <Button onClick={show} className="bg-green-500 hover:bg-green-600 text-black font-semibold">
            <Wallet className="mr-2 h-4 w-4" />
            {isConnected ? (
              <span className="hidden sm:inline">{ensName ?? truncatedAddress}</span>
            ) : (
              <>
                <span className="hidden sm:inline">Connect Wallet</span>
                <span className="inline sm:hidden">Connect</span>
              </>
            )}
          </Button>
        )
      }}
    </ConnectKitButton.Custom>
  )
}
