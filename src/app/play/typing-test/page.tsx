    // src/app/play/typing-test/page.tsx
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

    // Number of words to test with
    const WORD_COUNT = 20;

    enum GameState {
        IDLE = 'idle',
        PLAYING = 'playing',
        PENDING = 'pending',
        FINISHED = 'finished',
        TRANSACTION_FAILED = 'transaction_failed'
    }

    interface WordResult {
        word: string;
        typedCorrectly: boolean;
        typingTimeMs: number;
        blockchainTimeMs: number;
    }

    export default function TypingTestGame() {
        const { resolvedTheme } = useTheme()
        const { initData, sendUpdate, getPoolStatus, checkBalance } = useBlockchainUtils()

        // Game state
        const [gameState, setGameState] = useState<GameState>(GameState.IDLE)
        const [words, setWords] = useState<string[]>([])
        const [currentIndex, setCurrentIndex] = useState(0)
        const [inputValue, setInputValue] = useState('')
        const [wordResults, setWordResults] = useState<WordResult[]>([])
        const [startTime, setStartTime] = useState(0)
        const [currentWordStartTime, setCurrentWordStartTime] = useState(0)

        // Network state
        const [isWeb3Enabled, setIsWeb3Enabled] = useState<boolean>(true)
        const [selectedNetwork, setSelectedNetwork] = useState<Network>(NETWORKS[0])
        const [showToast, setShowToast] = useState(false)
        const [isInitializing, setIsInitializing] = useState(false)
        const [isMounted, setIsMounted] = useState(false)

        // Refs
        const inputRef = useRef<HTMLInputElement>(null)
        const isDark = isMounted && resolvedTheme === 'dark'
        const { wallets } = useWallets()
        const embeddedWallet = getEmbeddedConnectedWallet(wallets)

        // Fetch random words
        const fetchRandomWords = useCallback(async () => {
            console.log("fetching random words")
            try {
                const response = await fetch(`https://random-word-api.vercel.app/api?words=${WORD_COUNT}`)
                if (!response.ok) throw new Error('Failed to fetch words')
                const data = await response.json()
                return data as string[]
            } catch (error) {
                console.error('Error fetching words:', error)
                // Fallback to some default words if API fails
                return [
                    'react', 'component', 'function', 'variable', 'object',
                    'array', 'string', 'number', 'boolean', 'null',
                    'undefined', 'property', 'method', 'class', 'interface',
                    'type', 'constant', 'arrow', 'async', 'await',
                    'promise', 'fetch', 'response', 'request', 'state',
                    'effect', 'callback', 'memo', 'reducer', 'context'
                ]
            }
        }, [])

        // Initialize network
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

        useEffect(() => {
            setIsMounted(true)
        }, [])

        useEffect(() => {
            if (gameState === GameState.PLAYING && inputRef.current) {
                inputRef.current.focus();
            }
        }, [gameState]);

        // Start game
    // Start game
    const startGame = useCallback(async () => {
        console.log("start game")
        if (isInitializing || gameState !== GameState.IDLE && 
        gameState !== GameState.FINISHED && 
        gameState !== GameState.TRANSACTION_FAILED) return
        
        
        try {
            // Fetch words first before changing any state
            const randomWords = await fetchRandomWords();
            
            // Reset game state all at once after words are fetched
            setWords(randomWords);
            setCurrentIndex(0);
            setInputValue('');
            setWordResults([]);
            setStartTime(Date.now());
            setCurrentWordStartTime(Date.now());
            setGameState(GameState.PLAYING); // Only change to PLAYING once everything is ready
            
            // Focus input
            setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus();
                }
            }, 0);
        } catch (error) {
            console.error("Failed to start game:", error);
            setGameState(GameState.IDLE); // Reset to IDLE if there's an error
        }
    }, [gameState, isInitializing, fetchRandomWords]);
        // Handle input change
        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            if (gameState !== GameState.PLAYING) return

            const value = e.target.value
            setInputValue(value)

            // If space is pressed and there's content before the space, check the word
            if (value.endsWith(' ') && value.trim().length > 0) {
                const typedWord = value.trim()
                const expectedWord = words[currentIndex]
                const isCorrect = typedWord === expectedWord
                const typingTime = Date.now() - currentWordStartTime

                if (isWeb3Enabled && selectedNetwork.id !== 'select') {
                    // Handle blockchain transaction
                    handleWordSubmit(typedWord, isCorrect, typingTime)
                } else {
                    // Skip blockchain, just record result
                    addWordResult(typedWord, isCorrect, typingTime, 0)

                    // Move to next word or finish
                    if (currentIndex + 1 < words.length) {
                        setCurrentIndex(currentIndex + 1)
                        setInputValue('')
                        setCurrentWordStartTime(Date.now())
                    } else {
                        setGameState(GameState.FINISHED)
                    }
                }
            }
        }

        // Handle word submission with blockchain
        const handleWordSubmit = async (typedWord: string, isCorrect: boolean, typingTime: number) => {
            setGameState(GameState.PENDING)
            setShowToast(true)

            try {
                const blockchainTime = await sendUpdate(selectedNetwork.id)

                // Record result
                addWordResult(typedWord, isCorrect, typingTime, blockchainTime)

                // Continue or finish
                if (currentIndex + 1 < words.length) {
                    setGameState(GameState.PLAYING)
                    setCurrentIndex(currentIndex + 1)
                    setInputValue('')
                    setCurrentWordStartTime(Date.now())
                    setShowToast(false)
                } else {
                    setGameState(GameState.FINISHED)
                    setShowToast(false)
                    if (window.refetchBalance) {
                        window.refetchBalance()
                    }
                }
            } catch (error) {
                console.error('Transaction failed:', error)
                setShowToast(false)
                setGameState(GameState.TRANSACTION_FAILED)
            }
        }

        // Add word result to state
        const addWordResult = (
            typedWord: string,
            isCorrect: boolean,
            typingTime: number,
            blockchainTime: number
        ) => {
            const result: WordResult = {
                word: typedWord,
                typedCorrectly: isCorrect,
                typingTimeMs: typingTime,
                blockchainTimeMs: blockchainTime
            }

            setWordResults(prev => [...prev, result])
        }

        // Toggle web3
        const handleToggleWeb3 = (enabled: boolean) => {
            if (gameState === GameState.PENDING || isInitializing) return
            setIsWeb3Enabled(enabled)
        }

        // Network selection
        const handleNetworkSelect = (network: Network) => {
            if (gameState === GameState.PENDING || isInitializing) return
            setSelectedNetwork(network)
            setGameState(GameState.IDLE)
        }

        // Calculate statistics
        const calculateStats = () => {
            if (wordResults.length === 0) return { wpm: 0, accuracy: 0, totalTime: 0, blockchainOverhead: 0 }

            const totalTime = wordResults.reduce(
                (sum, result) => sum + result.typingTimeMs + (isWeb3Enabled ? result.blockchainTimeMs : 0),
                0
            ) / 1000 // in seconds

            const rawTypingTime = wordResults.reduce((sum, result) => sum + result.typingTimeMs, 0) / 1000 // in seconds
            const correctWords = wordResults.filter(result => result.typedCorrectly).length
            const accuracy = (correctWords / wordResults.length) * 100

            // WPM calculation assumes average word is 5 characters
            const totalTypedChars = wordResults.reduce((sum, result) => sum + result.word.length, 0)
            const wpm = Math.round((totalTypedChars / 5) / (totalTime / 60))
            const rawWpm = Math.round((totalTypedChars / 5) / (rawTypingTime / 60))

            const blockchainOverhead = isWeb3Enabled
                ? wordResults.reduce((sum, result) => sum + result.blockchainTimeMs, 0)
                : 0

            return {
                wpm,
                rawWpm,
                accuracy: Math.round(accuracy),
                totalTime: Math.round(totalTime * 1000), // back to ms
                rawTypingTime: Math.round(rawTypingTime * 1000), // back to ms
                blockchainOverhead: Math.round(blockchainOverhead),
                averageBlockchainOverhead: isWeb3Enabled
                    ? Math.round(blockchainOverhead / wordResults.length)
                    : 0
            }
        }

        // Render current word with colored characters based on input
        const renderCurrentWord = () => {
            if (!words.length || currentIndex >= words.length) return null

            const currentWord = words[currentIndex]
            const chars = currentWord.split('')

            return (
                <div className="text-center text-2xl font-mono my-4">
                    {chars.map((char, i) => {
                        const inputChar = inputValue[i] || ''
                        let className = 'text-muted-foreground' // not typed yet

                        if (inputChar) {
                            className = inputChar === char ? 'text-green-500' : 'text-red-500'
                        }

                        return (
                            <span key={i} className={className}>
                                {char}
                            </span>
                        )
                    })}
                </div>
            )
        }

        // Render word list with current position indicator
        const renderWordList = () => {
            return (
                <div className="flex flex-wrap gap-2 mb-6 max-w-2xl mx-auto">
                    {words.map((word, i) => {
                        let className = "px-2 py-1 rounded-md font-mono text-muted-foreground"

                        if (i < currentIndex) {
                            // Completed word
                            const result = wordResults[i]
                            className = result && result.typedCorrectly
                                ? "px-2 py-1 rounded-md font-mono text-green-500/70"
                                : "px-2 py-1 rounded-md font-mono text-red-500/70"
                        } else if (i === currentIndex) {
                            // Current word
                            className = "px-2 py-1 rounded-md font-mono text-foreground bg-secondary/50"
                        }

                        return (
                            <span key={i} className={className}>
                                {word}
                            </span>
                        )
                    })}
                </div>
            )
        }

        // Render progress
        const renderProgress = () => {
            const progress = (currentIndex / words.length) * 100

            return (
                <div className="w-full max-w-2xl mx-auto mb-4">
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                            className="h-full bg-purple-500 transition-all duration-200"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <div className="text-muted-foreground text-sm mt-1">
                        {currentIndex}/{words.length} words completed
                    </div>
                </div>
            )
        }

        // Handle key press events
        const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
            // Allow Tab + Enter to restart the game
            if (e.key === 'Tab' && (gameState === GameState.FINISHED || gameState === GameState.TRANSACTION_FAILED)) {
                e.preventDefault()
                startGame()
            }
        }

        const stats = calculateStats()

        return (
            <div className="flex flex-col items-center min-h-screen">
                {!embeddedWallet ? (
                    <LoginPrompt />
                ) : (
                    <>
                        {showToast && (
                            <div className="fixed top-24 right-6 z-50 bg-card border border-border p-4 rounded-lg shadow-lg animate-in fade-in slide-in-from-right-5">
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
                                className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <ArrowLeft size={20} />
                                <span>Back to Games</span>
                            </Link>
                        </div>

                        <div className="w-full max-w-4xl px-6 md:px-12 pt-24 mb-8">
                            <div className="flex items-center justify-between mb-4">
                                <h1 className="text-3xl md:text-4xl font-bold font-[family-name:var(--font-doom)]">
                                    <span className={isDark ? "text-white" : "text-black"}>TYPING</span>
                                    <span className="text-purple-500 ml-2">TEST</span>
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
                                        Type the words as quickly and accurately as possible - {isWeb3Enabled ? `each word is recorded on ${selectedNetwork.name} Testnet` : 'Web3 mode is disabled'}
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
                                    {gameState === GameState.IDLE && (
                                        <div
                                            className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-purple-500/30 rounded-lg cursor-pointer hover:border-purple-500/50 transition-colors text-center"
                                        >
                                            <h2 className="text-2xl font-bold mb-4">Ready to Test Your Typing Speed?</h2>
                                            <p className="text-muted-foreground mb-6">Click here to start typing {WORD_COUNT} words</p>
                                            <button
                                                className={cn(
                                                    "px-6 py-3 text-white rounded-lg transition-colors",
                                                    isInitializing
                                                        ? "bg-purple-400 cursor-not-allowed"
                                                        : "bg-purple-600 hover:bg-purple-700 hover:cursor-pointer"
                                                )}
                                                onClick={startGame}
                                                disabled={isInitializing}
                                            >
                                                {isInitializing ? "Initializing..." : "Start Typing Test"}
                                            </button>
                                        </div>
                                    )}

                                    {(gameState === GameState.PLAYING || gameState === GameState.PENDING) && (
                                        <div className="border border-border rounded-lg p-6 bg-card/30">
                                            {renderProgress()}

                                            {renderWordList()}

                                            <div className="relative">
                                                {renderCurrentWord()}

                                                <input
                                                    ref={inputRef}
                                                    type="text"
                                                    value={inputValue}
                                                    onChange={handleInputChange}
                                                    onKeyDown={handleKeyPress}
                                                    disabled={gameState === GameState.PENDING}
                                                    className={cn(
                                                        "w-full px-4 py-3 bg-transparent border border-border rounded-lg text-center text-lg font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/50",
                                                        gameState === GameState.PENDING && "opacity-50 cursor-not-allowed"
                                                    )}
                                                    placeholder={gameState === GameState.PENDING ? "Processing..." : "Type here..."}
                                                    autoComplete="off"
                                                    autoCapitalize="off"
                                                    autoCorrect="off"
                                                    spellCheck="false"
                                                />
                                            </div>

                                            <p className="text-center text-sm text-muted-foreground mt-6">
                                                Press SPACE after each word to submit
                                            </p>
                                        </div>
                                    )}

                                    {gameState === GameState.TRANSACTION_FAILED && (
                                        <div className="border border-red-500/30 rounded-lg p-8 bg-red-500/10 text-center">
                                            <h2 className="text-2xl font-bold text-red-500 mb-4">Transaction Failed</h2>
                                            <p className="mb-6">There was an error processing your blockchain transaction. Please check your balance and try again.</p>
                                            <button
                                                className="px-6 py-3 hover:cursor-pointer bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                                onClick={startGame}
                                            >
                                                Try Again
                                            </button>
                                        </div>
                                    )}

                                    {gameState === GameState.FINISHED && (
                                        <div className="border border-border rounded-lg p-8 bg-card/30">
                                            <h2 className="text-2xl font-bold text-center mb-6">Typing Test Results</h2>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                                <div className="p-6 border border-border rounded-lg bg-card/40 flex flex-col items-center justify-center">
                                                    <div className="text-lg font-medium mb-2">Words Per Minute</div>
                                                    {isWeb3Enabled ? (
                                                        <>
                                                            <div className="text-3xl font-bold text-purple-500">{stats.wpm}</div>
                                                            <div className="text-sm text-muted-foreground">(with blockchain)</div>
                                                        </>
                                                    ) : (
                                                        <div className="text-3xl font-bold text-purple-500">{stats.wpm}</div>
                                                    )}
                                                </div>

                                                <div className="p-6 border border-border rounded-lg bg-card/40 flex flex-col items-center justify-center">
                                                    <div className="text-lg font-medium mb-2">Accuracy</div>
                                                    <div className="text-3xl font-bold text-green-500">{stats.accuracy}%</div>
                                                </div>
                                            </div>

                                            {isWeb3Enabled && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                                    <div className="p-6 border border-border rounded-lg bg-card/40 flex flex-col items-center justify-center">
                                                        <div className="text-lg font-medium mb-2">Raw WPM</div>
                                                        <div className="text-3xl font-bold text-blue-500">{stats.rawWpm}</div>
                                                        <div className="text-sm text-muted-foreground">(without blockchain)</div>
                                                    </div>

                                                    <div className="p-6 border border-border rounded-lg bg-card/40 flex flex-col items-center justify-center">
                                                        <div className="text-lg font-medium mb-2">Blockchain Overhead</div>
                                                        <div className="text-3xl font-bold text-red-500">{stats.averageBlockchainOverhead} ms</div>
                                                        <div className="text-sm text-muted-foreground">per word</div>
                                                    </div>
                                                </div>
                                            )}

                                            {isWeb3Enabled && (
                                                <div className="border-t border-border pt-4 mb-8">
                                                    <h4 className="font-medium mb-2">
                                                        {`${selectedNetwork.name} Testnet Blockchain Impact`}
                                                    </h4>
                                                    <p className="text-muted-foreground text-sm">
                                                        Blockchain transactions added {Math.round(stats.blockchainOverhead)} ms of overhead to your typing test.
                                                        This reduced your effective WPM from {stats.rawWpm} to {stats.wpm}.
                                                    </p>
                                                </div>
                                            )}

                                            <div className="border-t border-border pt-4 mb-4">
                                                <h4 className="font-medium mb-2">Word Details</h4>
                                                <div className="max-h-60 overflow-y-auto">
                                                    <table className="w-full">
                                                        <thead>
                                                            <tr className="border-b border-border">
                                                                <th className="text-left py-2">Word</th>
                                                                <th className="text-right py-2">Time</th>
                                                                {isWeb3Enabled && <th className="text-right py-2">Blockchain</th>}
                                                                <th className="text-right py-2">Correct</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {wordResults.map((result, index) => (
                                                                <tr key={index} className="border-b border-border">
                                                                    <td className="py-2">{result.word}</td>
                                                                    <td className="text-right py-2">{Math.round(result.typingTimeMs)} ms</td>
                                                                    {isWeb3Enabled && <td className="text-right py-2">{Math.round(result.blockchainTimeMs)} ms</td>}
                                                                    <td className="text-right py-2">
                                                                        <span className={result.typedCorrectly ? "text-green-500 px-2" : "text-red-500 px-2"}>
                                                                            {result.typedCorrectly ? "✓" : "✗"}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>

                                            <div className="flex justify-center">
                                                <button
                                                    className="px-6 py-3 hover:cursor-pointer bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                                    onClick={startGame}
                                                >
                                                    Try Again
                                                </button>
                                            </div>


                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        );
    }