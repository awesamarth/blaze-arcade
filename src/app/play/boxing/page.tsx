// src/app/play/boxing/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
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

export default function BoxingGame() {
    const { resolvedTheme } = useTheme()
    const { initData, sendUpdate, checkBalance } = useBlockchainUtils()

    const [isWeb3Enabled, setIsWeb3Enabled] = useState<boolean>(true)
    const [selectedNetwork, setSelectedNetwork] = useState<Network>(NETWORKS[0])
    const [showToast, setShowToast] = useState(false)
    const [isInitializing, setIsInitializing] = useState(false)
    const [isMounted, setIsMounted] = useState(false)
    const [score, setScore] = useState(0)
    const [lives, setLives] = useState(5)

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

    useEffect(() => {
        isInitializingRef.current = isInitializing

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
                    await initData(selectedNetwork.id, 15)
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
                const PLAYER_SIZE = 80
                const AI_SIZE = 80

                class BoxingScene extends Phaser.Scene {
                    player: Phaser.GameObjects.Rectangle | null = null
                    ai: Phaser.GameObjects.Rectangle | null = null
                    playerOverlay: Phaser.GameObjects.Rectangle | null = null
                    scoreText: Phaser.GameObjects.Text | null = null
                    livesText: Phaser.GameObjects.Text | null = null
                    blocksText: Phaser.GameObjects.Text | null = null
                    gameOverText: Phaser.GameObjects.Text | null = null
                    startText: Phaser.GameObjects.Text | null = null
                    restartButton: Phaser.GameObjects.Text | null = null
                    telegraphIndicator: Phaser.GameObjects.Rectangle | null = null
                    playerGlove: Phaser.GameObjects.Text | null = null
                    aiGlove: Phaser.GameObjects.Text | null = null
                    playerAnimating: boolean = false
                    aiAnimating: boolean = false
                    gameStarted: boolean = false
                    gameOver: boolean = false
                    playerBlocks: number = 0
                    maxBlocks: number = 3
                    aiAttackSpeed: number = 4000 // Base AI attack interval
                    nextAiAttack: number = 0
                    telegraphTime: number = 500 // 500ms warning
                    showingTelegraph: boolean = false
                    playerFlashTimer: Phaser.Time.TimerEvent | null = null
                    aiFlashTimer: Phaser.Time.TimerEvent | null = null
                    isCurrentlyBlocking: boolean = false
                    blockTimer: Phaser.Time.TimerEvent | null = null

                    constructor() {
                        super({ key: 'BoxingScene' })
                    }

                    create() {
                        // Make canvas focusable
                        this.game.canvas.setAttribute('tabindex', '0')
                        this.game.canvas.style.outline = 'none'
                        this.game.canvas.focus()
                        this.game.canvas.classList.add('focus:outline-none')

                        // Prevent keyboard events from propagating
                        this.input.keyboard?.on('keydown', function (event: any) {
                            event.stopPropagation();
                        });

                        this.createCharacters()
                        this.createUI()
                        this.setupControls()
                        this.updateStartText()
                        this.scheduleNextAiAttack()
                    }

                    createCharacters() {
                        // Player (left side)
                        this.player = this.add.rectangle(
                            GAME_WIDTH / 4,
                            GAME_HEIGHT / 2,
                            PLAYER_SIZE,
                            PLAYER_SIZE * 1.5,
                            0x0066ff // Blue
                        )

                        this.playerGlove = this.add.text(
                            GAME_WIDTH / 4 + 60,
                            GAME_HEIGHT / 2 - 20,
                            '🥊',
                            { fontSize: '32px' }
                        ).setOrigin(0.5).setRotation(Math.PI / 2) // 90° pointing down

                        this.aiGlove = this.add.text(
                            (GAME_WIDTH * 3) / 4 - 60,  // Change from -60 to -30
                            GAME_HEIGHT / 2 - 20,
                            '🥊',
                            { fontSize: '32px' }
                        ).setOrigin(0.5).setRotation(-Math.PI / 2)

                        // Player transaction overlay (hidden initially)
                        this.playerOverlay = this.add.rectangle(
                            GAME_WIDTH / 4,
                            GAME_HEIGHT / 2,
                            PLAYER_SIZE,
                            PLAYER_SIZE * 1.5,
                            0x000000,
                            0.5
                        ).setVisible(false)

                        // AI (right side)
                        this.ai = this.add.rectangle(
                            (GAME_WIDTH * 3) / 4,
                            GAME_HEIGHT / 2,
                            AI_SIZE,
                            AI_SIZE * 1.5,
                            0xff0000 // Red
                        )



                        // Telegraph indicator (hidden initially)
                        this.telegraphIndicator = this.add.rectangle(
                            (GAME_WIDTH * 3) / 4,
                            GAME_HEIGHT / 2 - 100,
                            60,
                            20,
                            0xffff00 // Yellow warning
                        ).setVisible(false)
                    }

                    createUI() {
                        // Score text
                        this.scoreText = this.add.text(10, 10, 'Score: 0', {
                            fontFamily: 'sans-serif',
                            fontSize: '24px',
                            color: '#ffffff',
                            backgroundColor: '#000000',
                            padding: { x: 5, y: 2 }
                        }).setDepth(100)

                        // Lives text
                        this.livesText = this.add.text(10, 40, 'Lives: 5', {
                            fontFamily: 'sans-serif',
                            fontSize: '24px',
                            color: '#ff0000',
                            backgroundColor: '#000000',
                            padding: { x: 5, y: 2 }
                        }).setDepth(100)

                        // Blocks remaining text
                        this.blocksText = this.add.text(10, 70, 'Blocks: 3/3', {
                            fontFamily: 'sans-serif',
                            fontSize: '20px',
                            color: '#00ff00',
                            backgroundColor: '#000000',
                            padding: { x: 5, y: 2 }
                        }).setDepth(100)

                        // Game over text
                        this.gameOverText = this.add.text(
                            GAME_WIDTH / 2,
                            GAME_HEIGHT / 2 - 50,
                            'GAME OVER',
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
                        if (!this.input.keyboard) return;

                        // Attack key (SPACE)
                        const spaceKey = this.input.keyboard.addKey('SPACE');
                        spaceKey.on('down', () => {
                            if (!isInitializingRef.current && !transactionPendingRef.current && !this.playerAnimating) {
                                this.handlePlayerAttack();
                            }
                        });

                        // Block key (SHIFT)
                        const shiftKey = this.input.keyboard.addKey('SHIFT');
                        shiftKey.on('down', () => {
                            if (!isInitializingRef.current && !transactionPendingRef.current && !this.playerAnimating) {
                                this.handlePlayerBlock();
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
                                'SPACE to Attack, SHIFT to Block\nPress any key to start!',
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

                    update(time: number) {
                        if (this.gameOver || !this.gameStarted) return

                        // Update player overlay visibility
                        if (this.playerOverlay) {
                            this.playerOverlay.setVisible(transactionPendingRef.current)
                        }

                        // Handle AI attack timing
                        if (time >= this.nextAiAttack - this.telegraphTime && !this.showingTelegraph) {
                            this.showTelegraph()
                            this.showingTelegraph = true
                        }

                        if (time >= this.nextAiAttack) {
                            this.executeAiAttack()
                            this.scheduleNextAiAttack()
                            this.showingTelegraph = false
                        }
                    }

                    showTelegraph() {
                        if (this.telegraphIndicator) {
                            this.telegraphIndicator.setVisible(true)

                            // Flash the indicator
                            this.tweens.add({
                                targets: this.telegraphIndicator,
                                alpha: { from: 1, to: 0.3 },
                                duration: 100,
                                yoyo: true,
                                repeat: 4
                            })
                        }
                    }

                    hideTelegraph() {
                        if (this.telegraphIndicator) {
                            this.telegraphIndicator.setVisible(false)
                            this.telegraphIndicator.setAlpha(1)
                        }
                    }

                    animatePlayerPunch() {
                        if (this.playerGlove) {
                            this.playerAnimating = true;
                            this.tweens.add({
                                targets: this.playerGlove,
                                x: this.playerGlove.x + 40,
                                duration: 100,
                                yoyo: true,
                                ease: 'Power2',
                                onComplete: () => {
                                    this.playerAnimating = false;
                                }
                            })
                        }
                    }
                    animatePlayerBlock() {
                        if (this.playerGlove) {
                            this.playerAnimating = true;
                            this.tweens.add({
                                targets: this.playerGlove,
                                rotation: 0, // Point up
                                duration: 150,
                                // Remove yoyo: true so it stays in up position
                                ease: 'Power2',
                                onComplete: () => {
                                    this.playerAnimating = false;
                                }
                            })
                        }
                    }

                    animateAiPunch() {
                        if (this.aiGlove) {
                            this.aiAnimating = true;
                            this.tweens.add({
                                targets: this.aiGlove,
                                x: this.aiGlove.x - 40,
                                duration: 100,
                                yoyo: true,
                                ease: 'Power2',
                                onComplete: () => {
                                    this.aiAnimating = false;
                                }
                            })
                        }
                    }

                    scheduleNextAiAttack() {
                        const variation = Phaser.Math.Between(-500, 500)
                        this.nextAiAttack = this.time.now + this.aiAttackSpeed + variation
                    }

                    executeAiAttack() {
                        this.hideTelegraph()

                        if (!this.aiAnimating) {
                            this.animateAiPunch()
                        }

                        // Check if player is currently blocking (not stored blocks)
                        if (this.isCurrentlyBlocking && !transactionPendingRef.current) {
                            // Player successfully blocked
                            this.flashPlayer(0x00ff00)
                            this.endBlockWindow() // End the block window after successful block
                            // Don't decrement blocks here - they're consumed by the block window ending
                        } else {
                            // Player got hit
                            this.playerHit()
                        }
                    }

                    handlePlayerAttack() {
                        if (!this.gameStarted) {
                            this.startGame()
                            return
                        }

                        if (isWeb3Enabled && selectedNetwork.id !== 'select') {
                            transactionPendingRef.current = true
                            setShowToast(true)

                            sendUpdate(selectedNetwork.id)
                                .then(() => {
                                    // Attack successful
                                    this.playerAttackSuccess()
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
                            // Web3 disabled - immediate attack
                            this.playerAttackSuccess()
                        }
                    }

                    startBlockWindow() {
                        this.isCurrentlyBlocking = true
                        this.playerBlocks++
                        this.updateBlocksText()
                        this.animatePlayerBlock() // This will rotate glove up

                        // Clear existing block timer
                        if (this.blockTimer) {
                            this.blockTimer.remove()
                        }

                        // Set 500ms block window
                        this.blockTimer = this.time.delayedCall(500, () => {
                            this.endBlockWindow()
                        })
                    }

                    endBlockWindow() {
                        this.isCurrentlyBlocking = false
                        this.blockTimer = null

                        // Rotate glove back to original position
                        if (this.playerGlove) {
                            this.tweens.add({
                                targets: this.playerGlove,
                                rotation: Math.PI / 2, // Back to pointing right
                                duration: 100,
                                ease: 'Power2'
                            })
                        }
                    }

                    handlePlayerBlock() {
                        if (!this.gameStarted) {
                            this.startGame()
                            return
                        }

                        // Don't allow blocking if already blocking or at max blocks
                        if (this.isCurrentlyBlocking || this.playerBlocks >= this.maxBlocks) {
                            return
                        }

                        if (isWeb3Enabled && selectedNetwork.id !== 'select') {
                            transactionPendingRef.current = true
                            setShowToast(true)

                            sendUpdate(selectedNetwork.id)
                                .then(() => {
                                    // Block successful
                                    this.flashPlayer(0x0066ff) // Blue flash for block
                                    this.startBlockWindow() // This handles the increment and animation
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
                            // Web3 disabled - immediate block
                            this.flashPlayer(0x0066ff)
                            this.startBlockWindow() // This handles the increment and animation
                        }
                    }

                    playerAttackSuccess() {
                        // Flash AI red (got hit)
                        this.animatePlayerPunch()
                        this.flashAI(0xff6666)

                        // Increase score
                        setScore(prevScore => {
                            const newScore = prevScore + 1
                            if (this.scoreText) {
                                this.scoreText.setText(`Score: ${newScore}`)
                            }

                            // Make AI more aggressive
                            this.aiAttackSpeed = Math.max(1200, this.aiAttackSpeed - 50)

                            return newScore
                        })

                        // Reset player blocks
                        this.playerBlocks = 0
                        this.updateBlocksText()
                    }

                    playerHit() {
                        this.flashPlayer(0xff0000) // Red flash for getting hit

                        setLives(prevLives => {
                            const newLives = prevLives - 1
                            if (this.livesText) {
                                this.livesText.setText(`Lives: ${newLives}`)
                            }

                            if (newLives <= 0) {
                                this.handleGameOver()
                            }

                            return newLives
                        })
                    }

                    flashPlayer(color: number) {
                        if (this.player) {
                            const originalColor = 0x0066ff // Store the actual blue color instead of reading fillColor
                            this.player.setFillStyle(color)

                            // Clear any existing flash timers first
                            if (this.playerFlashTimer) {
                                this.playerFlashTimer.remove()
                            }

                            this.playerFlashTimer = this.time.delayedCall(200, () => {
                                if (this.player) {
                                    this.player.setFillStyle(originalColor)
                                }
                                this.playerFlashTimer = null
                            })
                        }
                    }

                    flashAI(color: number) {
                        if (this.ai) {
                            const originalColor = 0xff0000 // Store the actual red color instead of reading fillColor
                            this.ai.setFillStyle(color)

                            // Clear any existing flash timers first
                            if (this.aiFlashTimer) {
                                this.aiFlashTimer.remove()
                            }

                            this.aiFlashTimer = this.time.delayedCall(200, () => {
                                if (this.ai) {
                                    this.ai.setFillStyle(originalColor)
                                }
                                this.aiFlashTimer = null
                            })
                        }
                    }

                    updateBlocksText() {
                        if (this.blocksText) {
                            const remaining = this.maxBlocks - this.playerBlocks
                            this.blocksText.setText(`Blocks: ${remaining}/${this.maxBlocks}`)

                            // Change color based on remaining blocks
                            if (remaining === 0) {
                                this.blocksText.setStyle({ color: '#ff0000' }) // Red when no blocks left
                            } else if (remaining === 1) {
                                this.blocksText.setStyle({ color: '#ffff00' }) // Yellow when 1 left
                            } else {
                                this.blocksText.setStyle({ color: '#00ff00' }) // Green when 2+ left
                            }
                        }
                    }

                    startGame() {
                        this.gameStarted = true
                        if (this.startText) {
                            this.startText.setVisible(false)
                        }
                        this.scheduleNextAiAttack()
                    }

                    handleGameOver() {
                        this.gameOver = true

                        if (this.gameOverText) {
                            this.gameOverText.setVisible(true)
                        }

                        if (this.restartButton) {
                            this.restartButton.setVisible(true)
                        }

                        this.hideTelegraph()

                        if (window.refetchBalance) {
                            window.refetchBalance()
                        }
                    }

                    restartGame() {
                        this.gameOver = false
                        this.gameStarted = false
                        this.playerBlocks = 0
                        this.aiAttackSpeed = 4000
                        this.showingTelegraph = false

                        this.isCurrentlyBlocking = false
                        if (this.blockTimer) {
                            this.blockTimer.remove()
                            this.blockTimer = null
                        }

                        // Reset game state
                        setScore(0)
                        setLives(5)

                        // Update UI
                        if (this.scoreText) {
                            this.scoreText.setText('Score: 0')
                        }
                        if (this.livesText) {
                            this.livesText.setText('Lives: 5')
                        }
                        this.updateBlocksText()

                        // Hide game over UI
                        if (this.gameOverText) {
                            this.gameOverText.setVisible(false)
                        }
                        if (this.restartButton) {
                            this.restartButton.setVisible(false)
                        }

                        this.hideTelegraph()
                        this.updateStartText()
                        if (this.startText) {
                            this.startText.setVisible(true)
                        }
                    }
                }

                const config = {
                    type: Phaser.AUTO,
                    width: GAME_WIDTH,
                    height: GAME_HEIGHT,
                    parent: gameRef.current,
                    backgroundColor: '#222222',
                    scene: BoxingScene
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
        setLives(5)
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
                                <span className="text-red-600 ">BOXING</span>
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
                                    SPACE to attack, SHIFT to block - {isWeb3Enabled ? `every action is recorded on ${selectedNetwork.name} Testnet` : 'Web3 mode is disabled'}
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
                                        <span className="text-lg font-medium mr-2">Lives:</span>
                                        <span className="text-xl font-bold text-red-500">{lives}</span>
                                    </div>
                                </div>

                                <div className="flex justify-center w-full">
                                    <div
                                        ref={gameRef}
                                        className="w-full max-w-[800px] rounded-lg overflow-hidden border border-border mb-4"
                                    />
                                </div>

                                {/* Controls display */}
                                <div className="flex justify-center gap-4 mb-4">
                                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 border border-blue-500/50 rounded">
                                        <span className="font-mono font-bold">SPACE</span>
                                        <span>Attack</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/50 rounded">
                                        <span className="font-mono font-bold">SHIFT</span>
                                        <span>Block</span>
                                    </div>
                                </div>

                                {/* Game instructions */}
                                <div className="mt-4 p-4 border border-border rounded-lg bg-card/30">
                                    <h3 className="font-medium mb-2">How to Play:</h3>
                                    <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                                        <li>You (blue fighter) vs AI (red fighter)</li>
                                        <li>Press SPACE to attack, SHIFT to block</li>
                                        <li>Yellow warning appears 500ms before AI attacks</li>
                                        <li>Max 3 blocks in a row - you must attack to reset your blocks</li>
                                        <li>Each successful attack gives you 1 point and makes AI faster</li>
                                        <li>You have 5 lives - AI hits reduce your lives</li>
                                        {isWeb3Enabled && <li className="text-orange-400">Dark overlay on your character = transaction pending, no actions possible!</li>}
                                        {isWeb3Enabled && <li className="text-red-400">Slow L2s will cause you to miss block windows!</li>}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}