// src/app/play/whack-a-mole/page.tsx
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTheme } from 'next-themes'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { NetworkSelector, NETWORKS, Network } from '@/components/NetworkSelector'
import { useBlockchainUtils } from '@/hooks/useBlockchainUtils'
import { getEmbeddedConnectedWallet, useWallets } from '@privy-io/react-auth'
import { callFaucet } from '@/utils'
import { LoginPrompt } from '@/components/LoginPrompt'
import { NetworkPrompt } from '@/components/NetworkPrompt'
import { TransactionToast } from '@/components/TransactionToast'

// Game constants
const GAME_DURATION = 15000 // 15 seconds
const MOLE_SHOW_TIME = 1000 // How long mole stays visible
const MOLE_SPAWN_INTERVAL = 150 // Time between potential mole spawns
const GRID_SIZE = 9 // 3x3 grid

enum GameState {
    IDLE = 'idle',
    PLAYING = 'playing',
    FINISHED = 'finished',
    TRANSACTION_FAILED = 'transaction_failed'
}

interface MoleHit {
    holeIndex: number;
    hitTime: number;
    blockchainTime: number;
}

interface MissedMole {
    holeIndex: number;
    appearedAt: number;
    missedDueTo: 'slow_reaction' | 'transaction_pending';
}

