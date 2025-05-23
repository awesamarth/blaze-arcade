// src/components/LoginPrompt.tsx
'use client'

import { useTheme } from 'next-themes'
import { useLogin } from '@privy-io/react-auth'
import { cn } from '@/lib/utils'
import { LogIn, Gamepad2 } from 'lucide-react'
import { useState, useEffect } from 'react'

export function LoginPrompt() {
  const { resolvedTheme } = useTheme()
  const { login } = useLogin()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isLight = mounted && resolvedTheme === 'light'

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center pt-12">


      <div className="relative z-10 max-w-md space-y-6">
        {/* Game controller icon */}
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20">
            <Gamepad2 size={48} className="text-purple-500" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-3xl md:text-4xl font-bold font-[family-name:var(--font-doom)]">
          <span className={cn(isLight ? "text-black" : "text-white")}>READY TO</span>
          <span className="text-purple-500 ml-2">PLAY?</span>
        </h2>

        {/* Description */}
        <p className="text-lg font-rajdhani text-muted-foreground">
          Login to start stress-testing your favourite blockchain.< br />
          "Every millisecond counts" or something like that.
        </p>

        {/* Login button */}
        <button
          onClick={login}
          className={cn(
            "w-full px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2",
            "bg-gradient-to-r from-purple-600 to-blue-600 text-white",
            "hover:from-purple-700 hover:to-blue-700 hover:cursor-pointer",
            "shadow-lg hover:shadow-purple-500/25 hover:scale-[1.02]",
            "relative"
          )}
        >
          <LogIn size={20} className="relative z-10 " />
          <span className="relative z-10">Login to Continue</span>
        </button>

        {/* Small note */}
        <p className="text-sm text-muted-foreground">
          We'll create a wallet for you automatically
        </p>
      </div>
    </div>
  )
}