'use client'

import { Loader2 } from 'lucide-react'

interface TransactionToastProps {
  showToast: boolean
  networkName: string
}

export function TransactionToast({ showToast, networkName }: TransactionToastProps) {
  if (!showToast) return null

  return (
    <div className="fixed top-24 right-6 z-50 bg-card border border-border p-4 rounded-lg shadow-lg animate-in fade-in slide-in-from-right-5">
      <div className="flex items-center gap-2">
        <Loader2 className="animate-spin text-primary" size={18} />
        <span>Transaction pending on {networkName}...</span>
      </div>
    </div>
  )
}