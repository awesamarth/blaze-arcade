// src/app/play/guitar-hero/page.tsx
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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
import { ChoppyModal } from '@/components/ChoppyModal'

export default function GuitarHeroGame() {
    const { resolvedTheme } = useTheme()
    const { initData, sendUpdate, checkBalance } = useBlockchainUtils()

    const [isWeb3Enabled, setIsWeb3Enabled] = useState<boolean>(true)
    const [selectedNetwork, setSelectedNetwork] = useState<Network>(NETWORKS[0])
    const [showToast, setShowToast] = useState(false)
    const [isInitializing, setIsInitializing] = useState(false)
    const [isMounted, setIsMounted] = useState(false)
    const [score, setScore] = useState(0)
    const [mistakes, setMistakes] = useState(0)
    const [showChoppyModal, setShowChoppyModal] = useState(false)
    const [gameOver, setGameOver] = useState(false)

    const gameRef = useRef<HTMLDivElement>(null)
    const gameInstanceRef = useRef<any>(null)
    const transactionPendingRef = useRef<boolean>(false)
    const isInitializingRef = useRef(false)

    const isDark = isMounted && resolvedTheme === 'dark'
    const { wallets } = useWallets()
    const embeddedWallet = getEmbeddedConnectedWallet(wallets)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    // Show ChoppyModal when game ends with Web3 enabled (once per session)
    useEffect(() => {
        if (gameOver && isWeb3Enabled && selectedNetwork.id !== 'select') {
            const hasSeenModal = sessionStorage.getItem('hasSeenChoppyModal')
            if (!hasSeenModal) {
                setShowChoppyModal(true)
                sessionStorage.setItem('hasSeenChoppyModal', 'true')
            }
        }
    }, [gameOver, isWeb3Enabled, selectedNetwork.id])

    useEffect(() => {
        isInitializingRef.current = isInitializing

        // Update game start text when initialization status changes
        if (gameInstanceRef.current && gameInstanceRef.current.scene.scenes[0]) {
            const scene = gameInstanceRef.current.scene.scenes[0];
            if (scene.updateStartText) {
                scene.updateStartText();
            }
        }
    }, [isInitializing])

    // Initialize blockchain for the selected network
    useEffect(() => {
        const initializeNetwork = async () => {
            if (isWeb3Enabled && selectedNetwork && selectedNetwork.id !== 'select' && embeddedWallet?.address) {
                setIsInitializing(true)
                try {
                    await initData(selectedNetwork.id, 20)
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

    // Initialize Phaser game
    useEffect(() => {
        if (!gameRef.current || !isMounted || (isWeb3Enabled && selectedNetwork.id === 'select')) return

        if (gameInstanceRef.current) {
            gameInstanceRef.current.destroy(true)
            gameInstanceRef.current = null
        }

        const initPhaser = async () => {
            try {
                const Phaser = (await import('phaser')).default

                // Game constants
                const GAME_WIDTH = 800
                const GAME_HEIGHT = 600
                const LANE_WIDTH = GAME_WIDTH / 4
                const NOTE_HEIGHT = 40
                const HIT_ZONE_HEIGHT = 80
                const NOTE_SPEED = 200 // pixels per second

                // Colors for lanes (RGBY)
                const LANE_COLORS = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00]

                let NOTE_PATTERN: Array<{ lane: number, time: number }> = []





                class GuitarHeroScene extends Phaser.Scene {
                    notes: Array<{ sprite: Phaser.GameObjects.Rectangle, lane: number, id: number }> = []
                    hitZones: Phaser.GameObjects.Rectangle[] = []
                    laneLines: Phaser.GameObjects.Rectangle[] = []
                    scoreText: Phaser.GameObjects.Text | null = null
                    mistakesText: Phaser.GameObjects.Text | null = null
                    gameOverText: Phaser.GameObjects.Text | null = null
                    startText: Phaser.GameObjects.Text | null = null
                    restartButton: Phaser.GameObjects.Text | null = null
                    pendingText: Phaser.GameObjects.Text | null = null
                    currentNoteSpeed: number = 130
                    successfulHits: number = 0
                    lastNoteSpawnTime: number = 0
                    lastLane: number = -1
                    baseSpawnInterval: number = 1.0


                    gameStarted: boolean = false
                    gameOver: boolean = false
                    patternTime: number = 0
                    nextNoteId: number = 0
                    patternLoopDuration: number = 6 // seconds

                    constructor() {
                        super({ key: 'GuitarHeroScene' })


                    }

                    create() {
                        // Make canvas focusable
                        this.game.canvas.setAttribute('tabindex', '0')
                        this.game.canvas.style.outline = 'none'
                        this.game.canvas.focus()
                        this.game.canvas.classList.add('focus:outline-none')

                        // Prevent keyboard events from propagating to other UI elements
                        this.input.keyboard?.on('keydown', function (event: any) {
                            event.stopPropagation();
                        });

                        // Create visual elements
                        this.createLanes()
                        this.createHitZones()
                        this.createUI()
                        this.setupControls()

                        this.updateStartText()
                    }

                    createLanes() {
                        // Create lane dividers
                        for (let i = 1; i < 4; i++) {
                            const line = this.add.rectangle(
                                i * LANE_WIDTH,
                                GAME_HEIGHT / 2,
                                2,
                                GAME_HEIGHT,
                                0x666666
                            )
                            this.laneLines.push(line)
                        }
                    }

                    createHitZones() {
                        // Create hit zones at the bottom of each lane
                        for (let i = 0; i < 4; i++) {
                            const hitZone = this.add.rectangle(
                                i * LANE_WIDTH + LANE_WIDTH / 2,
                                GAME_HEIGHT - HIT_ZONE_HEIGHT / 2,
                                LANE_WIDTH - 4,
                                HIT_ZONE_HEIGHT,
                                LANE_COLORS[i],
                                0.3
                            )
                            this.hitZones.push(hitZone)
                        }
                    }

                    createUI() {
                        // Score text with high depth to stay on top
                        this.scoreText = this.add.text(10, 10, 'Score: 0', {
                            fontFamily: 'sans-serif',
                            fontSize: '24px',
                            color: '#ffffff',
                            backgroundColor: '#000000',
                            padding: { x: 5, y: 2 }
                        }).setDepth(100)

                        // Mistakes text with high depth to stay on top
                        this.mistakesText = this.add.text(10, 40, 'Mistakes: 0/10', {
                            fontFamily: 'sans-serif',
                            fontSize: '24px',
                            color: '#ff0000',
                            backgroundColor: '#000000',
                            padding: { x: 5, y: 2 }
                        }).setDepth(100)

                        // Pending transaction text
                        this.pendingText = this.add.text(
                            GAME_WIDTH / 2,
                            100,
                            'TRANSACTION PENDING - INPUTS LOCKED',
                            {
                                fontFamily: 'sans-serif',
                                fontSize: '20px',
                                color: '#ff8800',
                                backgroundColor: '#000000',
                                padding: { x: 10, y: 5 }
                            }
                        ).setOrigin(0.5).setVisible(false).setDepth(50)

                        // Game over text
                        this.gameOverText = this.add.text(
                            GAME_WIDTH / 2,
                            GAME_HEIGHT / 2 - 50,
                            'GAME OVER\n10 MISTAKES REACHED',
                            {
                                fontFamily: 'sans-serif',
                                fontSize: '32px',
                                color: '#ffffff',
                                align: 'center'
                            }
                        ).setOrigin(0.5).setVisible(false).setDepth(200)

                        // Restart button
                        this.restartButton = this.add.text(
                            GAME_WIDTH / 2,
                            GAME_HEIGHT / 2 + 50,
                            'Play Again',
                            {
                                fontFamily: 'sans-serif',
                                fontSize: '24px',
                                color: '#ffffff',
                                backgroundColor: '#10B981',
                                padding: { x: 20, y: 10 }
                            }
                        ).setOrigin(0.5)
                            .setInteractive({ useHandCursor: true })
                            .on('pointerdown', () => this.restartGame())
                            .setVisible(false)
                            .setDepth(200)
                    }

                    setupControls() {
                        // Setup keyboard controls with null check
                        if (!this.input.keyboard) return;

                        // Create key objects for both sets of keys
                        const aKey = this.input.keyboard.addKey('A');
                        const sKey = this.input.keyboard.addKey('S');
                        const dKey = this.input.keyboard.addKey('D');
                        const fKey = this.input.keyboard.addKey('F');

                        const hKey = this.input.keyboard.addKey('H');
                        const jKey = this.input.keyboard.addKey('J');
                        const kKey = this.input.keyboard.addKey('K');
                        const lKey = this.input.keyboard.addKey('L');

                        // Handle key presses - lane 0 (Red)
                        aKey.on('down', () => {
                            if (!isInitializingRef.current && !transactionPendingRef.current) {
                                this.handleKeyPress(0);
                            }
                        });
                        hKey.on('down', () => {
                            if (!isInitializingRef.current && !transactionPendingRef.current) {
                                this.handleKeyPress(0);
                            }
                        });

                        // Handle key presses - lane 1 (Green)
                        sKey.on('down', () => {
                            if (!isInitializingRef.current && !transactionPendingRef.current) {
                                this.handleKeyPress(1);
                            }
                        });
                        jKey.on('down', () => {
                            if (!isInitializingRef.current && !transactionPendingRef.current) {
                                this.handleKeyPress(1);
                            }
                        });

                        // Handle key presses - lane 2 (Blue)
                        dKey.on('down', () => {
                            if (!isInitializingRef.current && !transactionPendingRef.current) {
                                this.handleKeyPress(2);
                            }
                        });
                        kKey.on('down', () => {
                            if (!isInitializingRef.current && !transactionPendingRef.current) {
                                this.handleKeyPress(2);
                            }
                        });

                        // Handle key presses - lane 3 (Yellow)
                        fKey.on('down', () => {
                            if (!isInitializingRef.current && !transactionPendingRef.current) {
                                this.handleKeyPress(3);
                            }
                        });
                        lKey.on('down', () => {
                            if (!isInitializingRef.current && !transactionPendingRef.current) {
                                this.handleKeyPress(3);
                            }
                        });
                    }

                    updateStartText() {
                        if (this.startText) {
                            this.startText.destroy()
                        }

                        if (isInitializingRef.current) {
                            this.startText = this.add.text(
                                GAME_WIDTH / 2,
                                GAME_HEIGHT / 2,
                                'Initializing...',
                                {
                                    fontFamily: 'sans-serif',
                                    fontSize: '20px',
                                    color: '#9CA3AF',
                                    backgroundColor: '#000000',
                                    padding: { x: 10, y: 5 }
                                }
                            ).setOrigin(0.5).setDepth(100)
                        } else {
                            this.startText = this.add.text(
                                GAME_WIDTH / 2,
                                GAME_HEIGHT / 2,
                                'Press A/H, S/J, D/K, F/L to start\nHit the notes as they reach the bottom!',
                                {
                                    fontFamily: 'sans-serif',
                                    fontSize: '20px',
                                    color: '#00ff00',
                                    backgroundColor: '#000000',
                                    padding: { x: 10, y: 5 },
                                    align: 'center'
                                }
                            ).setOrigin(0.5).setDepth(100)
                        }
                    }

                    update(time: number, delta: number) {
                        if (this.gameOver || !this.gameStarted) return

                        // Update pattern time
                        this.patternTime += delta / 1000

                        // Spawn notes based on pattern
                        this.spawnNotes()

                        // Update note positions
                        this.updateNotes(delta)

                        // Update pending text visibility
                        if (this.pendingText) {
                            this.pendingText.setVisible(transactionPendingRef.current)
                        }
                    }

                    // In the GuitarHeroScene class, replace the spawnNotes() method:
                    spawnNotes() {
                        // Use the dynamic base interval that decreases with hits
                        const variation = 0.4
                        const lastSpawnTime = this.lastNoteSpawnTime || 0

                        if (this.patternTime - lastSpawnTime >= this.baseSpawnInterval + (Math.random() - 0.5) * variation) {
                            // Ensure good lane distribution
                            let lane
                            do {
                                lane = Math.floor(Math.random() * 4)
                            } while (this.lastLane === lane && Math.random() < 0.6)

                            this.createNote(lane)
                            this.lastNoteSpawnTime = this.patternTime
                            this.lastLane = lane
                        }
                    }

                    createNote(lane: number) {
                        const note = this.add.rectangle(
                            lane * LANE_WIDTH + LANE_WIDTH / 2,
                            -NOTE_HEIGHT / 2,
                            LANE_WIDTH - 8,
                            NOTE_HEIGHT,
                            LANE_COLORS[lane]
                        ).setDepth(10) // Notes have lower depth than UI

                        this.notes.push({
                            sprite: note,
                            lane: lane,
                            id: this.nextNoteId++
                        })
                    }

                    updateNotes(delta: number) {
                        const moveDistance = (this.currentNoteSpeed * delta) / 1000 // Use currentNoteSpeed instead of NOTE_SPEED

                        for (let i = this.notes.length - 1; i >= 0; i--) {
                            const note = this.notes[i]
                            note.sprite.y += moveDistance

                            // Check if note passed the hit zone (missed)
                            if (note.sprite.y > GAME_HEIGHT + NOTE_HEIGHT) {
                                this.makeMistake(i, true)
                            }
                        }
                    }

                    handleKeyPress(lane: number) {

                        if (this.gameOver) {
                            return; // Don't process any inputs if game is over
                        }

                        if (!this.gameStarted) {
                            this.startGame()
                            return
                        }

                        // Find the closest note in this lane that's in hit zone
                        const hitZoneTop = GAME_HEIGHT - HIT_ZONE_HEIGHT - NOTE_HEIGHT / 2
                        const hitZoneBottom = GAME_HEIGHT + NOTE_HEIGHT / 2

                        let closestNote = null
                        let closestDistance = Infinity

                        for (let i = 0; i < this.notes.length; i++) {
                            const note = this.notes[i]
                            if (note.lane === lane &&
                                note.sprite.y >= hitZoneTop &&
                                note.sprite.y <= hitZoneBottom) {
                                const distance = Math.abs(note.sprite.y - (GAME_HEIGHT - HIT_ZONE_HEIGHT / 2))
                                if (distance < closestDistance) {
                                    closestDistance = distance
                                    closestNote = { note, index: i }
                                }
                            }
                        }

                        if (closestNote) {
                            this.hitNote(closestNote.index)
                        } else {
                            // Wrong hit - no note in hit zone for this lane
                            this.makeMistake(-1, false) // -1 indicates wrong hit, false indicates not a missed note
                        }
                    }

                    hitNote(noteIndex: number) {
                        const note = this.notes[noteIndex]

                        // Remove the note immediately when hit (before transaction)
                        note.sprite.destroy()
                        this.notes.splice(noteIndex, 1)
                        this.flashHitZone(note.lane)

                        this.successfulHits++
                        if (this.successfulHits % 5 === 0) {
                            this.currentNoteSpeed *= 1.2
                            this.baseSpawnInterval = Math.max(this.baseSpawnInterval * 0.95, 0.3) // Reduce by 5%, minimum 0.3s

                            console.log(`Speed increased to: ${this.currentNoteSpeed.toFixed(1)}`)
                        }

                        if (isWeb3Enabled && selectedNetwork.id !== 'select') {
                            // Set transaction pending
                            transactionPendingRef.current = true
                            setShowToast(true)

                            // Send blockchain transaction
                            sendUpdate(selectedNetwork.id)
                                .then(() => {
                                    // Transaction successful - just update score
                                    setScore(prevScore => {
                                        const newScore = prevScore + 1
                                        // Update the in-game score text
                                        if (this.scoreText) {
                                            this.scoreText.setText(`Score: ${newScore}`)
                                        }
                                        return newScore
                                    })

                                    transactionPendingRef.current = false
                                    setShowToast(false)
                                })
                                .catch((error) => {
                                    console.error('Transaction error:', error)
                                    transactionPendingRef.current = false
                                    setShowToast(false)
                                    this.handleGameOver()
                                })
                        } else {
                            // Web3 disabled - immediate score update
                            setScore(prevScore => {
                                const newScore = prevScore + 1
                                if (this.scoreText) {
                                    this.scoreText.setText(`Score: ${newScore}`)
                                }
                                return newScore
                            })
                        }
                    }

                    flashHitZone(lane: number) {
                        const hitZone = this.hitZones[lane]
                        hitZone.setAlpha(1)
                        this.tweens.add({
                            targets: hitZone,
                            alpha: 0.3,
                            duration: 200,
                            ease: 'Power2'
                        })
                    }

                    makeMistake(noteIndex: number, isMissedNote: boolean) {
                        // Remove note if it was a missed note
                        if (isMissedNote && noteIndex >= 0) {
                            const note = this.notes[noteIndex]
                            note.sprite.destroy()
                            this.notes.splice(noteIndex, 1)
                        }

                        setMistakes(prevMistakes => {
                            const newMistakes = Math.min(prevMistakes + 1, 10) // Cap at 10
                            // Update the in-game mistakes text
                            if (this.mistakesText) {
                                this.mistakesText.setText(`Mistakes: ${newMistakes}/10`)
                            }

                            // Check for game over
                            if (newMistakes >= 10) {
                                this.handleGameOver()
                            }

                            return newMistakes
                        })
                    }
                    startGame() {
                        this.gameStarted = true
                        if (this.startText) {
                            this.startText.setVisible(false)
                        }
                        this.patternTime = 0
                    }

                    handleGameOver() {
                        this.gameOver = true
                        setGameOver(true) // Add this line to update React state

                        if (this.gameOverText) {
                            this.gameOverText.setVisible(true)
                        }

                        if (this.restartButton) {
                            this.restartButton.setVisible(true)
                        }

                        if (window.refetchBalance) {
                            window.refetchBalance()
                        }
                    }

                    restartGame() {
                        this.gameOver = false
                        this.gameStarted = false
                        this.currentNoteSpeed = 130
                        this.successfulHits = 0
                        setGameOver(false) // Add this line to update React state

                        // Clear all notes
                        this.notes.forEach(note => note.sprite.destroy())
                        this.notes = []

                        // Reset game state
                        setScore(0)
                        setMistakes(0)
                        this.patternTime = 0
                        this.nextNoteId = 0

                        // Reset new random spawning properties
                        this.lastNoteSpawnTime = 0
                        this.lastLane = -1
                        this.baseSpawnInterval = 1.0

                        // Update UI
                        if (this.scoreText) {
                            this.scoreText.setText('Score: 0')
                        }
                        if (this.mistakesText) {
                            this.mistakesText.setText('Mistakes: 0/10')
                        }

                        // Hide game over UI first, then show start text
                        if (this.gameOverText) {
                            this.gameOverText.setVisible(false)
                        }
                        if (this.restartButton) {
                            this.restartButton.setVisible(false)
                        }

                        // Force update the start text with proper depth
                        this.updateStartText()
                        if (this.startText) {
                            this.startText.setVisible(true)
                            this.startText.setDepth(300)
                        }
                    }
                }

                const config = {
                    type: Phaser.AUTO,
                    width: GAME_WIDTH,
                    height: GAME_HEIGHT,
                    parent: gameRef.current,
                    backgroundColor: '#222222',
                    scene: GuitarHeroScene
                }

                const game = new Phaser.Game(config)
                gameInstanceRef.current = game

            } catch (err) {
                console.error('Error loading Phaser:', err)
            }
        }

        initPhaser()

        return () => {
            if (gameInstanceRef.current) {
                gameInstanceRef.current.destroy(true)
                gameInstanceRef.current = null
            }
        }
    }, [isMounted, isWeb3Enabled, selectedNetwork.id])

    useEffect(() => {
        // Reset game state when Web3 setting or network changes
        setScore(0)
        setMistakes(0)
    }, [isWeb3Enabled, selectedNetwork.id])

    const handleToggleWeb3 = (enabled: boolean) => {
        if (transactionPendingRef.current) return
        setIsWeb3Enabled(enabled)
    }

    const handleNetworkSelect = (network: Network) => {
        if (transactionPendingRef.current) return
        setSelectedNetwork(network)
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
                                <span className={isDark ? "text-white" : "text-black"}>GUITAR</span>
                                <span className="text-purple-400 ml-2">HERO</span>
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
                                    Hit the notes with A/H, S/J, D/K, F/L keys - {isWeb3Enabled ? `every hit is recorded on ${selectedNetwork.name} Testnet` : 'Web3 mode is disabled'}
                                </p>
                            </div>
                        )}

                        {isWeb3Enabled && selectedNetwork.id === 'select' && (
                            <div className="mb-6">
                                <NetworkPrompt />
                            </div>
                        )}

                        {/* Game container */}
                        {(!isWeb3Enabled || selectedNetwork.id !== 'select') && (
                            <div className="w-full mb-8">
                                <div className="flex justify-center items-center gap-8 mb-4">
                                    <div className="px-6 py-2 bg-card border border-border rounded-lg">
                                        <span className="text-lg font-medium mr-2">Score:</span>
                                        <span className="text-xl font-bold text-green-500">{score}</span>
                                    </div>
                                    <div className="px-6 py-2 bg-card border border-border rounded-lg">
                                        <span className="text-lg font-medium mr-2">Mistakes:</span>
                                        <span className="text-xl font-bold text-red-500">{mistakes}/10</span>
                                    </div>
                                </div>

                                <div className="flex justify-center w-full">
                                    <div
                                        ref={gameRef}
                                        className="w-full max-w-[800px] rounded-lg overflow-hidden border border-border mb-4"
                                    />
                                </div>

                                {/* Key mapping display */}
                                <div className="flex justify-center gap-4 mb-4">
                                    <div className="flex items-center gap-2 px-3 py-2 bg-red-500/20 border border-red-500/50 rounded">
                                        <div className="w-4 h-4 bg-red-500 rounded"></div>
                                        <span className="font-mono font-bold">A / H</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-2 bg-green-500/20 border border-green-500/50 rounded">
                                        <div className="w-4 h-4 bg-green-500 rounded"></div>
                                        <span className="font-mono font-bold">S / J</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/20 border border-blue-500/50 rounded">
                                        <div className="w-4 h-4 bg-blue-500 rounded"></div>
                                        <span className="font-mono font-bold">D / K</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/20 border border-yellow-500/50 rounded">
                                        <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                                        <span className="font-mono font-bold">F / L</span>
                                    </div>
                                </div>

                                {/* Game instructions */}
                                <div className="mt-4 p-4 border border-border rounded-lg bg-card/30">
                                    <h3 className="font-medium mb-2">How to Play:</h3>
                                    <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                                        <li>Notes fall down in 4 colored lanes (Red, Green, Blue, Yellow)</li>
                                        <li>Press A/H, S/J, D/K, F/L keys when notes reach the bottom hit zones</li>
                                        <li>Each successful hit triggers a blockchain transaction and scores 1 point</li>
                                        <li className="text-orange-400">Wrong hits (pressing when no note is there) count as mistakes!</li>
                                        {isWeb3Enabled && <li className="text-orange-400">While transactions are confirming, all inputs are locked!</li>}
                                        <li>Make 10 mistakes and the game ends</li>
                                        <li className="text-red-400">Slow chains will cause notes to pass by during transaction confirmation = automatic mistakes!</li>
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>

                    <ChoppyModal
                        isOpen={showChoppyModal}
                        onClose={() => setShowChoppyModal(false)}
                        onTurnOffWeb3={() => {
                            handleToggleWeb3(false);
                            setShowChoppyModal(false);
                        }}
                        networkName={selectedNetwork.name}
                    />
                </>
            )}
        </div>
    )
}