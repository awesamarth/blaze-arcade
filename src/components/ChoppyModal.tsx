'use client'

import { useTheme } from 'next-themes'
import { X } from 'lucide-react'
import { useState, useEffect } from 'react'

interface ChoppyModalProps {
  isOpen: boolean
  onClose: () => void
  onTurnOffWeb3: () => void
  networkName: string
}

export function ChoppyModal({ isOpen, onClose, onTurnOffWeb3, networkName }: ChoppyModalProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === 'dark'

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000] flex items-center justify-center p-6">
      <div className={`relative w-full max-w-md p-6 rounded-lg border shadow-lg ${
        isDark ? 'bg-black border-white/10' : 'bg-white border-black/10'
      }`}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute hover:cursor-pointer top-4 right-4 p-1 rounded-md hover:bg-muted transition-colors"
        >
          <X size={20} />
        </button>

        {/* Content */}
        <div className="text-center">
          <h2 className="text-2xl font-bold font-rajdhani mb-4">
            Did that feel...
            <span className="text-red-500"> choppy?</span>
          </h2>
          
          <p className="text-muted-foreground mb-6 leading-relaxed">
            Damn, must have been the blockchain! Every action had to wait for {networkName} to process the transaction. Maybe try turning web3 off?
          </p>

          <button
            onClick={onTurnOffWeb3}
            className="w-full px-6 hover:cursor-pointer py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200"
          >
            Turn Web3 Off
          </button>
        </div>
      </div>
    </div>
  )
}