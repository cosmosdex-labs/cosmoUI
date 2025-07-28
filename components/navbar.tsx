"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, Plus, ArrowUpDown, BarChart3, Droplets, User, Zap } from "lucide-react"
import ConnectButton from "./ConnectWallet"

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const navItems = [
    { href: "/", label: "Home", icon: null },
    { href: "/launch", label: "Launch", icon: Plus },
    { href: "/swap", label: "Swap", icon: ArrowUpDown },
    { href: "/liquidity", label: "Liquidity", icon: Droplets },
    { href: "/portfolio", label: "Portfolio", icon: User },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/minter", label: "Faucet", icon: Zap },
  ]

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-800/50 bg-gray-950/95 backdrop-blur-xl supports-[backdrop-filter]:bg-gray-950/80 shadow-lg shadow-black/20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo Section */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="relative">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-400 via-blue-500 to-purple-600 p-0.5 shadow-lg">
                  <div className="h-full w-full rounded-[10px] bg-gray-950 flex items-center justify-center">
                    <div className="h-5 w-5 rounded-md bg-gradient-to-br from-emerald-400 to-blue-500"></div>
                  </div>
                </div>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-emerald-400/20 via-blue-500/20 to-purple-600/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                CosmoDex
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "text-white bg-gray-800/50 shadow-sm"
                      : "text-gray-300 hover:text-white hover:bg-gray-800/30"
                  }`}
                >
                  {item.icon && (
                    <item.icon className={`h-4 w-4 transition-colors duration-200 ${
                      isActive ? "text-emerald-400" : "text-gray-400"
                    }`} />
                  )}
                  <span>{item.label}</span>
                  {isActive && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-emerald-400 rounded-full"></div>
                  )}
                </Link>
              )
            })}
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-3">
            <div className="hidden lg:block">
              <ConnectButton />
            </div>

            {/* Mobile Navigation */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="lg:hidden relative p-2 hover:bg-gray-800/50 rounded-lg transition-all duration-200"
                >
                  <Menu className="h-5 w-5 text-gray-300" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-gray-950/95 backdrop-blur-xl border-gray-800/50 w-80">
                <div className="flex flex-col space-y-4 mt-8">
                  {/* Connect Button in Mobile Menu */}
                  <div className="px-4">
                    <ConnectButton />
                  </div>
                  
                  {/* Divider */}
                  <div className="border-t border-gray-800/50 my-2"></div>
                  
                  {/* Navigation Items */}
                  <div className="flex flex-col space-y-2">
                    {navItems.map((item) => {
                      const isActive = pathname === item.href
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                            isActive
                              ? "text-white bg-gray-800/50 border-l-2 border-emerald-400"
                              : "text-gray-300 hover:text-white hover:bg-gray-800/30"
                          }`}
                          onClick={() => setIsOpen(false)}
                        >
                          {item.icon && (
                            <item.icon className={`h-4 w-4 transition-colors duration-200 ${
                              isActive ? "text-emerald-400" : "text-gray-400"
                            }`} />
                          )}
                          <span>{item.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  )
}
