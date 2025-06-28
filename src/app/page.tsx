'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import Image from 'next/image'

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

      {/* What is Blaze Arcade Section */}
      <section className="w-full max-w-4xl px-6 md:px-12 py-24 md:py-32">
        <div className="text-center">
          <h2 className="text-4xl md:text-5xl font-bold font-[family-name:var(--font-doom)]  leading-relaxed mb-8">
            <span className="text-purple-500">WHAT IS</span>{' '}
            <span className={isDark ? "text-white" : "text-black"}>BLAZE ARCADE?</span>
          </h2>
          
          <p className="text-xl md:text-2xl font-rajdhani font-medium mb-6 max-w-3xl mx-auto leading-relaxed">
            See if "realtime" chains truly feel realtime. Every game action sends a transaction to your chosen chain. Experience blockchain latency through gameplay.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/20 flex items-center justify-center">
                <span className="text-2xl">🎮</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Play Games</h3>
              <p className="text-muted-foreground">8 different arcade games to test your skills and reflexes</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center">
                <span className="text-2xl">⛓️</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Real Transactions</h3>
              <p className="text-muted-foreground">Every action sends a transaction to the blockchain</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <span className="text-2xl">📈</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Measure Latency</h3>
              <p className="text-muted-foreground">Compare network performance across different EVM chains</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-500/20 flex items-center justify-center">
                <span className="text-2xl">🛜</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Compare vs Offline</h3>
              <p className="text-muted-foreground">Toggle Web3 off to see how games feel without blockchain latency</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="w-full max-w-4xl px-6 md:px-12 py-20 md:pt-20 md:pb-28">
        <div className="text-center">
          <h2 className="text-4xl md:text-5xl font-bold font-[family-name:var(--font-doom)]  leading-relaxed mb-24">
            <div><span className="text-purple-500">HOW IT</span></div>
            <div><span className={isDark ? "text-white" : "text-black"}>WORKS</span></div>
          </h2>
          
          <div className="grid md:grid-cols-3 gap-16">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold mb-3 font-rajdhani">Log in</h3>
              <p className="text-muted-foreground">Connect either your wallet or socials to get started. We'll set up everything for you.</p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold mb-3 font-rajdhani">Choose Your Network</h3>
              <p className="text-muted-foreground">Select from MegaETH, RISE, Somnia and Abstract, or toggle web3 off.</p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500 flex items-center justify-center text-white text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold mb-3 font-rajdhani">Play & Measure</h3>
              <p className="text-muted-foreground">Every game action sends a real transaction. Feel the network's true speed.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full max-w-4xl px-6 md:px-12 py-28">
        <div className="text-center">
          <h2 className="text-3xl md:text-4xl font-bold font-[family-name:var(--font-doom)]  leading-relaxed mb-6">
            <span className={isDark ? "text-white" : "text-black"}>Ready Player One?</span>
          </h2>
          
          <Link
            href="/play"
            className="inline-block mt-8 px-10 py-4 text-xl font-medium rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-purple-500/25 hover:scale-105 relative overflow-hidden"
          >
            <span className="relative z-10">ENTER THE ARCADE</span>
            <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 -z-0 animate-gradient-x"></span>
          </Link>
        </div>
      </section>


    </div>
  )
}

