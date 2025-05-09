'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTheme } from 'next-themes'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { NetworkSelector, NETWORKS, Network } from '@/components/NetworkSelector'

// Enum for game states
enum GameState {
  IDLE = 'idle',
  WAITING = 'waiting',
  READY = 'ready',
  FINISHED = 'finished',
  GAME_OVER = 'game_over' // Add new state for game over
}

export default function ReactionTimeGame() {
  const { resolvedTheme } = useTheme()

  // States
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE)
  const [attempts, setAttempts] = useState<number>(0)
  const [results, setResults] = useState<{ reactionTime: number, blockchainTime: number }[]>([])
  const [totalReactionTime, setTotalReactionTime] = useState<number>(0)
  const [totalBlockchainTime, setTotalBlockchainTime] = useState<number>(0)
  const [isWeb3Enabled, setIsWeb3Enabled] = useState<boolean>(true)
  const [selectedNetwork, setSelectedNetwork] = useState<Network>(NETWORKS[0])

  // Refs for timeouts and timing
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const readyTimeRef = useRef<number>(0)
  const frameRequestRef = useRef<number | null>(null)

  const isDark = resolvedTheme === 'dark'

  // Mock transaction function
  const sendTransaction = async () => {
    return Promise.resolve()
  }

  // Clear all timers and animation frames
  const clearAllTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    
    if (frameRequestRef.current) {
      cancelAnimationFrame(frameRequestRef.current)
      frameRequestRef.current = null
    }
  }, [])

  // Start the game
  const startGame = useCallback(() => {
    if (gameState !== GameState.IDLE && gameState !== GameState.FINISHED && gameState !== GameState.GAME_OVER) return

    // Clear any existing timers
    clearAllTimers()

    setGameState(GameState.WAITING)
    setAttempts(0)
    setResults([])
    setTotalReactionTime(0)
    setTotalBlockchainTime(0)

    // Random delay between 1-5 seconds
    const delay = Math.floor(Math.random() * 4000) + 1000

    // Schedule transition to READY state
    timeoutRef.current = setTimeout(() => {
      frameRequestRef.current = requestAnimationFrame(() => {
        setGameState(GameState.READY)
        readyTimeRef.current = performance.now()
      })
    }, delay)
  }, [gameState, clearAllTimers])

  // Clean up timeouts and animation frames on unmount
  useEffect(() => {
    return clearAllTimers
  }, [clearAllTimers])

  // Handle user click
  const handleClick = useCallback(async () => {
    switch (gameState) {
      case GameState.IDLE:
      case GameState.FINISHED:
      case GameState.GAME_OVER:
        startGame()
        break

      case GameState.WAITING:
        // Clicked too early - game over
        clearAllTimers() // Important: clear all timers
        setGameState(GameState.GAME_OVER)
        break;

      case GameState.READY:
        // Record click time and calculate reaction time using high-precision timer
        const now = performance.now()
        const reactionTime = Math.round(now - readyTimeRef.current)

        let blockchainTime = 0

        // Only calculate blockchain time if Web3 is enabled
        if (isWeb3Enabled) {
          // Simulate blockchain time based on selected network
          const simulatedTimes = {
            'megaeth': 800,
            'rise': 1200,
            'n1': 600,
            'somnia': 1500
          }

          const baseTime = simulatedTimes[selectedNetwork.id as keyof typeof simulatedTimes] || 1000
          const randomFactor = Math.random() * 0.4 + 0.8
          blockchainTime = Math.round(baseTime * randomFactor)
          await sendTransaction()
        }

        // Store this attempt's results
        const newResults = [...results, { reactionTime, blockchainTime }]
        setResults(newResults)
        
        // Update total times
        setTotalReactionTime(prev => prev + reactionTime)
        setTotalBlockchainTime(prev => prev + blockchainTime)

        // Move to next attempt or finish
        if (attempts < 4) {
          setAttempts(prev => prev + 1)
          
          // Prepare for next attempt
          setGameState(GameState.WAITING)
          
          const delay = Math.floor(Math.random() * 4000) + 1000
          
          // Clear any existing timers before setting new ones
          clearAllTimers()
          
          timeoutRef.current = setTimeout(() => {
            frameRequestRef.current = requestAnimationFrame(() => {
              setGameState(GameState.READY)
              readyTimeRef.current = performance.now()
            })
          }, delay)
        } else {
          // Game finished after 5 attempts
          setGameState(GameState.FINISHED)
        }
        break
      
      default:
        break
    }
  }, [gameState, results, attempts, startGame, isWeb3Enabled, selectedNetwork.id, clearAllTimers])

  // Handle Web3 toggle
  const handleToggleWeb3 = (enabled: boolean) => {
    setIsWeb3Enabled(enabled)
  }
  
  // Handle network selection
  const handleNetworkSelect = (network: Network) => {
    setSelectedNetwork(network)
  }

  // Determine background color based on game state
  const getContainerStyle = () => {
    switch (gameState) {
      case GameState.IDLE:
        return 'bg-purple-500 hover:bg-purple-600'
      case GameState.WAITING:
        return 'bg-red-500'
      case GameState.READY:
        return 'bg-green-500'
      case GameState.FINISHED:
        return 'bg-blue-500 hover:bg-blue-600'
      case GameState.GAME_OVER:
        return 'bg-red-600 hover:bg-red-700' // Different color for game over
      default:
        return 'bg-purple-500'
    }
  }

  // Determine message based on game state
  const getMessage = () => {
    switch (gameState) {
      case GameState.IDLE:
        return 'Click to Start'
      case GameState.WAITING:
        return 'Wait for green...'
      case GameState.READY:
        return 'Click Now!'
      case GameState.FINISHED:
        return 'Game Complete! Click to Play Again'
      case GameState.GAME_OVER:
        return 'Game Over! Clicked too early. Click to Try Again'
      default:
        return 'Click to Start'
    }
  }

  // Calculate averages
  const avgReactionTime = results.length > 0 ? Math.round(totalReactionTime / results.length) : 0
  const avgBlockchainTime = (results.length > 0 && isWeb3Enabled) ? Math.round(totalBlockchainTime / results.length) : 0
  const avgTotalTime = avgReactionTime + avgBlockchainTime

  return (
    <div className="flex flex-col items-center min-h-screen">
      {/* Back button positioned outside the main container */}
      <div className="fixed top-20 left-6 z-10">
        <Link
          href="/play"
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back to Games</span>
        </Link>
      </div>

      <div className="w-full max-w-4xl px-6 md:px-12 pt-24 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl md:text-4xl font-bold font-[family-name:var(--font-doom)]">
            <span className={isDark ? "text-white" : "text-black"}>REACTION</span>
            <span className="text-red-500 ml-2">TIME</span>
          </h1>

          {/* Network Selector Component */}
          <div className="w-36 flex-shrink-0">
            <NetworkSelector
              isWeb3Enabled={isWeb3Enabled}
              selectedNetwork={selectedNetwork}
              onToggleWeb3={handleToggleWeb3}
              onSelectNetwork={handleNetworkSelect}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <p className="text-lg font-rajdhani">
            Click when the box turns green - {isWeb3Enabled ? `each click is recorded on ${selectedNetwork.name} Testnet` : 'Web3 mode is disabled'}
          </p>
        </div>

{/* Game container */}
<div
  className={cn(
    "w-full aspect-video rounded-lg flex flex-col items-center justify-center cursor-pointer shadow-lg text-center", // Added text-center
    getContainerStyle()
  )}
  onClick={handleClick}
>
  <h2 className="text-white text-2xl md:text-4xl font-bold mb-4 px-4"> {/* Added px-4 for padding */}
    {getMessage()}
  </h2>

  {gameState === GameState.WAITING || gameState === GameState.READY ? (
    <div className="text-white text-xl">
      Attempt {attempts + 1} of 5
    </div>
  ) : null}
</div>

{/* Results - only show results when game is properly finished */}
{gameState === GameState.FINISHED && results.length > 0 && (
  <div className="mt-8 p-6 border border-border rounded-lg">
    <h3 className="text-xl font-bold mb-4">Results</h3>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {isWeb3Enabled ? (
        <>
          <div className="p-4 border border-border rounded-lg bg-card/40">
            <div className="text-lg font-medium mb-2">Average Time (with blockchain)</div>
            <div className="text-3xl font-bold text-purple-500">{avgTotalTime} ms</div>
          </div>

          <div className="p-4 border border-border rounded-lg bg-card/40">
            <div className="text-lg font-medium mb-2">Average Time (without blockchain)</div>
            <div className="text-3xl font-bold text-green-500">{avgReactionTime} ms</div>
          </div>
        </>
      ) : (
        <div className="p-4 border border-border rounded-lg bg-card/40 md:col-span-2">
          <div className="text-lg font-medium mb-2">Average Reaction Time</div>
          <div className="text-3xl font-bold text-green-500">{avgReactionTime} ms</div>
        </div>
      )}
    </div>
    
    {isWeb3Enabled && (
      <div className="border-t border-border pt-4">
        <h4 className="font-medium mb-2">
          {`${selectedNetwork.name} L2 Transaction Overhead: ${avgBlockchainTime} ms`}
        </h4>
        <p className="text-muted-foreground text-sm">
          This is how much time the blockchain adds to each reaction.
          Different L2 networks will have different processing speeds.
        </p>
      </div>
    )}

    <div className="mt-6">
      <h4 className="font-medium mb-2">Individual Attempts</h4>
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2">Attempt</th>
            <th className="text-right py-2">Reaction Time</th>
            {isWeb3Enabled && <th className="text-right py-2">Blockchain Time</th>}
            {isWeb3Enabled && <th className="text-right py-2">Total Time</th>}
          </tr>
        </thead>
        <tbody>
          {results.map((result, index) => (
            <tr key={index} className="border-b border-border">
              <td className="py-2">{index + 1}</td>
              <td className="text-right py-2">{result.reactionTime} ms</td>
              {isWeb3Enabled && <td className="text-right py-2">{result.blockchainTime} ms</td>}
              {isWeb3Enabled && <td className="text-right py-2">{result.reactionTime + result.blockchainTime} ms</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}
      </div>
    </div>
  )
}