'use client'

import { useState, useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'
import { ChevronDown, Wifi, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'

// Network interface
export interface Network {
  id: string
  name: string
  color: string
}

// Available chains
const ALL_NETWORKS: Network[] = [
  { id: 'select', name: 'Select Network', color: 'gray' },
  { id: 'megaeth', name: 'MegaETH', color: 'purple' },
  { id: 'rise', name: 'RISE', color: 'blue' },
  { id: 'somnia', name: 'Somnia', color: 'orange' },
  { id: 'foundry', name: 'Foundry', color: 'green' }
]

export const NETWORKS: Network[] = ALL_NETWORKS.filter(network => 
  network.id !== 'foundry' || process.env.NEXT_PUBLIC_DEV_MODE === 'true'
)

interface NetworkSelectorProps {
  isWeb3Enabled: boolean
  selectedNetwork: Network
  onToggleWeb3: (enabled: boolean) => void
  onSelectNetwork: (network: Network) => void
}

export function NetworkSelector({
  isWeb3Enabled,
  selectedNetwork,
  onToggleWeb3,
  onSelectNetwork
}: NetworkSelectorProps) {
  const { resolvedTheme } = useTheme()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [isMounted, setIsMounted] = useState(false)


  const isDark = isMounted && resolvedTheme === 'dark'

  // Get network color class
  // Get network color class
  const getNetworkColorClass = (networkId: string): string => {
    const network = NETWORKS.find(n => n.id === networkId)

    switch (network?.color) {
      case 'purple':
        return 'text-purple-500 border-purple-500'
      case 'blue':
        return 'text-blue-500 border-blue-500'
      case 'green':
        return 'text-green-500 border-green-500'
      case 'orange':
        return 'text-orange-500 border-orange-500'
      case 'gray':
        return 'text-gray-500 border-gray-500'
      case 'cyan':  // ADD THIS CASE
        return 'text-cyan-500 border-cyan-500'
      default:
        return 'text-purple-500 border-purple-500'
    }
  }

  // Toggle dropdown
  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isWeb3Enabled) {
      setIsDropdownOpen(!isDropdownOpen)
    }
  }

  // Handle network selection
  const handleNetworkSelect = (network: Network) => {
    onSelectNetwork(network)
    setIsDropdownOpen(false)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownRef])

  useEffect(() => {
    setIsMounted(true)
  }, [])

  return (
    <div className="flex flex-col w-full">
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleWeb3(!isWeb3Enabled)
            if (!isWeb3Enabled) {
              setIsDropdownOpen(false)
            }
          }}
          className={cn(
            "px-4 py-3 rounded-lg text-base font-medium flex items-center gap-2 hover:cursor-pointer transition-all w-full justify-center shadow-md hover:shadow-lg",
            isWeb3Enabled
              ? "bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30 shadow-green-500/20"
              : "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 shadow-red-500/20"
          )}
        >
          {isWeb3Enabled ? (
            <>
              <Wifi size={22} />
              <span>Web3 On</span>
            </>
          ) : (
            <>
              <WifiOff size={22} />
              <span>Web3 Off</span>
            </>
          )}
        </button>
      </div>

      {isWeb3Enabled && (
        <div className="relative" ref={dropdownRef}>
          <div
            onClick={toggleDropdown}
            className={cn(
              "flex items-center justify-between p-2 border rounded-md cursor-pointer transition-colors",
              isDark ? "border-white/10 hover:border-white/20" : "border-black/10 hover:border-black/20",
              getNetworkColorClass(selectedNetwork.id)
            )}
          >
            <div className="flex items-center gap-2 flex-nowrap">
              <div
                className={cn(
                  "w-3 h-3 rounded-full flex-shrink-0",
                  selectedNetwork.id === 'select' && "bg-gray-500",  
                  selectedNetwork.id === 'megaeth' && "bg-purple-500",
                  selectedNetwork.id === 'rise' && "bg-blue-500",
                  selectedNetwork.id === 'somnia' && "bg-orange-500",
                  selectedNetwork.id === 'foundry' && "bg-green-500",


                )}
              />
              <span className="whitespace-nowrap">{selectedNetwork.name}</span>
            </div>
            <ChevronDown size={16} className={cn("transition-transform flex-shrink-0 ml-1", isDropdownOpen && "rotate-180")} />
          </div>

          {isDropdownOpen && (
            <div
              className={cn(
                "absolute top-full left-0 right-0 mt-1 p-1 border rounded-md z-50 shadow-lg",
                isDark ? "bg-black border-white/10" : "bg-white border-black/10"
              )}
            >
              {NETWORKS.map((network) => (
                <div
                  key={network.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleNetworkSelect(network)
                  }}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors",
                    isDark ? "hover:bg-white/5" : "hover:bg-black/5",
                    selectedNetwork.id === network.id && (isDark ? "bg-white/10" : "bg-black/10")
                  )}
                >
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full",
                      network.id === 'select' && "bg-gray-500",  // Added this line
                      network.id === 'megaeth' && "bg-purple-500",
                      network.id === 'rise' && "bg-blue-500",
                      network.id === 'somnia' && "bg-orange-500",
                      network.id === 'foundry' && "bg-green-500",

                    )}
                  />
                  <span className={getNetworkColorClass(network.id)}>{network.name} </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}