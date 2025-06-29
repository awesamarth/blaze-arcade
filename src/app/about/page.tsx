'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { ArrowLeft, Github, ExternalLink } from 'lucide-react'

export default function AboutPage() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === 'dark'

  const networks = [
    { name: 'MegaETH', color: 'purple' },
    { name: 'RISE',  color: 'blue' },
    { name: 'Somnia', color: 'orange' },
  ]

  const techStack = [
    'Next.js 15 & React 19',
    'Privy for wallet authentication',
    'Wagmi & Viem for blockchain interactions',
    'Foundry for smart contract development',
    'Phaser.js for game engines',
    'Tailwind CSS for styling'
  ]

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
            <span className="text-purple-500">ABOUT</span>{' '}
            <span className={isDark ? "text-white" : "text-black"}>BLAZE</span>
          </h1>
          <p className="text-xl font-rajdhani text-muted-foreground max-w-2xl mx-auto">
            The first gaming platform that benchmarks blockchain latency in real-time
          </p>
        </div>

        {/* What is Blaze Arcade */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold font-rajdhani mb-6">The Idea</h2>
          <div className="prose prose-lg max-w-none">
            <p className="text-muted-foreground leading-relaxed mb-4">
              Blaze Arcade is a unique platform that gamifies blockchain performance testing. Instead of boring benchmarks and charts, 
              you experience network latency through actual gameplay where every action sends a real transaction to your chosen L2. You can feel
              how your favorite "realtime" chains compare against each other and also against offline gameplay without any blockchain.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Whether you're a developer evaluating different chains or a gamer curious about "realtime" blockchain claims, 
              Blaze Arcade gives you hands-on experience with network performance.
            </p>
          </div>
        </section>

        {/* Why I Built This */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold font-rajdhani mb-6">Why I Built This</h2>
          <div className="prose prose-lg max-w-none">
            <p className="text-muted-foreground leading-relaxed mb-4">
              Many chains are now claiming to be "instant" and "realtime," but how do they actually feel when you're using them? 
              Traditional benchmarks show TPS and confirmation times, but they don't capture the user experience. A truly "realtime" chain 
              would be one where the user doesn't even realize that a transaction is being sent to the blockchain.  
            </p> 
            <p className="text-muted-foreground leading-relaxed">
              I wanted to create a fun, interactive way to test and compare blockchain performance that anyone could understand. 
              Games are perfect for this as they require quick responses and immediate feedback, making network latency immediately noticeable.
            </p>
          </div>
        </section>

        {/* Technical Details */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold font-rajdhani mb-6">How It Works</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-4">Tech Stack</h3>
              <ul className="space-y-2">
                {techStack.map((tech, index) => (
                  <li key={index} className="text-muted-foreground flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0"></span>
                    {tech}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4">Key Features</h3>
              <ul className="space-y-2">
                <li className="text-muted-foreground flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></span>
                  Pre-signed transaction pools for minimal latency
                </li>
                <li className="text-muted-foreground flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></span>
                  Chain-specific RPC optimizations
                </li>
                <li className="text-muted-foreground flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></span>
                  Web3 toggle for offline comparison
                </li>
                <li className="text-muted-foreground flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></span>
                  Real-time performance measurement
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Supported Networks */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold font-rajdhani mb-6">Supported Networks</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {networks.map((network, index) => (
              <div key={index} className="p-6 border border-border rounded-lg bg-card">
                <h3 className="text-xl font-semibold">{network.name}</h3>
              </div>
            ))}
          </div>
        </section>

        {/* Open Source & Contact */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold font-rajdhani mb-6">Open Source</h2>
          <div className="p-6 border border-border rounded-lg bg-card">
            <p className="text-muted-foreground mb-4">
              Blaze Arcade is open source and available on GitHub. Feel free to explore the code, suggest improvements, or contribute!
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg transition-colors"
              >
                <Github size={20} />
                <span>View on GitHub</span>
                <ExternalLink size={16} />
              </a>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="text-center">
          <h2 className="text-2xl font-bold font-rajdhani mb-4">Ready to test some networks?</h2>
          <Link
            href="/play"
            className="inline-block px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200"
          >
            Enter the Arcade
          </Link>
        </div>
      </div>
    </div>
  )
}