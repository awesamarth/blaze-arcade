'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { ArrowLeft, Loader2, Droplets } from 'lucide-react'
import { createPublicClient, http, formatEther } from 'viem'
import { megaethTestnet, somniaTestnet } from 'viem/chains'
import { riseTestnet } from '@/wagmi-config'
import { 
  MEGA_FAUCET_ADDRESS, 
  SOMNIA_FAUCET_ADDRESS, 
  RISE_FAUCET_ADDRESS 
} from '@/constants'

interface FaucetStatus {
  name: string
  address: string
  balance: string | null
  loading: boolean
  error: string | null
  color: string
}

export default function FaucetStatusPage() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [faucets, setFaucets] = useState<FaucetStatus[]>([
    {
      name: 'MegaETH',
      address: MEGA_FAUCET_ADDRESS,
      balance: null,
      loading: true,
      error: null,
      color: 'purple'
    },
    {
      name: 'RISE',
      address: RISE_FAUCET_ADDRESS,
      balance: null,
      loading: true,
      error: null,
      color: 'blue'
    },
    {
      name: 'Somnia',
      address: SOMNIA_FAUCET_ADDRESS,
      balance: null,
      loading: true,
      error: null,
      color: 'orange'
    }
  ])

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === 'dark'

  // Get explorer URL for each network
  const getExplorerUrl = (networkName: string, address: string) => {
    switch (networkName) {
      case 'MegaETH':
        return `https://www.megaexplorer.xyz/address/${address}`
      case 'RISE':
        return `https://explorer.testnet.riselabs.xyz/address/${address}`
      case 'Somnia':
        return `https://shannon-explorer.somnia.network/address/${address}`
      default:
        return ''
    }
  }

  // Create public clients for each network
  const clients = {
    megaeth: createPublicClient({
      chain: megaethTestnet,
      transport: http('https://carrot.megaeth.com/rpc')
    }),
    rise: createPublicClient({
      chain: riseTestnet,
      transport: http('https://testnet.riselabs.xyz/')
    }),
    somnia: createPublicClient({
      chain: somniaTestnet,
      transport: http('https://dream-rpc.somnia.network')
    })
  }

  const fetchBalances = async () => {
    // Set all faucets to loading first
    setFaucets(prev => prev.map(faucet => ({ ...faucet, loading: true })))
    
    const faucetConfigs = [
      { name: 'MegaETH', client: clients.megaeth, address: MEGA_FAUCET_ADDRESS },
      { name: 'RISE', client: clients.rise, address: RISE_FAUCET_ADDRESS },
      { name: 'Somnia', client: clients.somnia, address: SOMNIA_FAUCET_ADDRESS }
    ]

    for (const config of faucetConfigs) {
      try {
        const balance = await config.client.getBalance({
          address: config.address as `0x${string}`
        })

        const balanceInEth = formatEther(balance)

        setFaucets(prev => prev.map(faucet => 
          faucet.name === config.name 
            ? { ...faucet, balance: balanceInEth, loading: false, error: null }
            : faucet
        ))
      } catch (error) {
        console.error(`Error fetching ${config.name} faucet balance:`, error)
        setFaucets(prev => prev.map(faucet => 
          faucet.name === config.name 
            ? { ...faucet, loading: false, error: 'Failed to fetch' }
            : faucet
        ))
      }
    }
  }

  useEffect(() => {
    if (mounted) {
      fetchBalances()
      
      // Auto-refresh every 30 seconds
      const interval = setInterval(fetchBalances, 30000)
      
      return () => clearInterval(interval)
    }
  }, [mounted])


  return (
    <div className="min-h-screen pt-20">
      {/* Background stars - only in dark mode */}
      {isDark && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-primary/20 animate-pulse"
              style={{
                width: `${Math.random() * 3 + 1}px`,
                height: `${Math.random() * 3 + 1}px`,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDuration: `${Math.random() * 5 + 2}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Back button */}
      <div className="fixed top-22 left-6 z-10">
        <Link
          href="/"
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back to Home</span>
        </Link>
      </div>

      <div className="max-w-4xl mx-auto px-6 md:px-12 py-16 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold font-[family-name:var(--font-doom)] tracking-wide leading-relaxed mb-6">
            <span className="text-blue-500">FAUCET</span>{' '}
            <span className={isDark ? "text-white" : "text-black"}>STATUS</span>
          </h1>
          <p className="text-xl font-rajdhani text-muted-foreground max-w-2xl mx-auto">
            Monitor balance levels across all testnet faucets
          </p>
        </div>


        {/* Faucet Status Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {faucets.map((faucet, index) => (
            <div key={index} className="p-6 border border-border rounded-lg bg-card/40">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold font-rajdhani">{faucet.name}</h3>
                  {faucet.loading && (
                    <Loader2 className="animate-spin text-muted-foreground" size={14} />
                  )}
                </div>
                <div className={`w-3 h-3 rounded-full ${
                  faucet.color === 'purple' ? 'bg-purple-500' :
                  faucet.color === 'blue' ? 'bg-blue-500' :
                  faucet.color === 'orange' ? 'bg-orange-500' :
                  'bg-green-500'
                }`} />
              </div>
              
              <div className="text-center">
                {faucet.error ? (
                  <span className="text-red-500">{faucet.error}</span>
                ) : (
                  <div className={`text-3xl font-bold mb-2 transition-opacity ${
                    faucet.loading ? 'text-muted-foreground opacity-60' : ''
                  }`}>
                    {faucet.balance ? `${parseFloat(faucet.balance).toFixed(4)}` : '0.0000'}
                  </div>
                )}
                <p className="text-sm text-muted-foreground mb-4">ETH available</p>
                
                {/* Uses left calculation */}
                <div className="mb-4">
                  {faucet.balance && !faucet.loading ? (
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-500 font-medium">
                      {faucet.name === 'Somnia' 
                        ? `${Math.floor(parseFloat(faucet.balance) * 20)} uses left`
                        : `${Math.floor(parseFloat(faucet.balance) * 1000)} uses left`
                      }
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs rounded-full bg-gray-500/20 text-gray-500 font-medium">
                      - uses left
                    </span>
                  )}
                </div>
              </div>

              <Link
                href={getExplorerUrl(faucet.name, faucet.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground font-mono break-all transition-colors underline-offset-2 hover:underline cursor-pointer"
              >
                <div className="mt-4 pt-4 border-t border-border">
                  {faucet.address}
                </div>
              </Link>
            </div>
          ))}
        </div>

        {/* Refresh Button */}
        <div className="text-center">
          <button
            onClick={fetchBalances}
            disabled={faucets.some(f => f.loading)}
            className="px-6 py-3 hover:cursor-pointer bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {faucets.some(f => f.loading) ? (
              <div className="flex items-center gap-2">
                <Loader2 className="animate-spin" size={16} />
                Loading...
              </div>
            ) : (
              'Refresh Status'
            )}
          </button>
        </div>

      </div>
    </div>
  )
}