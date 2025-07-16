import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Navbar } from "@/components/navbar"
import { WagmiProvider } from "@/components/wagmi-provider"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Cosmodex - Launch Your Meme Token",
  description: "The ultimate platform for creating, trading, and managing meme tokens with built-in liquidity pools.",
  generator: 'v0.dev',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <WagmiProvider>
          <Navbar />
          {children}
        </WagmiProvider>
        <Toaster />
      </body>
    </html>
  )
}
