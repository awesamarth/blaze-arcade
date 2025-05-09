'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import {
  Target,
  AlertTriangle,
  Keyboard,
  Table,
  Music,
  Hammer,
  
} from 'lucide-react'
import { GameCard } from '@/components/GameCard'

export default function PlayPage() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Wait for component to mount to access theme
  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === 'dark'

  return (
    <div className="flex flex-col items-center pt-24 min-h-screen">
      {/* Page Header */}
      <div className="w-full max-w-6xl px-6 md:px-12 mb-8">
        <h1 className="text-4xl mt-8 md:text-5xl font-bold font-[family-name:var(--font-doom)] text-center">
          <span className="text-purple-500 ml-2">GAMES </span>
        </h1>
        <p className="text-lg md:text-xl font-rajdhani font-medium text-center mt-5 mb-2 max-w-2xl mx-auto">
          Warning: these games are designed to make you rage!
        </p>
      </div>

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

      {/* Games Grid */}
      <section className="w-full max-w-6xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 p-6 md:px-12 pb-20">
        {/* Game Card - Reaction Time */}
        <GameCard
          icon={<AlertTriangle className="text-red-500" size={48} />}
          title="Reaction Time"
          link="/play/reaction-time"
          description="Test how quickly you can react when each click is recorded on-chain."
        />

        {/* Game Card - Typing Test */}
        <GameCard
          icon={<Keyboard className="text-purple-600" size={48} />}
          title="Typing Test"
          link="/play/typing-test"
          description="Type as fast as you can while every word gets recorded on-chain."
        />

        {/* Game Card - Aim Test */}
        <GameCard
          icon={<Target className="text-blue-500" size={48} />}
          title="Aim Test"
          link="/play/aim-test"
          description="Hit targets accurately when each shot is processed on-chain."
        />

        {/* Game Card - Ping Pong */}
        <GameCard
          icon={<Table className="text-green-500" size={48} />}
          title="Ping Pong"
          link="/play/ping-pong"
          description="Battle against an AI opponent where both player moves happen on-chain."
        />

        {/* Game Card - Snake */}
        <GameCard
          icon={<Table className="text-yellow-500" size={48} />}
          title="Snake"
          link="/play/snake"
          description="Navigate your snake when every turn and movement is recorded on-chain."
        />

        {/* Game Card - Guitar Hero */}
        <GameCard
          icon={<Music className="text-purple-400" size={48} />}
          title="Guitar Hero"
          link="/play/guitar-hero"
          description="Hit the right notes in rhythm while each note is verified on-chain."
        />

        {/* Game Card - Whack-a-Mole */}
        <GameCard
          icon={<Hammer className="text-orange-500" size={48} />}
          title="Whack-a-Mole"
          link="/play/whack-a-mole"
          description="Test your reflexes to whack moles with every hit recorded on-chain."
        />

        {/* Game Card - Boxing */}
        <GameCard
          icon={<Table className="text-red-600" size={48} />}
          title="Boxing"
          link="/play/boxing"
          description="Throw punches and dodge in this on-chain boxing simulation."
        />
      </section>
    </div>
  )
}