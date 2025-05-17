//@ts-nocheck
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

export default function PingPongGame() {
  const { resolvedTheme } = useTheme()
  const { initData, sendUpdate, checkBalance } = useBlockchainUtils()

  const [isWeb3Enabled, setIsWeb3Enabled] = useState<boolean>(true)
  const [selectedNetwork, setSelectedNetwork] = useState<Network>(NETWORKS[0])
  const [showToast, setShowToast] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [score, setScore] = useState({ player: 0 })


  const gameRef = useRef<HTMLDivElement>(null)
  const gameInstanceRef = useRef<any>(null)
  const transactionPendingRef = useRef<boolean>(false)

  const isDark = isMounted && resolvedTheme === 'dark'
  const { wallets } = useWallets()
  const embeddedWallet = getEmbeddedConnectedWallet(wallets)



  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Initialize blockchain for the selected network
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
  }, [selectedNetwork, embeddedWallet?.address, isWeb3Enabled, initData, checkBalance])

  // Initialize Phaser game
  useEffect(() => {
    if (!gameRef.current || !isMounted || (isWeb3Enabled && selectedNetwork.id === 'select')) return

    // If game instance exists, don't create a new one
    if (gameInstanceRef.current) {
      console.log('Game instance already exists, skipping initialization')
      return
    }

    const initPhaser = async () => {
      try {
        // Import Phaser only on client-side
        const Phaser = (await import('phaser')).default

        // Game dimensions
        const WINDOW_WIDTH = 1000
        const WINDOW_HEIGHT = 700
        const PADDLE_SPEED = 400
        const PADDLE_WIDTH = 160
        const PADDLE_HEIGHT = 30
        const BALL_SIZE = 24

        const gameState = {
          playerScore: 0,
          gameOver: false
        }

        const mainState = {
          preload: function () {
            this.load.image('paddle', '/ping-pong/paddle.png')
            this.load.image('ball', '/ping-pong/ball.png')
          },

          create: function () {
            console.log('Creating game scene...')

            // Allow ball to exit top/bottom for game over
            this.physics.world.checkCollision.up = false
            this.physics.world.checkCollision.down = false

            // Create AI paddle (top)
            this.aiPaddle = this.physics.add.sprite(WINDOW_WIDTH / 2, 50, 'paddle')
            this.aiPaddle.displayWidth = PADDLE_WIDTH
            this.aiPaddle.displayHeight = PADDLE_HEIGHT
            this.aiPaddle.setImmovable(true)
            this.aiPaddle.setCollideWorldBounds(true)

            // Create player paddle (bottom)
            this.playerPaddle = this.physics.add.sprite(WINDOW_WIDTH / 2, WINDOW_HEIGHT - 50, 'paddle')
            this.playerPaddle.displayWidth = PADDLE_WIDTH
            this.playerPaddle.displayHeight = PADDLE_HEIGHT
            this.playerPaddle.setImmovable(true)
            this.playerPaddle.setCollideWorldBounds(true)

            // Create ball
            this.ball = this.physics.add.sprite(WINDOW_WIDTH / 2, WINDOW_HEIGHT / 2, 'ball')
            this.ball.displayWidth = BALL_SIZE
            this.ball.displayHeight = BALL_SIZE
            this.ball.setBounce(1)
            this.ball.setCollideWorldBounds(true)

            // Enable physics bodies
            this.physics.world.enable(this.ball)
            this.physics.world.enable(this.playerPaddle)
            this.physics.world.enable(this.aiPaddle)

            // Set initial ball velocity
            this.ball.setVelocity(Phaser.Math.Between(-200, 200), 400)


            // Set up collisions with debug logging
            // Modify the AI paddle collision handler:
            this.physics.add.collider(this.ball, this.aiPaddle, () => {
              console.log('AI paddle hit!')

              // Only process if no transaction is pending
              if (!transactionPendingRef.current) {
                // Add some randomness to the rebound
                const currentVelocity = this.ball.body.velocity

                // Handle blockchain transaction if web3 is enabled
                if (isWeb3Enabled && selectedNetwork.id !== 'select') {
                  transactionPendingRef.current = true
                  setShowToast(true)

                  // Save current ball velocity
                  const savedVelocity = {
                    x: currentVelocity.x,
                    y: currentVelocity.y
                  }

                  // Pause ball
                  this.ball.body.velocity.set(0, 0)

                  // Send transaction and resume game when complete
                  sendUpdate(selectedNetwork.id)
                    .then(() => {
                      if (this.ball) {
                        // Add some randomness to the rebound
                        let newVelocityX = savedVelocity.x + Phaser.Math.Between(-50, 50)
                        // Use positive Y velocity for AI paddle hits
                        let newVelocityY = Math.abs(savedVelocity.y) * 1.05 // Increase by 5%
                        this.ball.body.velocity.set(newVelocityX, newVelocityY)
                      }
                      transactionPendingRef.current = false
                      setShowToast(false)
                    })
                    .catch((error) => {
                      console.error('Transaction error:', error)
                      if (this.ball) {
                        // Still continue game in case of error
                        let newVelocityX = savedVelocity.x + Phaser.Math.Between(-50, 50)
                        let newVelocityY = Math.abs(savedVelocity.y) * 1.05
                        this.ball.body.velocity.set(newVelocityX, newVelocityY)
                      }
                      transactionPendingRef.current = false
                      setShowToast(false)
                    })
                } else {
                  // If web3 is disabled, just handle the bounce
                  let newVelocityX = currentVelocity.x + Phaser.Math.Between(-50, 50)
                  let newVelocityY = Math.abs(currentVelocity.y) * 1.05 // Increase by 5%
                  this.ball.body.velocity.set(newVelocityX, newVelocityY)
                }
              }
            }, null, this)

            this.physics.add.collider(this.ball, this.playerPaddle, () => {
              console.log('Player paddle hit!')
              if (!transactionPendingRef.current) {
                console.log('Ball hit! Current score:', gameState.playerScore)
                // Increment score immediately
                gameState.playerScore++
                // Update both the game state and React state
                setScore(prevScore => {
                  const newScore = { player: prevScore.player + 1 }
                  return newScore
                })
                this.playerScoreText.setText(`Score: ${gameState.playerScore}`)

                // Handle blockchain transaction if web3 is enabled
                if (isWeb3Enabled && selectedNetwork.id !== 'select') {
                  transactionPendingRef.current = true
                  setShowToast(true)

                  // Save current ball velocity
                  const currentVelocity = {
                    x: this.ball.body.velocity.x,
                    y: this.ball.body.velocity.y
                  }

                  // Pause ball
                  this.ball.body.velocity.set(0, 0)

                  // Send transaction and resume game when complete
                  sendUpdate(selectedNetwork.id)
                    .then(() => {
                      if (this.ball) {
                        // Add some randomness to the rebound
                        let newVelocityX = currentVelocity.x + Phaser.Math.Between(-50, 50)
                        // Invert Y velocity for rebound and increase speed
                        this.ball.body.velocity.set(newVelocityX, -Math.abs(currentVelocity.y) * 1.05)
                      }
                      transactionPendingRef.current = false
                      setShowToast(false)
                    })
                    .catch((error) => {
                      console.error('Transaction error:', error)
                      if (this.ball) {
                        // Still continue game in case of error
                        let newVelocityX = currentVelocity.x + Phaser.Math.Between(-50, 50)
                        this.ball.body.velocity.set(newVelocityX, -Math.abs(currentVelocity.y))
                      }
                      transactionPendingRef.current = false
                      setShowToast(false)
                    })
                } else {
                  // If web3 is disabled, just handle the bounce
                  const currentVelocity = this.ball.body.velocity
                  let newVelocityX = currentVelocity.x + Phaser.Math.Between(-50, 50)
                  let newVelocityY = -Math.abs(currentVelocity.y) * 1.05 // Increase by 5%
                  this.ball.body.velocity.set(newVelocityX, newVelocityY)
                }
              }
            }, null, this)

            // Set up input
            this.cursors = this.input.keyboard.createCursorKeys()

            // Disable click-to-move
            this.input.on('pointerdown', (pointer) => {
              // Only allow movement if pointer is being dragged
              if (pointer.isDown) {
                this.input.setPollAlways()
              }
            })

            // Score text
            this.playerScoreText = this.add.text(WINDOW_WIDTH / 2, 20, 'Score: 0', {
              fontFamily: 'Arial',
              fontSize: '32px',
              color: '#ffffff',
              align: 'center'
            }).setOrigin(0.5)

            // Game over text (hidden initially)
            this.gameOverText = this.add.text(WINDOW_WIDTH / 2, WINDOW_HEIGHT / 2 - 60, '', {
              fontFamily: 'sans-serif', // Try using the actual font name
              fontSize: '64px',
              color: '#ffffff',
              align: 'center'
            }).setOrigin(0.5).setVisible(false)

            // Final score text (separate from game over text)
            this.finalScoreText = this.add.text(WINDOW_WIDTH / 2, WINDOW_HEIGHT / 2 + 20, '', {
              fontFamily: 'Rajdhani', // Try using the actual font name
              fontSize: '40px',
              color: '#ffffff',
              align: 'center'
            }).setOrigin(0.5).setVisible(false)

            // Restart button (hidden initially)
            this.restartButton = this.add.text(WINDOW_WIDTH / 2, WINDOW_HEIGHT / 2 + 120, 'Play Again', {
              fontFamily: 'Arial',
              fontSize: '40px',
              color: '#ffffff', // White text
              backgroundColor: '#10B981', // Green background (text-green-500)
              padding: { x: 30, y: 15 }
            }).setOrigin(0.5).setInteractive().setVisible(false)

            // Bind resetGame to this scene context
            this.resetGame = function () {
              // Reset game state
              gameState.gameOver = false
              gameState.playerScore = 0
              // Reset both game state and React state
              setScore({ player: 0 })

              // Hide UI
              this.gameOverText.setVisible(false)
              this.restartButton.setVisible(false)
                this.finalScoreText.setVisible(false)  


              // Reset paddle positions
              this.playerPaddle.x = WINDOW_WIDTH / 2
              this.aiPaddle.x = WINDOW_WIDTH / 2

              // Reset ball position
              this.ball.setPosition(WINDOW_WIDTH / 2, WINDOW_HEIGHT / 2)

              // Reset score text
              this.playerScoreText.setText('Score: 0')

              // Start ball movement after short delay
              this.time.delayedCall(500, () => {
                this.ball.setVelocity(Phaser.Math.Between(-150, 150), 250)
              })
            }.bind(this)

            this.restartButton.on('pointerover', () => {
              this.input.setDefaultCursor('pointer')
            })

            this.restartButton.on('pointerout', () => {
              this.input.setDefaultCursor('default')
            })

            this.restartButton.on('pointerdown', () => {
              this.resetGame()
            })
          },

          update: function () {
            if (gameState.gameOver || transactionPendingRef.current) return

            // Player controls (only keyboard and drag)
            const pointer = this.input.activePointer

            // Only move paddle if pointer is being dragged
            if (pointer.isDown && pointer.getDistance() > 0) {
              this.playerPaddle.x = Phaser.Math.Clamp(
                pointer.x,
                this.playerPaddle.displayWidth / 2,
                WINDOW_WIDTH - this.playerPaddle.displayWidth / 2
              )
            }

            // Keyboard controls
            if (this.cursors.left.isDown) {
              this.playerPaddle.x -= PADDLE_SPEED * this.game.loop.delta / 1000
            } else if (this.cursors.right.isDown) {
              this.playerPaddle.x += PADDLE_SPEED * this.game.loop.delta / 1000
            }

            // Keep player paddle within bounds
            this.playerPaddle.x = Phaser.Math.Clamp(
              this.playerPaddle.x,
              this.playerPaddle.displayWidth / 2,
              WINDOW_WIDTH - this.playerPaddle.displayWidth / 2
            )

            // Perfect AI - follow ball with slight smoothing
            this.aiPaddle.x = Phaser.Math.Linear(this.aiPaddle.x, this.ball.x, 0.075)

            // Game over if ball passes bottom edge
            if (this.ball.y > WINDOW_HEIGHT + 20) {
              gameState.gameOver = true

              // Show game over text
              this.gameOverText.setText('Game Over!')
              this.gameOverText.setVisible(true)

              // Show final score text separately
              this.finalScoreText.setText(`Final Score: ${gameState.playerScore}`)
              this.finalScoreText.setVisible(true)

              this.restartButton.setVisible(true)

              // Stop the ball
              this.ball.setVelocity(0, 0)

              // Create tween to fade in UI
              this.tweens.add({
                targets: [this.gameOverText, this.finalScoreText, this.restartButton],
                alpha: { from: 0, to: 1 },
                duration: 500
              })
            }
          },

        }

        // Game configuration
        const config = {
          type: Phaser.AUTO,
          width: WINDOW_WIDTH,
          height: WINDOW_HEIGHT,
          parent: gameRef.current,
          physics: {
            default: 'arcade',
            arcade: {
              gravity: { x: 0, y: 0 },
              debug: true,
              tileBias: 32,
              timeScale: 1
            }
          },
          scene: mainState,
          scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH
          }
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
  }, [isMounted, isWeb3Enabled, selectedNetwork.id]) // Restore Web3 and network dependencies

  const handleToggleWeb3 = (enabled: boolean) => {
    if (isInitializing) return
    setIsWeb3Enabled(enabled)
  }

  const handleNetworkSelect = (network: Network) => {
    if (isInitializing) return
    setSelectedNetwork(network)
  }

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
                <span className={isDark ? "text-white" : "text-black"}>PING</span>
                <span className="text-yellow-400 ml-2">PONG</span>
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
                  Control your paddle with the mouse or left/right arrow keys - {isWeb3Enabled ? `each hit is recorded on ${selectedNetwork.name} Testnet` : 'Web3 mode is disabled'}
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
                <div
                  ref={gameRef}
                  className="w-full aspect-video rounded-lg overflow-hidden border border-border"
                />

                {/* Score display */}
                <div className="flex justify-center mt-4 p-4 border border-border rounded-lg bg-card/30">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Score</div>
                    <div className="text-3xl font-bold">{score.player}</div>
                  </div>
                </div>

                {/* Game instructions */}
                <div className="mt-4 p-4 border border-border rounded-lg bg-card/30">
                  <h3 className="font-medium mb-2">How to Play:</h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                    <li>Move your paddle at the bottom using your mouse or left/right arrow keys</li>
                    <li>Your score increases each time your paddle hits the ball</li>
                    <li>When the ball hits your paddle, a blockchain transaction is triggered</li>
                    <li>The ball freezes until the transaction is confirmed</li>
                    <li>Game ends when you miss the ball</li>
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