export default function WhackAMoleGame() {
    const { resolvedTheme } = useTheme()
    const { initData, sendUpdate, checkBalance } = useBlockchainUtils()

    // Game state
    const [gameState, setGameState] = useState<GameState>(GameState.IDLE)
    const [score, setScore] = useState(0)
    const [timeLeft, setTimeLeft] = useState(GAME_DURATION)
    const [activeMoles, setActiveMoles] = useState<Set<number>>(new Set())
    const [moleHits, setMoleHits] = useState<MoleHit[]>([])
    const [missedMoles, setMissedMoles] = useState<MissedMole[]>([])

    // Network state
    const [isWeb3Enabled, setIsWeb3Enabled] = useState<boolean>(true)
    const [selectedNetwork, setSelectedNetwork] = useState<Network>(NETWORKS[0])
    const [showToast, setShowToast] = useState(false)
    const [isInitializing, setIsInitializing] = useState(false)
    const [isMounted, setIsMounted] = useState(false)

    // Refs for game logic
    const gameTimerRef = useRef<NodeJS.Timeout | null>(null)
    const moleTimersRef = useRef<Map<number, NodeJS.Timeout>>(new Map())
    const spawnTimerRef = useRef<NodeJS.Timeout | null>(null)
    const transactionPendingRef = useRef(false)
    const gameStartTimeRef = useRef(0)

    // Refs to avoid stale closures
    const gameStateRef = useRef(GameState.IDLE)
    const activeMolesRef = useRef<Set<number>>(new Set())

    const isDark = isMounted && resolvedTheme === 'dark'
    const { wallets } = useWallets()
    const embeddedWallet = getEmbeddedConnectedWallet(wallets)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    // Update refs when state changes
    useEffect(() => {
        gameStateRef.current = gameState
    }, [gameState])

    useEffect(() => {
        activeMolesRef.current = activeMoles
    }, [activeMoles])

    // Initialize network
    useEffect(() => {
        const initializeNetwork = async () => {
            if (isWeb3Enabled && selectedNetwork && selectedNetwork.id !== 'select' && embeddedWallet?.address) {
                setIsInitializing(true)
                try {
                    await initData(selectedNetwork.id, 15) // Pre-sign more transactions for rapid hits
                    console.log(`Initialized ${selectedNetwork.name} with pre-signed transactions`)

                    const balance = await checkBalance(selectedNetwork.id)
                    if (balance === 0n) {
                        console.log(`Balance is 0 on ${selectedNetwork.name}, calling faucet...`)
                        await callFaucet(embeddedWallet.address, selectedNetwork.id)
                        if (window.refetchBalance) {
                            window.refetchBalance()
                        }
                    }
                } catch (error) {
                    console.error(`Failed to initialize ${selectedNetwork.name}:`, error)
                } finally {
                    setIsInitializing(false)
                }
            }
        }

        initializeNetwork()
    }, [selectedNetwork, embeddedWallet?.address, isWeb3Enabled])

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            clearAllTimers()
        }
    }, [])

    const clearAllTimers = useCallback(() => {
        if (gameTimerRef.current) {
            clearInterval(gameTimerRef.current)
            gameTimerRef.current = null
        }
        if (spawnTimerRef.current) {
            clearTimeout(spawnTimerRef.current)
            spawnTimerRef.current = null
        }
        moleTimersRef.current.forEach((timer) => {
            clearTimeout(timer)
        })
        moleTimersRef.current.clear()
    }, [])

    const spawnMole = useCallback(() => {
        console.log('Spawn attempt - gameState:', gameStateRef.current, 'activeMoles:', activeMolesRef.current.size)

        // Only spawn during PLAYING - not during transaction pending
        if (gameStateRef.current !== GameState.PLAYING) {
            console.log('Not spawning - wrong game state')
            return
        }

        // Don't spawn new moles if too many are already active
        if (activeMolesRef.current.size >= 3) {
            scheduleNextSpawn()
            return
        }

        // Find available holes
        const availableHoles = Array.from({ length: GRID_SIZE }, (_, i) => i)
            .filter(i => !activeMolesRef.current.has(i))

        if (availableHoles.length === 0) {
            scheduleNextSpawn()
            return
        }

        // Random chance to spawn (70%)
        if (Math.random() > 0.7) {
            scheduleNextSpawn()
            return
        }

        const randomHole = availableHoles[Math.floor(Math.random() * availableHoles.length)]

        setActiveMoles(prev => new Set([...prev, randomHole]))

        // Set timer to remove mole
        const timer = setTimeout(() => {
            setActiveMoles(prev => {
                const newSet = new Set(prev)
                newSet.delete(randomHole)
                return newSet
            })

            // Track as missed if it disappears due to transaction pending
            if (transactionPendingRef.current) {
                setMissedMoles(prev => [...prev, {
                    holeIndex: randomHole,
                    appearedAt: Date.now(),
                    missedDueTo: 'transaction_pending'
                }])
            } else {
                setMissedMoles(prev => [...prev, {
                    holeIndex: randomHole,
                    appearedAt: Date.now(),
                    missedDueTo: 'slow_reaction'
                }])
            }

            moleTimersRef.current.delete(randomHole)
        }, MOLE_SHOW_TIME)

        moleTimersRef.current.set(randomHole, timer)
        scheduleNextSpawn()
    }, []) // No dependencies needed now since we use refs

    const scheduleNextSpawn = useCallback(() => {
        const delay = MOLE_SPAWN_INTERVAL + Math.random() * 300
        spawnTimerRef.current = setTimeout(spawnMole, delay)
    }, [spawnMole])

    useEffect(() => {
        if (gameState === GameState.PLAYING) {
            console.log('Game started - beginning mole spawning')
            scheduleNextSpawn()
        } else {
            // Clean up spawning when not playing
            if (spawnTimerRef.current) {
                clearTimeout(spawnTimerRef.current)
                spawnTimerRef.current = null
            }
        }
    }, [gameState, scheduleNextSpawn])

    const startGame = useCallback(() => {
        if (gameState !== GameState.IDLE && gameState !== GameState.FINISHED && gameState !== GameState.TRANSACTION_FAILED) return
        if (isInitializing) return

        // Reset game state
        setGameState(GameState.PLAYING)
        setScore(0)
        setTimeLeft(GAME_DURATION)
        setActiveMoles(new Set())
        setMoleHits([])
        setMissedMoles([])
        gameStartTimeRef.current = Date.now()
        transactionPendingRef.current = false

        // Start game timer
        gameTimerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                const newTime = prev - 100
                if (newTime <= 0) {
                    endGame()
                    return 0
                }
                return newTime
            })
        }, 100)

    }, [gameState, isInitializing])

    const endGame = useCallback(() => {
        setGameState(GameState.FINISHED)
        clearAllTimers()
        transactionPendingRef.current = false
        setShowToast(false)

        if (window.refetchBalance) {
            window.refetchBalance()
        }
    }, [clearAllTimers])

    const handleMoleClick = useCallback(async (holeIndex: number) => {
        // Can't hit moles during transaction or when game is not playing
        if (transactionPendingRef.current || gameState !== GameState.PLAYING) return

        // Can't hit mole that's not active
        if (!activeMoles.has(holeIndex)) return

        // Remove mole immediately
        setActiveMoles(prev => {
            const newSet = new Set(prev)
            newSet.delete(holeIndex)
            return newSet
        })

        // Clear the mole's timer
        const timer = moleTimersRef.current.get(holeIndex)
        if (timer) {
            clearTimeout(timer)
            moleTimersRef.current.delete(holeIndex)
        }

        // Increment score immediately
        setScore(prev => prev + 1)

        if (isWeb3Enabled && selectedNetwork.id !== 'select') {
            // Handle blockchain transaction
            transactionPendingRef.current = true
            setShowToast(true)

            try {
                const blockchainTime = await sendUpdate(selectedNetwork.id)

                // Record successful hit
                setMoleHits(prev => [...prev, {
                    holeIndex,
                    hitTime: Date.now() - gameStartTimeRef.current,
                    blockchainTime
                }])

                transactionPendingRef.current = false
                setShowToast(false)

            } catch (error) {
                console.error('Transaction failed:', error)
                transactionPendingRef.current = false
                setShowToast(false)
                setGameState(GameState.TRANSACTION_FAILED)
            }
        } else {
            // No blockchain - just record hit
            setMoleHits(prev => [...prev, {
                holeIndex,
                hitTime: Date.now() - gameStartTimeRef.current,
                blockchainTime: 0
            }])
        }
    }, [gameState, activeMoles, isWeb3Enabled, selectedNetwork.id, sendUpdate])

    const handleToggleWeb3 = (enabled: boolean) => {
        if (transactionPendingRef.current || isInitializing) return
        setIsWeb3Enabled(enabled)
    }

    const handleNetworkSelect = (network: Network) => {
        if (transactionPendingRef.current || isInitializing) return
        setSelectedNetwork(network)
        setGameState(GameState.IDLE)
    }

    // Calculate stats
    const calculateStats = () => {
        const totalMolesSpawned = moleHits.length + missedMoles.length
        const hitRate = totalMolesSpawned > 0 ? (moleHits.length / totalMolesSpawned) * 100 : 0
        const missedDueToBlockchain = missedMoles.filter(m => m.missedDueTo === 'transaction_pending').length
        const totalBlockchainTime = moleHits.reduce((sum, hit) => sum + hit.blockchainTime, 0)
        const avgBlockchainTime = moleHits.length > 0 ? totalBlockchainTime / moleHits.length : 0

        return {
            totalMolesSpawned,
            hitRate: Math.round(hitRate),
            missedDueToBlockchain,
            avgBlockchainTime: Math.round(avgBlockchainTime),
            impactPercentage: totalMolesSpawned > 0 ? Math.round((missedDueToBlockchain / totalMolesSpawned) * 100) : 0
        }
    }

    const stats = calculateStats()

    // Format time display
    const formatTime = (ms: number) => {
        const seconds = Math.ceil(ms / 1000)
        return `${seconds}s`
    }

    return (
        <div className="flex flex-col items-center min-h-screen">
            {!embeddedWallet ? (
                <LoginPrompt />
            ) : (
                <>
                    <TransactionToast
                        showToast={showToast}
                        networkName={selectedNetwork.name}
                    />

                    {isInitializing && (
                        <div className="fixed top-24 left-6 z-50 bg-card border border-border p-4 rounded-lg shadow-lg">
                            <div className="flex items-center gap-2">
                                <Loader2 className="animate-spin text-primary" size={18} />
                                <span>Initializing {selectedNetwork.name}...</span>
                            </div>
                        </div>
                    )}

                    <div className="fixed top-22 left-6 z-10">
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
                                <span className={isDark ? "text-white" : "text-black"}>WHACK</span>
                                <span className="text-orange-500 ml-2">A</span>
                                <span className="text-orange-500 ml-2">MOLE</span>
                            </h1>
                            <div className="w-44 flex-shrink-0">
                                <NetworkSelector
                                    isWeb3Enabled={isWeb3Enabled}
                                    selectedNetwork={selectedNetwork}
                                    onToggleWeb3={handleToggleWeb3}
                                    onSelectNetwork={handleNetworkSelect}
                                />
                            </div>
                        </div>

                        {!(isWeb3Enabled && selectedNetwork.id === 'select') && (
                            <div className="flex items-center gap-2 mb-6">
                                <p className="text-lg font-rajdhani">
                                    Hit the moles as fast as you can - {isWeb3Enabled ? `each hit is recorded on ${selectedNetwork.name} Testnet` : 'Web3 mode is disabled'}
                                </p>
                            </div>
                        )}

                        {isWeb3Enabled && selectedNetwork.id === 'select' && (
                            <div className="mb-6">
                                <NetworkPrompt />
                            </div>
                        )}

                        {(!isWeb3Enabled || selectedNetwork.id !== 'select') && (
                            <div className="w-full">
                                {/* Game Stats Bar */}
                                {gameState === GameState.PLAYING && (
                                    <div className="flex justify-between items-center mb-6 p-4 border border-border rounded-lg bg-card/30">
                                        <div className="flex items-center gap-6">
                                            <div className="text-center">
                                                <div className="text-sm text-muted-foreground">Score</div>
                                                <div className="text-2xl font-bold text-orange-500">{score}</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-sm text-muted-foreground">Time Left</div>
                                                <div className="text-2xl font-bold">{formatTime(timeLeft)}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Start Screen */}
                                {gameState === GameState.IDLE && (
                                    <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-orange-500/30 rounded-lg text-center">
                                        <h2 className="text-2xl font-bold mb-4">Ready to Whack Some Moles?</h2>
                                        <p className="text-muted-foreground mb-6">
                                            Hit as many moles as you can in 15 seconds!<br />
                                            {isWeb3Enabled && "Warning: During blockchain transactions, moles become unhittable!"}
                                        </p>
                                        <button
                                            className={cn(
                                                "px-6 py-3 text-white rounded-lg transition-colors",
                                                isInitializing
                                                    ? "bg-orange-400 cursor-not-allowed"
                                                    : "bg-orange-600 hover:bg-orange-700 hover:cursor-pointer"
                                            )}
                                            onClick={startGame}
                                            disabled={isInitializing}
                                        >
                                            {isInitializing ? "Initializing..." : "Start Whacking!"}
                                        </button>
                                    </div>
                                )}

                                {/* Game Grid */}
                                {gameState === GameState.PLAYING && (
                                    <div className="mb-8">
                                        <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                                            {Array.from({ length: GRID_SIZE }, (_, index) => (
                                                <div
                                                    key={index}
                                                    className={cn(
                                                        "relative h-24 w-24 bg-amber-900 border-4 border-amber-800 rounded-lg overflow-hidden cursor-pointer transition-all duration-200 hover:scale-105 shadow-lg",
                                                        transactionPendingRef.current && "opacity-60"  // Add this line back
                                                    )} onClick={() => handleMoleClick(index)}
                                                >
                                                    {/* Hole background */}
                                                    <div className="absolute inset-0 bg-gradient-to-b from-amber-800 to-black rounded-md"></div>

                                                    {/* Mole */}
                                                    {activeMoles.has(index) && (
                                                        <div className={cn(
                                                            "absolute bottom-0 left-1/2 transform -translate-x-1/2 transition-all duration-300 animate-bounce",
                                                            transactionPendingRef.current && "cursor-not-allowed"
                                                        )}>
                                                            <div className="w-16 h-16 relative select-none">
                                                                {/* Mole body */}
                                                                <div className="w-full h-full bg-amber-700 rounded-full border-2 border-amber-800 relative overflow-hidden">
                                                                    {/* Eyes */}
                                                                    <div className="absolute top-3 left-3 w-2 h-2 bg-black rounded-full"></div>
                                                                    <div className="absolute top-3 right-3 w-2 h-2 bg-black rounded-full"></div>
                                                                    {/* Eye shine */}
                                                                    <div className="absolute top-3 left-3.5 w-1 h-1 bg-white rounded-full"></div>
                                                                    <div className="absolute top-3 right-3.5 w-1 h-1 bg-white rounded-full"></div>
                                                                    {/* Nose */}
                                                                    <div className="absolute top-6 left-1/2 transform -translate-x-1/2 w-1.5 h-1 bg-pink-600 rounded-full"></div>
                                                                    {/* Mouth */}
                                                                    <div className="absolute top-7 left-1/2 transform -translate-x-1/2 w-4 h-1 bg-amber-800 rounded-full"></div>
                                                                    {/* Cheeks */}
                                                                    <div className="absolute top-5 left-1 w-2 h-2 bg-amber-800 rounded-full opacity-50"></div>
                                                                    <div className="absolute top-5 right-1 w-2 h-2 bg-amber-800 rounded-full opacity-50"></div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Transaction Failed */}
                                {gameState === GameState.TRANSACTION_FAILED && (
                                    <div className="border border-red-500/30 rounded-lg p-8 bg-red-500/10 text-center">
                                        <h2 className="text-2xl font-bold text-red-500 mb-4">Transaction Failed</h2>
                                        <p className="mb-6">There was an error processing your blockchain transaction. Check your balance and try again.</p>
                                        <button
                                            className="px-6 py-3 hover:cursor-pointer bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                            onClick={startGame}
                                        >
                                            Try Again
                                        </button>
                                    </div>
                                )}

                                {/* Results */}
                                {gameState === GameState.FINISHED && (
                                    <div className="border border-border rounded-lg p-8 bg-card/30">
                                        <h2 className="text-2xl font-bold text-center mb-6">Game Results</h2>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                            <div className="p-6 border border-border rounded-lg bg-card/40 text-center">
                                                <div className="text-lg font-medium mb-2">Moles Hit</div>
                                                <div className="text-3xl font-bold text-orange-500">{score}</div>
                                            </div>

                                            <div className="p-6 border border-border rounded-lg bg-card/40 text-center">
                                                <div className="text-lg font-medium mb-2">Hit Rate</div>
                                                <div className="text-3xl font-bold text-green-500">{stats.hitRate}%</div>
                                            </div>

                                            <div className="p-6 border border-border rounded-lg bg-card/40 text-center">
                                                <div className="text-lg font-medium mb-2">Total Moles</div>
                                                <div className="text-3xl font-bold">{stats.totalMolesSpawned}</div>
                                            </div>
                                        </div>

                                        {isWeb3Enabled && stats.missedDueToBlockchain > 0 && (
                                            <div className="border-t border-border pt-6 mb-6">
                                                <h4 className="font-medium mb-4 text-center">Blockchain Impact Analysis</h4>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                    <div className="p-4 border border-border rounded-lg bg-red-500/10 text-center">
                                                        <div className="text-sm text-muted-foreground">Moles Missed Due to Blockchain</div>
                                                        <div className="text-2xl font-bold text-red-500">{stats.missedDueToBlockchain}</div>
                                                    </div>

                                                    <div className="p-4 border border-border rounded-lg bg-red-500/10 text-center">
                                                        <div className="text-sm text-muted-foreground">Average Transaction Time</div>
                                                        <div className="text-2xl font-bold text-red-500">{stats.avgBlockchainTime} ms</div>
                                                    </div>
                                                </div>

                                                <div className="text-center p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
                                                    <p className="font-medium text-red-600 text-lg mb-2">
                                                        Performance Impact: {stats.impactPercentage}% of opportunities lost to blockchain delays!
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        You missed {stats.missedDueToBlockchain} moles because you couldn't click them during {selectedNetwork.name} transactions.
                                                        This is {stats.impactPercentage}% of all moles that appeared!
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex justify-center">
                                            <button
                                                className="px-6 py-3 hover:cursor-pointer bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                                                onClick={startGame}
                                            >
                                                Play Again
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Instructions */}
                                {gameState === GameState.IDLE && (
                                    <div className="mt-8 p-4 border border-border rounded-lg bg-card/30">
                                        <h3 className="font-medium mb-2">How to Play:</h3>
                                        <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                                            <li>Click on moles as they pop up from holes</li>
                                            <li>Score as many hits as possible in 15 seconds</li>
                                            <li>Each mole only stays visible for 2.5 seconds</li>
                                            {isWeb3Enabled && (
                                                <>
                                                    <li className="text-red-500">During blockchain transactions, moles become unhittable!</li>
                                                    <li className="text-red-500">You'll watch moles appear and disappear while unable to click them - this shows {selectedNetwork.name}'s latency impact</li>
                                                </>
                                            )}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}