'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import Image from 'next/image'
import {
  Target,
  AlertTriangle,
  Keyboard,
  Table as TableTennisIcon
} from 'lucide-react'
import { GameCard } from '@/components/GameCard'

export default function Home() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Wait for component to mount to access theme
  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === 'dark'

  return (
    <div className="flex flex-col items-center ">
      {/* Hero Section with Background */}
      <div className="relative w-full pt-14 h-screen overflow-hidden">
        {/* Background image - only within hero container */}
        <div className="absolute inset-0 z-0 bg-black pointer-events-none">
          <Image
            src="/hero.png"
            alt="Arcade Background"
            fill
            className=" object-cover opacity-40 brightness-75"
            style={{ objectPosition: 'center 15%' }}

            priority
          />
        </div>

        {/* Background stars - only in dark mode */}
        {isDark && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
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

        {/* Hero Content */}
        <div className="flex flex-col items-center justify-center text-center h-full w-full p-6 md:p-12 z-10 relative">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold font-[family-name:var(--font-doom)] flex flex-col gap-6">
            <span className="text-white px-2">BLAZE</span>
            <span className="text-purple-500 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">ARCADE</span>
          </h1>

          <p className="text-2xl md:text-[1.6rem] font-rajdhani font-semibold text-white/90 max-w-xl mt-6">
            Can your favourite EVM chain keep up with you?
          </p>
          <Link
            href="/play"
            className="mt-12 px-8 py-4 text-lg font-medium rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-purple-500/25 hover:scale-105 relative overflow-hidden"
          >
            <span className="relative z-10 ">START PLAYING</span>
            <span className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 -z-0 animate-gradient-x"></span>
          </Link>
        </div>
      </div>

      {/* Games Grid - After Scroll, No Background */}
      <section className="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 p-6 md:p-12 pb-20">
        {/* Game Card - Reaction Time */}
        <GameCard
          icon={<AlertTriangle className="text-red-500" size={32} />}
          title="Reaction Time"
          link="/play/reaction-time"
        />

        {/* Game Card - Typing Test */}
        <GameCard
          icon={<Keyboard className="text-purple-500" size={32} />}
          title="Typing Test"
          link="/play/typing-test"
        />

        {/* Game Card - Aim Test */}
        <GameCard
          icon={<Target className="text-purple-500" size={32} />}
          title="Aim Test"
          link="/play/aim-test"
        />

        {/* Game Card - Ping Pong */}
        <GameCard
          icon={<TableTennisIcon className="text-yellow-400" size={32} />}
          title="Ping Pong"
          link="/play/ping-pong"
        />
      </section>
    </div>
  )
}

