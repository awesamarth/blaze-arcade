'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import { Sun, Moon, Menu, X, ChevronDown, ExternalLink, Copy } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { useLogin, usePrivy, useWallets } from '@privy-io/react-auth'
import { useBalance } from 'wagmi'
import { formatEther } from 'viem'

export const Navbar = () => {
  const { theme, setTheme } = useTheme()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isWalletOpen, setIsWalletOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [copied, setCopied] = useState(false)

  const { ready, authenticated, logout } = usePrivy()
  const { login } = useLogin()
  const { wallets } = useWallets()
  const walletDropdownRef = useRef<HTMLDivElement>(null);


  const embeddedWallet = wallets.find(wallet => wallet.walletClientType === 'privy');


  const disableLogin = !ready || (ready && authenticated)





  // Wait for component to mount to access theme
  useEffect(() => {
    setMounted(true)
  }, [])


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (walletDropdownRef.current && !walletDropdownRef.current.contains(event.target as Node)) {
        setIsWalletOpen(false);
      }
    };

    if (isWalletOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isWalletOpen]);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen)
  const toggleWalletDropdown = () => setIsWalletOpen(!isWalletOpen)
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  // Used for conditional rendering based on theme
  const isLight = mounted && theme === 'light'

  // Helper function to truncate address
  const truncateAddress = (address: any) => {
    if (!address) return '';
    return `${address.substring(0, 8)}...${address.substring(address.length - 4)}`;
  }

  // Get faucet URL based on chain ID
  const getFaucetUrl = (chainId: string | null | number) => {
    switch (chainId) {
      case 31337: // Foundry
        return 'https://chain.link/faucets';
      case 6342: // Mega Testnet
        return 'https://testnet.megaeth.com';
      case 50312: // Somnia Testnet
        return 'https://testnet.somnia.network/';
      case 11155931: // RISE Testnet
        return 'https://faucet.testnet.riselabs.xyz/';
      default:
        return '';
    }
  }

  // Get current chain ID from active wallet
  const currentChainId = embeddedWallet?.chainId || null;
  console.log(currentChainId)
  const parsedChainId = currentChainId ? parseInt(currentChainId.split(':')[1]) : null;

  // Get balance of active wallet
  const { data: balanceData, refetch: refetchBalance } = useBalance({
    //@ts-ignore
    address: embeddedWallet?.address,
    chainId: parsedChainId || undefined, // Add this line

  })

  
  useEffect(() => {
    // @ts-ignore
    window.refetchBalance = refetchBalance;
  }, [refetchBalance]);


  // Get faucet URL for current chain
  const faucetUrl = getFaucetUrl(parsedChainId);



  return (
    <nav className={cn(
      "w-full fixed top-0 z-[9999] py-4 px-6 md:px-12 flex items-center justify-between border-b transition-colors duration-300",
      isLight
        ? "bg-white border-black/10"
        : "bg-black border-white/10"
    )}>
      {/* Logo/Brand */}
      <Link href="/" className="flex items-center  gap-3">
        <Image 
          src="/logo.png" 
          alt="Blaze Arcade Logo" 
          width={32} 
          height={32}
          className="w-10 h-10 mb-[5px]"
        />
        <span className={cn(
          "text-2xl font-bold font-[family-name:var(--font-doom)]",
          isLight ? "text-black" : "text-white"
        )}>
          BLAZE
        </span>
      </Link>

      {/* Mobile Menu Button */}
      <button
        className={cn(
          "md:hidden flex items-center",
          isLight ? "text-black" : "text-white"
        )}
        onClick={toggleMenu}
        aria-label="Toggle Menu"
      >
        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Nav Items & Controls */}
      <div className={cn(
        "flex flex-col md:flex-row items-center gap-6 md:gap-8 absolute md:static top-15 left-0 right-0 md:bg-transparent p-6 md:p-0 border-b md:border-0 transition-all duration-300 z-10",
        isLight

          ? "bg-white border-black/10"

          : "bg-black border-white/10",

        isMenuOpen ? "opacity-100 visible" : "opacity-0 invisible md:opacity-100 md:visible"
      )}>
        <Link
          href="/play"
          className={cn(
            "transition-colors",
            isLight
              ? "text-black hover:text-purple-700"
              : "text-white hover:text-purple-400"
          )}
        >
          Play
        </Link>
        <Link
          href="/stats"
          className={cn(
            "transition-colors",
            isLight
              ? "text-black hover:text-purple-700"
              : "text-white hover:text-purple-400"
          )}
        >
          Stats
        </Link>
        <Link
          href="/about"
          className={cn(
            "transition-colors",
            isLight
              ? "text-black hover:text-purple-700"
              : "text-white hover:text-purple-400"
          )}
        >
          About
        </Link>

        {/* Wallet Connection */}
        {!authenticated ? (
          <button
            disabled={disableLogin}
            onClick={login}
            className={cn(
              "px-4 py-2 rounded-md transition-colors hover:cursor-pointer",
              isLight
                ? "bg-gray-200 hover:bg-gray-300 text-black"
                : "bg-gray-800 hover:bg-gray-700 text-white",
              disableLogin && "opacity-50 cursor-not-allowed"
            )}
          >
            Login
          </button>
        ) : (
          <div className="relative" ref={walletDropdownRef}>
            <button
              onClick={toggleWalletDropdown}
              className={cn(
                "px-4 py-2 rounded-md transition-colors flex items-center gap-2 hover:cursor-pointer",
                isLight
                  ? "bg-gray-200 hover:bg-gray-300 text-black"
                  : "bg-gray-800 hover:bg-gray-700 text-white"
              )}
            >
              <span>{truncateAddress(embeddedWallet?.address)}</span>
              <ChevronDown size={16} />
            </button>

            {isWalletOpen && (
              <div className={cn(
                "absolute right-0 mt-2 w-56 rounded-md shadow-lg p-2 border z-20",
                isLight
                  ? "bg-white border-gray-200"
                  : "bg-gray-800 border-gray-700"
              )}>
                {/* Connected address */}
                <div className="">
                  <div className={cn(
                    "flex items-center justify-between w-full px-3 py-2 text-sm rounded-md"
                  )}>
                    <span>{truncateAddress(embeddedWallet?.address)}</span>
                    <div className="relative group">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(embeddedWallet?.address || '');
                          // Trigger copied state (you'll need to add this state)
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="ml-2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        <Copy className='hover:cursor-pointer' size={14} />
                      </button>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-black rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap">
                        {copied ? 'Copied!' : 'Copy address'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Balance display */}
                <div className="">
                  <div className={cn(
                    "flex items-center w-full px-3 py-2 text-sm rounded-md"
                  )}>
                    {balanceData ? `${parseFloat(formatEther(balanceData.value)).toFixed(6)} ETH` : '0.000000 ETH'}
                  </div>
                </div>

                {/* Faucet link */}
                {faucetUrl && (
                  <a
                    href={faucetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "flex items-center mb-2 gap-2 w-full px-3 py-2 text-sm rounded-md hover:cursor-pointer",
                      isLight
                        ? "hover:bg-gray-100 text-gray-700"
                        : "hover:bg-gray-700 text-white"
                    )}
                  >
                    Get testnet ETH
                    <ExternalLink size={14} />
                  </a>
                )}

                {/* Disconnect button */}
                <button
                  onClick={() => {
                    logout();
                    setIsWalletOpen(false);
                  }}
                  className={cn(
                    "flex items-center w-full px-3 py-2 text-sm rounded-md hover:cursor-pointer",
                    isLight
                      ? "bg-red-700 hover:bg-red-800 text-white"
                      : "bg-red-600 hover:bg-red-700 text-white"
                  )}
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        )}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={cn(
            "p-2 rounded-md hover:cursor-pointer transition-colors",
            isLight
              ? "bg-gray-200 hover:bg-gray-300 text-black"
              : "bg-gray-800 hover:bg-gray-700 text-white"
          )}
          aria-label="Toggle Theme"
        >
          {mounted && (isLight ? <Moon size={20} /> : <Sun size={20} />)}
        </button>
      </div>
    </nav >
  )
}

export default Navbar