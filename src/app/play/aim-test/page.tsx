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

enum GameState {
    IDLE = 'idle',
    PLAYING = 'playing',
    PENDING = 'pending',
    FINISHED = 'finished',
    TRANSACTION_FAILED = 'transaction_failed'
}

interface Target {
    id: number
    x: number
    y: number
    spawnTime: number
}

interface AimResult {
    targetTime: number
    blockchainTime: number
    hit: boolean
}

export default function AimTestGame() {
    const { resolvedTheme } = useTheme()
    const { initData, sendUpdate, getPoolStatus, checkBalance } = useBlockchainUtils()

    const [gameState, setGameState] = useState<GameState>(GameState.IDLE)
    const [currentTarget, setCurrentTarget] = useState<Target | null>(null)
    const [targetNumber, setTargetNumber] = useState<number>(0)
    const [results, setResults] = useState<AimResult[]>([])
    const [missCount, setMissCount] = useState<number>(0)
    const [isWeb3Enabled, setIsWeb3Enabled] = useState<boolean>(false)
    const [selectedNetwork, setSelectedNetwork] = useState<Network>(NETWORKS[0])
    const [showToast, setShowToast] = useState(false)
    const [isInitializing, setIsInitializing] = useState(false)
    const [isMounted, setIsMounted] = useState(false)

    const gameAreaRef = useRef<HTMLDivElement>(null)
    const targetRef = useRef<HTMLDivElement>(null)
    const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const isDark = isMounted && resolvedTheme === 'dark'
    const { wallets } = useWallets()
    const embeddedWallet = getEmbeddedConnectedWallet(wallets)

    const TARGET_SIZE = 80
    const TOTAL_TARGETS = 10
    // Don't worry about this lol
    const ADJUSTMENT = 100;
    useEffect(() => {
        const initializeNetwork = async () => {
            if (isWeb3Enabled && selectedNetwork && selectedNetwork.id !== 'select' && embeddedWallet?.address) {
                setIsInitializing(true)
                try {
                    await initData(selectedNetwork.id, 10)
                    console.log(`Initialized ${selectedNetwork.name} with pre-signed transactions`)

                    const balance = await checkBalance(selectedNetwork.id)
                    if (balance === 0n) {
                        console.log(`Balance is 0 on ${selectedNetwork.name}, calling faucet...`)
                        await callFaucet(embeddedWallet.address, selectedNetwork.id)

                        if (window.refetchBalance) {
                            window.refetchBalance();
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

    useEffect(() => {
        setIsMounted(true)
    }, [])

    const generateRandomTarget = (): Target => {
        if (!gameAreaRef.current) return { id: 0, x: 50, y: 50, spawnTime: Date.now() }

        const rect = gameAreaRef.current.getBoundingClientRect()
        const margin = TARGET_SIZE / 2 + 10

        const x = margin + Math.random() * (rect.width - 2 * margin)
        const y = margin + Math.random() * (rect.height - 2 * margin)

        return {
            id: targetNumber + 1,
            x,
            y,
            spawnTime: Date.now()
        }
    }

    const startGame = useCallback(() => {
        if (gameState !== GameState.IDLE && gameState !== GameState.FINISHED && gameState !== GameState.TRANSACTION_FAILED) return

        setGameState(GameState.PLAYING)
        setTargetNumber(0)
        setResults([])
        setMissCount(0)
        setShowToast(false)
        setCurrentTarget(generateRandomTarget())
    }, [gameState, targetNumber])

    const spawnNextTarget = useCallback(() => {
        if (targetNumber + 1 < TOTAL_TARGETS) {
            setTargetNumber(prev => prev + 1)
            setCurrentTarget(generateRandomTarget())
        } else {
            setGameState(GameState.FINISHED)
            setCurrentTarget(null)

            if (window.refetchBalance) {
                window.refetchBalance();
            }
        }
    }, [targetNumber])

    const calculateDistance = (clickX: number, clickY: number, targetX: number, targetY: number): number => {
        const dx = clickX - targetX
        const dy = clickY - targetY
        return Math.sqrt(dx * dx + dy * dy)
    }

    const handleGameAreaClick = useCallback(async (event: React.MouseEvent<HTMLDivElement>) => {
        if (isInitializing) return

        // If idle, finished, or failed - start the game
        if (gameState === GameState.IDLE || gameState === GameState.FINISHED || gameState === GameState.TRANSACTION_FAILED) {
            startGame()
            return
        }

        if (gameState !== GameState.PLAYING || !currentTarget) return

        const rect = gameAreaRef.current?.getBoundingClientRect()
        if (!rect) return

        const clickX = event.clientX - rect.left
        const clickY = event.clientY - rect.top

        const distance = calculateDistance(clickX, clickY, currentTarget.x, currentTarget.y)
        const isHit = distance <= TARGET_SIZE / 2

        if (!isHit) {
            setMissCount(prev => prev + 1)
            return
        }

        // Hit the target
        const targetTime = Math.max(0, Date.now() - currentTarget.spawnTime - ADJUSTMENT)

        if (isWeb3Enabled && selectedNetwork.id !== 'select') {
            setGameState(GameState.PENDING)
            setShowToast(true)

            if (toastTimeoutRef.current) {
                clearTimeout(toastTimeoutRef.current)
            }

            try {
                const blockchainTime = await sendUpdate(selectedNetwork.id)

                const newResult: AimResult = {
                    targetTime,
                    blockchainTime: Math.round(blockchainTime),
                    hit: true
                }

                setResults(prev => [...prev, newResult])
                setShowToast(false)
                setGameState(GameState.PLAYING)
                spawnNextTarget()

            } catch (error) {
                console.error('Transaction failed:', error)
                setShowToast(false)
                setGameState(GameState.TRANSACTION_FAILED)
            }
        } else {
            const newResult: AimResult = {
                targetTime,
                blockchainTime: 0,
                hit: true
            }

            setResults(prev => [...prev, newResult])
            spawnNextTarget()
        }
    }, [gameState, currentTarget, isWeb3Enabled, selectedNetwork.id, sendUpdate, spawnNextTarget, startGame, isInitializing])

    const handleToggleWeb3 = async (enabled: boolean) => {
        if (gameState === GameState.PENDING || isInitializing) return
        setIsWeb3Enabled(enabled)
    }

    const handleNetworkSelect = async (network: Network) => {
        if (gameState === GameState.PENDING || isInitializing) return
        setSelectedNetwork(network)
        resetGame(); 

    }

    const getContainerMessage = () => {
        switch (gameState) {
            case GameState.IDLE: return 'Click to Start Aim Test'
            case GameState.PLAYING: return ``
            case GameState.PENDING: return ``
            case GameState.FINISHED: return 'Test Complete! Click to Play Again'
            case GameState.TRANSACTION_FAILED: return 'Transaction Failed! Please Check Your Balance and Try Again'
            default: return 'Click to Start Aim Test'
        }
    }


    const resetGame = useCallback(() => {
        setGameState(GameState.IDLE);
        setTargetNumber(0);
        setResults([]);
        setMissCount(0);
        setCurrentTarget(null);
        setShowToast(false);
    }, []);
    const accuracy = results.length + missCount > 0 ? (results.length / (results.length + missCount)) * 100 : 0
    const avgTargetTime = results.length > 0 ? Math.round(results.reduce((sum, r) => sum + r.targetTime, 0) / results.length) : 0
    const avgBlockchainTime = results.length > 0 && isWeb3Enabled ? Math.round(results.reduce((sum, r) => sum + r.blockchainTime, 0) / results.length) : 0
    const avgTotalTime = avgTargetTime + avgBlockchainTime

    const poolStatus = getPoolStatus(selectedNetwork.id)

    return (
        <div className="flex flex-col items-center min-h-screen">
            {!embeddedWallet ? (
                <LoginPrompt />
            ) : (
                <>
                    {showToast && (
                        <div className="fixed top-24 right-6 z-50 bg-card border border-border p-4 rounded-lg shadow-lg">
                            <div className="flex items-center gap-2">
                                <Loader2 className="animate-spin text-primary" size={18} />
                                <span>Transaction pending on {selectedNetwork.name}...</span>
                            </div>
                        </div>
                    )}

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
                            className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                        >
                            <ArrowLeft size={20} />
                            <span>Back to Games</span>
                        </Link>
                    </div>

                    <div className="w-full max-w-4xl px-6 md:px-12 pt-24 mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <h1 className="text-3xl md:text-4xl font-bold font-[family-name:var(--font-doom)]">
                                <span className={isDark ? "text-white" : "text-black"}>AIM</span>
                                <span className="text-blue-500 ml-2">TEST</span>
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
                                    Click on the targets as fast and accurately as possible - {isWeb3Enabled ? `each hit is recorded on ${selectedNetwork.name} Testnet` : 'Web3 mode is disabled'}
                                </p>
                            </div>
                        )}

                        {/* Add NetworkPrompt when web3 is enabled but no network selected */}
                        {isWeb3Enabled && selectedNetwork.id === 'select' && (
                            <div className="mb-6">
                                <NetworkPrompt />
                            </div>
                        )}

                        {/* Only show game area when Web3 is off OR a valid network is selected */}
                        {(!isWeb3Enabled || selectedNetwork.id !== 'select') && (
                            <div
                                ref={gameAreaRef}
                                onClick={handleGameAreaClick}
                                className={cn(
                                    "relative w-full h-96 border-2 border-border rounded-lg cursor-crosshair select-none flex items-center justify-center",
                                    gameState === GameState.PLAYING ? "bg-card/20" : "bg-card/10",
                                    (gameState === GameState.PENDING || isInitializing) && "cursor-wait"
                                )}
                            >
                                {currentTarget && gameState === GameState.PLAYING && (
                                    <div
                                        ref={targetRef}
                                        className="absolute bg-red-500 rounded-full border-4 border-white"
                                        style={{
                                            width: TARGET_SIZE,
                                            height: TARGET_SIZE,
                                            left: currentTarget.x - TARGET_SIZE / 2,
                                            top: currentTarget.y - TARGET_SIZE / 2,
                                        }}
                                    />
                                )}

                                {/* Container message */}
                                <div className="text-center">
                                    <div className="text-2xl font-bold">{getContainerMessage()}</div>
                                    {(gameState === GameState.IDLE || gameState === GameState.FINISHED || gameState === GameState.TRANSACTION_FAILED) && (
                                        <div className="text-muted-foreground mt-2">Click anywhere to {gameState === GameState.IDLE ? 'start' : 'restart'}</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Results */}
                        {gameState === GameState.FINISHED && results.length > 0 && (
                            <div className="mt-8 p-6 border border-border rounded-lg">
                                <h3 className="text-xl font-bold mb-4">Results</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <div className="p-4 border border-border rounded-lg bg-card/40">
                                        <div className="text-lg font-medium mb-2">Accuracy</div>
                                        <div className="text-3xl font-bold text-green-500">{accuracy.toFixed(1)}%</div>
                                        <div className="text-sm text-muted-foreground">{results.length} hits / {results.length + missCount} attempts</div>
                                    </div>

                                    {isWeb3Enabled ? (
                                        <div className="p-4 border border-border rounded-lg bg-card/40">
                                            <div className="text-lg font-medium mb-2">Avg Time (with blockchain)</div>
                                            <div className="text-3xl font-bold text-purple-500">{avgTotalTime} ms</div>
                                        </div>
                                    ) : (
                                        <div className="p-4 border border-border rounded-lg bg-card/40">
                                            <div className="text-lg font-medium mb-2">Average Aim Time</div>
                                            <div className="text-3xl font-bold text-blue-500">{avgTargetTime} ms</div>
                                        </div>
                                    )}
                                </div>

                                {isWeb3Enabled && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                        <div className="p-4 border border-border rounded-lg bg-card/40">
                                            <div className="text-lg font-medium mb-2">Avg Time (without blockchain)</div>
                                            <div className="text-3xl font-bold text-blue-500">{avgTargetTime} ms</div>
                                        </div>
                                        <div className="p-4 border border-border rounded-lg bg-card/40">
                                            <div className="text-lg font-medium mb-2">Blockchain Overhead</div>
                                            <div className="text-3xl font-bold text-red-500">{avgBlockchainTime} ms</div>
                                            <div className="text-sm text-muted-foreground">average per transaction</div>
                                        </div>
                                    </div>
                                )}

                                {isWeb3Enabled && (
                                    <div className="border-t border-border pt-4 mb-4">
                                        <h4 className="font-medium mb-2">
                                            {`${selectedNetwork.name} Testnet Transaction Overhead: ${avgBlockchainTime} ms`}
                                        </h4>
                                        <p className="text-muted-foreground text-sm">
                                            This is how much time the blockchain adds to each target hit.
                                            See how it affects your aim speed!
                                        </p>
                                    </div>
                                )}

                                <div className="mt-6">
                                    <h4 className="font-medium mb-2">Individual Targets</h4>
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-border">
                                                <th className="text-left py-2">Target</th>
                                                <th className="text-right py-2">Aim Time</th>
                                                {isWeb3Enabled && <th className="text-right py-2">Blockchain Time</th>}
                                                {isWeb3Enabled && <th className="text-right py-2">Total Time</th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {results.map((result, index) => (
                                                <tr key={index} className="border-b border-border">
                                                    <td className="py-2">{index + 1}</td>
                                                    <td className="text-right py-2">{result.targetTime} ms</td>
                                                    {isWeb3Enabled && <td className="text-right py-2">{result.blockchainTime} ms</td>}
                                                    {isWeb3Enabled && <td className="text-right py-2">{result.targetTime + result.blockchainTime} ms</td>}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}