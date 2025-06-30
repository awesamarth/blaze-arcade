// src/app/play/snake/page.tsx
//@ts-nocheck
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

export default function SnakeGame() {
    const { resolvedTheme } = useTheme()
    const { initData, sendUpdate, checkBalance } = useBlockchainUtils()

    const [isWeb3Enabled, setIsWeb3Enabled] = useState<boolean>(true)
    const [selectedNetwork, setSelectedNetwork] = useState<Network>(NETWORKS[0])
    const [showToast, setShowToast] = useState(false)
    const [isInitializing, setIsInitializing] = useState(false)
    const [isMounted, setIsMounted] = useState(false)
    const [score, setScore] = useState(0)
    const [showChoppyModal, setShowChoppyModal] = useState(false)
    const [gameOver, setGameOver] = useState(false)

    const gameRef = useRef<HTMLDivElement>(null)
    const gameInstanceRef = useRef<any>(null)
    const transactionPendingRef = useRef<boolean>(false)
    const pendingDirectionRef = useRef<string | null>(null)
    const currentDirectionRef = useRef<string | null>(null)

    const isDark = isMounted && resolvedTheme === 'dark'
    const { wallets } = useWallets()
    const embeddedWallet = getEmbeddedConnectedWallet(wallets)
    const isInitializingRef = useRef(false);


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
        isInitializingRef.current = isInitializing;

        // Update game start text when initialization status changes
        if (gameInstanceRef.current && gameInstanceRef.current.scene.scenes[0]) {
            const scene = gameInstanceRef.current.scene.scenes[0];
            if (scene.updateStartText) {
                scene.updateStartText();
            }
        }
    }, [isInitializing]);

    // Initialize blockchain for the selected network
    useEffect(() => {
        const initializeNetwork = async () => {
            if (isWeb3Enabled && selectedNetwork && selectedNetwork.id !== 'select' && embeddedWallet?.address) {
                setIsInitializing(true)
                try {
                    await initData(selectedNetwork.id, 20) // Pre-sign more transactions for snake as it needs more
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

        // If game instance exists, destroy it before creating a new one
        if (gameInstanceRef.current) {
            gameInstanceRef.current.destroy(true)
            gameInstanceRef.current = null
        }

        const initPhaser = async () => {
            try {
                // Import Phaser only on client-side
                const Phaser = (await import('phaser')).default

                // Game constants
                const GRID_SIZE = 20 // Keep this the same for consistent visuals
                const GRID_WIDTH = 40 // Increase from 30 to 40 for more horizontal space
                const GRID_HEIGHT = 25 // Increase from 20 to 30 for more vertical space
                const GAME_WIDTH = GRID_WIDTH * GRID_SIZE  // Now 800px instead of 600px
                const GAME_HEIGHT = GRID_HEIGHT * GRID_SIZE // Now 600px instead of 400px

                class SnakeScene extends Phaser.Scene {
                    // Game objects
                    snake: Phaser.GameObjects.Rectangle[] = []
                    food: Phaser.GameObjects.Rectangle | null = null
                    scoreText: Phaser.GameObjects.Text | null = null
                    gameOverText: Phaser.GameObjects.Text | null = null
                    startText: Phaser.GameObjects.Text | null = null
                    restartButton: Phaser.GameObjects.Text | null = null

                    // Game state
                    direction: string = 'right'
                    nextDirection: string = 'right'
                    gameStarted: boolean = false
                    gameOver: boolean = false
                    moveTime: number = 0
                    moveInterval: number = 150 // Time between moves in ms
                    keyPressTime: number = 0
                    keyPressCooldown: number = 50 // ms between allowed key presses

                    constructor() {
                        super({ key: 'SnakeScene' })
                    }

                    create() {
                        // Make canvas focusable but hide focus outline
                        this.game.canvas.setAttribute('tabindex', '0');
                        this.game.canvas.style.outline = 'none';
                        this.game.canvas.focus();
                        this.game.canvas.classList.add('focus:outline-none');

                        // Store reference to isInitializing for use in the game scene
                        this.isInitializingNetwork = isInitializing;

                        // Prevent keyboard events from propagating to other UI elements
                        this.input.keyboard.on('keydown', function (event) {
                            event.stopPropagation();
                        });

                        // Set up snake - initial segments
                        this.createSnake();

                        // Create food
                        this.food = this.add.rectangle(
                            Phaser.Math.Between(1, GRID_WIDTH - 2) * GRID_SIZE + GRID_SIZE / 2,
                            Phaser.Math.Between(1, GRID_HEIGHT - 2) * GRID_SIZE + GRID_SIZE / 2,
                            GRID_SIZE - 2,
                            GRID_SIZE - 2,
                            0xff0000 // Red food
                        );

                        // Set up keyboard controls
                        const cursors = this.input.keyboard.createCursorKeys();

                        // Handle direction changes with initialization check
                        cursors.left.on('down', () => {
                            if (!isInitializingRef.current) {
                                this.handleDirectionChange('left');
                            }
                        });

                        cursors.right.on('down', () => {
                            if (!isInitializingRef.current) {
                                this.handleDirectionChange('right');
                            }
                        });

                        cursors.up.on('down', () => {
                            if (!isInitializingRef.current) {
                                this.handleDirectionChange('up');
                            }
                        });

                        cursors.down.on('down', () => {
                            if (!isInitializingRef.current) {
                                this.handleDirectionChange('down');
                            }
                        });

                        // Start text with initialization status
                        this.updateStartText();

                        // Game over text (hidden initially)
                        this.gameOverText = this.add.text(
                            GAME_WIDTH / 2,
                            GAME_HEIGHT / 2 - 50,
                            'GAME OVER',
                            {
                                fontFamily: 'sans-serif',
                                fontSize: '32px',
                                color: '#ffffff'
                            }
                        ).setOrigin(0.5).setVisible(false).setDepth(10);

                        // Restart button (hidden initially)
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
                            .setDepth(10);

                        // Set initial move time
                        this.moveTime = 0;
                    }

                    // Add these methods to the scene:

                    updateStartText() {
                        // Remove old text if exists
                        if (this.startText) {
                            this.startText.destroy();
                        }

                        // Create appropriate text based on initialization status
                        if (isInitializingRef.current) {
                            this.startText = this.add.text(
                                GAME_WIDTH / 2,
                                GAME_HEIGHT / 2,
                                'Initializing...',
                                {
                                    fontFamily: 'sans-serif',
                                    fontSize: '20px',
                                    color: '#9CA3AF', // Gray text while initializing
                                    backgroundColor: '#000000',
                                    padding: { x: 10, y: 5 }
                                }
                            ).setOrigin(0.5).setDepth(10);
                        } else {
                            this.startText = this.add.text(
                                GAME_WIDTH / 2,
                                GAME_HEIGHT / 2,
                                'Press any arrow key to start',
                                {
                                    fontFamily: 'sans-serif',
                                    fontSize: '20px',
                                    color: '#00ff00', // Green text when ready
                                    backgroundColor: '#000000',
                                    padding: { x: 10, y: 5 }
                                }
                            ).setOrigin(0.5).setDepth(10);
                        }
                    }


                    update(time: number) {
                        if (this.gameOver) {
                            return;
                        }

                        // If game hasn't started, just return
                        if (!this.gameStarted) {
                            return;
                        }

                        // Move the snake on intervals
                        if (time >= this.moveTime) {
                            this.moveSnake();
                            this.moveTime = time + this.moveInterval;
                        }
                    }

                    createSnake() {
                        // Clear existing snake segments if any
                        this.snake.forEach(segment => segment.destroy())
                        this.snake = []

                        // Create 3 initial segments
                        for (let i = 0; i < 3; i++) {
                            const segment = this.add.rectangle(
                                (10 - i) * GRID_SIZE + GRID_SIZE / 2,
                                10 * GRID_SIZE + GRID_SIZE / 2,
                                GRID_SIZE - 2,
                                GRID_SIZE - 2,
                                0xffffff // White color
                            )
                            this.snake.push(segment)
                        }

                        // Reset direction
                        this.direction = 'right'
                        this.nextDirection = 'right'
                        currentDirectionRef.current = 'right'
                        pendingDirectionRef.current = null
                    }

                    handleDirectionChange(newDirection: string) {
                        // Skip if the game is over
                        if (this.gameOver || isInitializingRef.current) {
                            return;
                        }

                        // Check for key press cooldown
                        const currentTime = this.time.now;
                        if (currentTime < this.keyPressTime) {
                            return; // Still in cooldown period
                        }

                        // Set next allowed key press time
                        this.keyPressTime = currentTime + this.keyPressCooldown;

                        // Start the game if not started yet
                        if (!this.gameStarted) {
                            this.gameStarted = true
                            this.startText?.setVisible(false)
                            return
                        }

                        // Check if the new direction is valid (not opposite of current direction)
                        const opposites: { [key: string]: string } = {
                            left: 'right',
                            right: 'left',
                            up: 'down',
                            down: 'up'
                        }

                        // Don't allow reversing direction
                        if (opposites[newDirection] === this.direction) {
                            return
                        }

                        // Don't trigger blockchain if direction hasn't actually changed
                        if (newDirection === this.nextDirection) {
                            return
                        }

                        // Process direction change
                        if (isWeb3Enabled && selectedNetwork.id !== 'select') {
                            // Store the pending direction for after transaction completes
                            pendingDirectionRef.current = newDirection;

                            // Set transaction pending
                            transactionPendingRef.current = true;
                            setShowToast(true);

                            // Send transaction and update direction when complete
                            sendUpdate(selectedNetwork.id)
                                .then(() => {
                                    // Update direction after transaction completes
                                    this.nextDirection = pendingDirectionRef.current || this.nextDirection;
                                    currentDirectionRef.current = pendingDirectionRef.current;
                                    pendingDirectionRef.current = null;
                                    transactionPendingRef.current = false;
                                    setShowToast(false);
                                })
                                .catch((error) => {
                                    console.error('Transaction error:', error);
                                    pendingDirectionRef.current = null;
                                    transactionPendingRef.current = false;
                                    setShowToast(false);
                                    this.handleGameOver();
                                });

                            // Important: Keep moving in current direction while transaction is pending
                            // Don't modify this.nextDirection until the transaction completes
                        } else {
                            // Without blockchain, just update direction immediately
                            this.nextDirection = newDirection;
                            currentDirectionRef.current = newDirection;
                        }
                    }

                    moveSnake() {
                        // If transaction pending for direction change, keep moving in current direction
                        if (!transactionPendingRef.current) {
                            // Only update direction if no transaction is pending
                            this.direction = this.nextDirection;
                        }

                        // Calculate new head position
                        const head = this.snake[0];
                        let newX = head.x;
                        let newY = head.y;

                        switch (this.direction) {
                            case 'left':
                                newX -= GRID_SIZE;
                                break;
                            case 'right':
                                newX += GRID_SIZE;
                                break;
                            case 'up':
                                newY -= GRID_SIZE;
                                break;
                            case 'down':
                                newY += GRID_SIZE;
                                break;
                        }

                        // Check for collision with walls
                        if (
                            newX < GRID_SIZE / 2 ||
                            newX > GAME_WIDTH - GRID_SIZE / 2 ||
                            newY < GRID_SIZE / 2 ||
                            newY > GAME_HEIGHT - GRID_SIZE / 2
                        ) {
                            this.handleGameOver();
                            return;
                        }

                        // Check for collision with self
                        for (let i = 0; i < this.snake.length; i++) {
                            if (
                                this.snake[i].x === newX &&
                                this.snake[i].y === newY
                            ) {
                                this.handleGameOver();
                                return;
                            }
                        }

                        // Check for food collision
                        const ateFood = this.food &&
                            Math.abs(newX - this.food.x) < GRID_SIZE / 2 &&
                            Math.abs(newY - this.food.y) < GRID_SIZE / 2;

                        // If food was eaten, grow the snake and create new food
                        if (ateFood && this.food) {
                            if (isWeb3Enabled && selectedNetwork.id !== 'select') {
                                // Set transaction pending
                                transactionPendingRef.current = true;
                                setShowToast(true);

                                // Create new segment at the same position as the current tail
                                const tail = this.snake[this.snake.length - 1];

                                // Send transaction for food consumption
                                sendUpdate(selectedNetwork.id)
                                    .then(() => {
                                        // Add new segment at tail position
                                        const newSegment = this.add.rectangle(
                                            tail.x,
                                            tail.y,
                                            GRID_SIZE - 2,
                                            GRID_SIZE - 2,
                                            0xffffff
                                        );
                                        this.snake.push(newSegment);

                                        // Move the food
                                        this.moveFood();

                                        // Update score
                                        setScore(prevScore => prevScore + 1);

                                        // Speed up the game slightly
                                        this.moveInterval = Math.max(50, this.moveInterval - 5);

                                        transactionPendingRef.current = false;
                                        setShowToast(false);
                                    })
                                    .catch((error) => {
                                        console.error('Transaction error:', error);
                                        transactionPendingRef.current = false;
                                        setShowToast(false);
                                        this.handleGameOver();
                                    });

                                // Continue with movement even though transaction is pending
                                // We'll add the new segment when the transaction completes
                            } else {
                                // Without blockchain, handle food consumption immediately
                                const tail = this.snake[this.snake.length - 1];
                                const newSegment = this.add.rectangle(
                                    tail.x,
                                    tail.y,
                                    GRID_SIZE - 2,
                                    GRID_SIZE - 2,
                                    0xffffff
                                );
                                this.snake.push(newSegment);

                                // Move the food
                                this.moveFood();

                                // Update score
                                setScore(prevScore => prevScore + 1);

                                // Speed up the game slightly
                                this.moveInterval = Math.max(50, this.moveInterval - 5);
                            }
                        }

                        // Always move the snake by adding a new head
                        const newHead = this.add.rectangle(
                            newX,
                            newY,
                            GRID_SIZE - 2,
                            GRID_SIZE - 2,
                            0xffffff
                        );

                        this.snake.unshift(newHead);

                        // If no food was eaten or we're not waiting for a food transaction,
                        // remove the tail to maintain the same length
                        if (!ateFood || (!transactionPendingRef.current && ateFood)) {
                            const tail = this.snake.pop();
                            if (tail) {
                                tail.destroy();
                            }
                        } else if (ateFood && transactionPendingRef.current && isWeb3Enabled) {
                            // If food was eaten and transaction is pending in web3 mode,
                            // remove the tail for now - we'll add it back when the transaction completes
                            const tail = this.snake.pop();
                            if (tail) {
                                tail.destroy();
                            }
                        }
                    }

                    moveFood() {
                        if (!this.food) return;

                        // Generate a new position for the food
                        let newX, newY;
                        let validPosition = false;

                        while (!validPosition) {
                            newX = Phaser.Math.Between(1, GRID_WIDTH - 2) * GRID_SIZE + GRID_SIZE / 2;
                            newY = Phaser.Math.Between(1, GRID_HEIGHT - 2) * GRID_SIZE + GRID_SIZE / 2;

                            // Check that it's not on the snake
                            validPosition = true;
                            for (const segment of this.snake) {
                                if (
                                    Math.abs(segment.x - newX) < GRID_SIZE / 2 &&
                                    Math.abs(segment.y - newY) < GRID_SIZE / 2
                                ) {
                                    validPosition = false;
                                    break;
                                }
                            }
                        }

                        // Set new food position
                        this.food.x = newX;
                        this.food.y = newY;
                    }

                    handleGameOver() {
                        this.gameOver = true;
                        setGameOver(true); // Add this line to update React state

                        // Show game over UI
                        if (this.gameOverText) {
                            this.gameOverText.setVisible(true);
                        }

                        if (this.restartButton) {
                            this.restartButton.setVisible(true);
                        }

                        // Update game state
                        this.gameStarted = false;

                        // Refresh wallet balance
                        if (window.refetchBalance) {
                            window.refetchBalance();
                        }
                    }

                    restartGame() {
                        this.gameOver = false;
                        setGameOver(false); // Add this line to update React state

                        // Hide UI elements
                        if (this.gameOverText) {
                            this.gameOverText.setVisible(false);
                        }

                        if (this.restartButton) {
                            this.restartButton.setVisible(false);
                        }

                        // Reset score
                        setScore(0);

                        // Reset speed
                        this.moveInterval = 150;

                        // Show start text and bring it to the top
                        if (this.startText) {
                            this.startText.setVisible(true);
                            this.startText.setDepth(10);
                        }

                        // Create new snake
                        this.createSnake();

                        // Move food to new position
                        this.moveFood();
                    }
                }

                // Game configuration
                const config = {
                    type: Phaser.AUTO,
                    width: GAME_WIDTH,
                    height: GAME_HEIGHT,
                    parent: gameRef.current,
                    backgroundColor: '#000000',
                    scene: SnakeScene
                }

                // Create new game instance
                const game = new Phaser.Game(config)
                gameInstanceRef.current = game

            } catch (err) {
                console.error('Error loading Phaser:', err)
            }
        }

        initPhaser()

        // Cleanup on unmount
        return () => {
            if (gameInstanceRef.current) {
                gameInstanceRef.current.destroy(true)
                gameInstanceRef.current = null
            }
        }
    }, [isMounted, isWeb3Enabled, selectedNetwork.id])

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
                                <span className="text-yellow-500">SNAKE</span>
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
                                    Control the snake with arrow keys - {isWeb3Enabled ? `every turn is recorded on ${selectedNetwork.name} Testnet` : 'Web3 mode is disabled'}
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
                                <div className="flex justify-center items-center mb-4">
                                    <div className="px-6 py-2 bg-card border border-border rounded-lg">
                                        <span className="text-lg font-medium mr-2">Score:</span>
                                        <span className="text-xl font-bold">{score}</span>
                                    </div>
                                </div>

                                <div className="flex justify-center w-full">
                                    <div
                                        ref={gameRef}
                                        className="w-full max-w-[900px] rounded-lg overflow-hidden border border-border mb-4"
                                    />
                                </div>

                                {/* Game instructions */}
                                <div className="mt-4 p-4 border border-border rounded-lg bg-card/30">
                                    <h3 className="font-medium mb-2">How to Play:</h3>
                                    <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                                        <li>Use arrow keys to control the snake</li>
                                        <li>Eat the red food to grow longer</li>
                                        <li>Every direction change and food consumption triggers a blockchain transaction</li>
                                        {isWeb3Enabled && <li>The snake continues moving while transactions are processing</li>}
                                        <li>Game ends when you hit the wall or your own body</li>
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>

                    <ChoppyModal
                        isOpen={showChoppyModal}
                        onClose={() => setShowChoppyModal(false)}
                    />
                </>
            )}
        </div>
    )
}