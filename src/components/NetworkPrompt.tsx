// src/components/NetworkPrompt.tsx
'use client'

import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { Settings, AlertCircle } from 'lucide-react'
import { useState, useEffect } from 'react'

export function NetworkPrompt() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === 'dark'

  return (
    <div className="w-full max-w-4xl p-6 border border-orange-500/50 rounded-lg bg-orange-500/10 backdrop-blur-sm">
      <div className="flex items-center justify-center gap-3 mb-3">
        <Settings className="text-orange-500" size={24} />
        <h3 className="text-xl font-bold text-orange-500">Select Network or turn Web3 off using the switch above</h3>
      </div>
      <p className="text-center text-muted-foreground">
        Please select a network from the dropdown above or turn Web3 off to continue.
      </p>
    </div>
  )
}