'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { createPublicClient, http } from 'viem'
import { foundry, megaethTestnet, somniaTestnet } from 'viem/chains'
import { riseTestnet } from '@/wagmi-config'
import { 
  UPDATER_ABI, 
  LOCAL_UPDATER_ADDRESS, 
  MEGA_UPDATER_ADDRESS, 
  RISE_UPDATER_ADDRESS, 
  SOMNIA_UPDATER_ADDRESS 
} from '@/constants'

interface NetworkStats {
  name: string
  address: string
  count: number | null
  loading: boolean
  error: string | null
  color: string
}

export default function StatsPage() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [stats, setStats] = useState<NetworkStats[]>([
    {
      name: 'MegaETH',
      address: MEGA_UPDATER_ADDRESS,
      count: null,
      loading: true,
      error: null,
      color: 'purple'
    },
    {
      name: 'RISE',
      address: RISE_UPDATER_ADDRESS,
      count: null,
      loading: true,
      error: null,
      color: 'blue'
    },
    {
      name: 'Somnia',
      address: SOMNIA_UPDATER_ADDRESS,
      count: null,
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
    }),
    foundry: createPublicClient({
      chain: foundry,
      transport: http('http://127.0.0.1:8545')
    })
  }

  const fetchStats = async () => {
    // Set all stats to loading first
    setStats(prev => prev.map(stat => ({ ...stat, loading: true })))
    
    const networkConfigs = [
      { name: 'MegaETH', client: clients.megaeth, address: MEGA_UPDATER_ADDRESS },
      { name: 'RISE', client: clients.rise, address: RISE_UPDATER_ADDRESS },
      { name: 'Somnia', client: clients.somnia, address: SOMNIA_UPDATER_ADDRESS }
    ]

    for (const config of networkConfigs) {
      try {
        const result = await config.client.readContract({
          address: config.address as `0x${string}`,
          abi: UPDATER_ABI,
          functionName: 'number'    
        })

        setStats(prev => prev.map(stat => 
          stat.name === config.name 
            ? { ...stat, count: Number(result), loading: false, error: null }
            : stat
        ))
      } catch (error) {
        console.error(`Error fetching ${config.name} stats:`, error)
        setStats(prev => prev.map(stat => 
          stat.name === config.name 
            ? { ...stat, loading: false, error: 'Failed to fetch' }
            : stat
        ))
      }
    }
  }

  useEffect(() => {
    if (mounted) {
      fetchStats()
      
      // Auto-refresh every 15 seconds
      const interval = setInterval(fetchStats, 15000)
      
      return () => clearInterval(interval)
    }
  }, [mounted])

  const totalTransactions = stats.reduce((sum, stat) => sum + (stat.count || 0), 0)

  return (
    <div className="min-h-screen pt-20">
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

      <div className="max-w-4xl mx-auto px-6 md:px-12 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold font-[family-name:var(--font-doom)] tracking-wide leading-relaxed mb-6">
            <span className="text-purple-500">ARCADE</span>{' '}
            <span className={isDark ? "text-white" : "text-black"}>STATS</span>
          </h1>
          <p className="text-xl font-rajdhani text-muted-foreground max-w-2xl mx-auto">
            Realtime transaction counts across all supported networks
          </p>
        </div>

        {/* Total Stats */}
        <div className="text-center mb-12">
          <div className="inline-block p-8 border border-border rounded-xl bg-card">
            <div className="flex items-center justify-center gap-2 mb-2">
              <h2 className="text-2xl font-bold font-rajdhani">Total Transactions</h2>
              {stats.some(s => s.loading) && (
                <Loader2 className="animate-spin text-muted-foreground" size={16} />
              )}
            </div>
            <div className={`text-4xl font-bold transition-opacity ${
              stats.some(s => s.loading) ? 'text-muted-foreground opacity-60' : 'text-purple-500'
            }`}>
              {totalTransactions.toLocaleString()}
            </div>
            <p className="text-muted-foreground mt-2">across all networks</p>
          </div>
        </div>

        {/* Network Stats Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {stats.map((stat, index) => (
            <div key={index} className="p-6 border border-border rounded-lg bg-card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold font-rajdhani">{stat.name}</h3>
                  {stat.loading && (
                    <Loader2 className="animate-spin text-muted-foreground" size={14} />
                  )}
                </div>
                <div className={`w-3 h-3 rounded-full ${
                  stat.color === 'purple' ? 'bg-purple-500' :
                  stat.color === 'blue' ? 'bg-blue-500' :
                  stat.color === 'orange' ? 'bg-orange-500' :
                  'bg-green-500'
                }`} />
              </div>
              
              <div className="text-center">
                {stat.error ? (
                  <span className="text-red-500">{stat.error}</span>
                ) : (
                  <div className={`text-3xl font-bold mb-2 transition-opacity ${
                    stat.loading ? 'text-muted-foreground opacity-60' : ''
                  }`}>
                    {stat.count?.toLocaleString() || '0'}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">transactions</p>
              </div>

                <Link
                  href={getExplorerUrl(stat.name, stat.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground font-mono break-all transition-colors underline-offset-2 hover:underline cursor-pointer"
                >
              <div className="mt-4 pt-4 border-t border-border">
                  {stat.address}
              </div>
                </Link>
            </div>
          ))}
        </div>

        {/* Refresh Button */}
        <div className="text-center">
          <button
            onClick={fetchStats}
            disabled={stats.some(s => s.loading)}
            className="px-6 py-3 hover:cursor-pointer bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {stats.some(s => s.loading) ? (
              <div className="flex items-center gap-2">
                <Loader2 className="animate-spin" size={16} />
                Loading...
              </div>
            ) : (
              'Refresh Stats'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}