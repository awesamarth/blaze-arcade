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

enum GameState {
  IDLE = 'idle',
  WAITING = 'waiting',
  READY = 'ready',
  PENDING = 'pending',
  FINISHED = 'finished',
  GAME_OVER = 'game_over',
  TRANSACTION_FAILED = 'transaction_failed'  // New state

}

export default function ReactionTimeGame() {
  const { resolvedTheme } = useTheme()
  const { initData, sendUpdate, getPoolStatus, checkBalance } = useBlockchainUtils()

  const [gameState, setGameState] = useState<GameState>(GameState.IDLE)
  const [attempts, setAttempts] = useState<number>(0)
  const [results, setResults] = useState<{ reactionTime: number, blockchainTime: number }[]>([])
  const [totalReactionTime, setTotalReactionTime] = useState<number>(0)
  const [totalBlockchainTime, setTotalBlockchainTime] = useState<number>(0)
  const [isWeb3Enabled, setIsWeb3Enabled] = useState<boolean>(true)
  const [selectedNetwork, setSelectedNetwork] = useState<Network>(NETWORKS[0])
  const [showToast, setShowToast] = useState(false)
  const [txStartTime, setTxStartTime] = useState(0)
  const [isInitializing, setIsInitializing] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const readyTimeRef = useRef<number>(0)
  const frameRequestRef = useRef<number | null>(null)
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isDark = isMounted && resolvedTheme === 'dark'
  const { wallets } = useWallets()
  const embeddedWallet = getEmbeddedConnectedWallet(wallets)

  //don't worry about this lol
  const ADJUSTMENT = 100;


  useEffect(() => {
    const initializeNetwork = async () => {
      if (isWeb3Enabled && selectedNetwork && embeddedWallet?.address) {
        setIsInitializing(true)
        try {


          console.log("trying now with: ", selectedNetwork.id)
          await initData(selectedNetwork.id, 10) 
          console.log(`Initialized ${selectedNetwork.name} with pre-signed transactions`)
          // Check balance first
          const balance = await checkBalance(selectedNetwork.id)

          // If balance is 0, call faucet
          if (balance === 0n) {
            console.log(`Balance is 0 on ${selectedNetwork.name}, calling faucet...`)
            await callFaucet(embeddedWallet.address, selectedNetwork.id)
            // Optional: Wait a bit for tokens to arrive before initializing
            // await new Promise(resolve => setTimeout(resolve, 2000))
          }
        } catch (error) {
          console.error(`Failed to initialize ${selectedNetwork.name}:`, error)
        } finally {
          setIsInitializing(false)
        }
      }
    }

    initializeNetwork()
  }, [selectedNetwork, embeddedWallet?.address, isWeb3Enabled]) // Add embeddedWallet.address to deps

  useEffect(() => {
    setIsMounted(true)
  }, [])


  const clearAllTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (frameRequestRef.current) {
      cancelAnimationFrame(frameRequestRef.current);
      frameRequestRef.current = null;
    }
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
  }, []);

  const startGame = useCallback(() => {
    if (![GameState.IDLE, GameState.FINISHED, GameState.GAME_OVER, GameState.TRANSACTION_FAILED].includes(gameState)) return;

    clearAllTimers();

    setGameState(GameState.WAITING);
    setAttempts(0);
    setResults([]);
    setTotalReactionTime(0);
    setTotalBlockchainTime(0);
    setShowToast(false);

    const delay = Math.floor(Math.random() * 4000) + 1000;
    const start = performance.now();

    const checkTime = (now: number) => {
      if (now - start >= delay) {
        setGameState(GameState.READY);
        readyTimeRef.current = now;
      } else {
        frameRequestRef.current = requestAnimationFrame(checkTime);
      }
    };
    frameRequestRef.current = requestAnimationFrame(checkTime);
  }, [gameState, clearAllTimers]);

  useEffect(() => {
    return clearAllTimers;
  }, [clearAllTimers]);

  const handleClick = useCallback(async () => {
    if (isInitializing) return;

    switch (gameState) {
      case GameState.IDLE:
      case GameState.FINISHED:
      case GameState.GAME_OVER:
      case GameState.TRANSACTION_FAILED:  // Add this case

        startGame();
        break;

      case GameState.WAITING:
        clearAllTimers();
        setGameState(GameState.GAME_OVER);
        break;

      case GameState.PENDING:
        break;

      case GameState.READY:
        const now = performance.now();
        const reactionTime = Math.round(now - readyTimeRef.current) - ADJUSTMENT
        if (isWeb3Enabled) {
          setTxStartTime(performance.now());
          setGameState(GameState.PENDING);
          setShowToast(true);

          if (toastTimeoutRef.current) {
            clearTimeout(toastTimeoutRef.current);
          }

          try {
            // Send transaction and measure blockchain time
            const blockchainTime = await sendUpdate(selectedNetwork.id);

            // Transaction complete - update results
            const newResult = {
              reactionTime,
              blockchainTime: Math.round(blockchainTime)
            };
            setResults(prev => [...prev, newResult]);
            setTotalReactionTime(prev => prev + reactionTime);
            setTotalBlockchainTime(prev => prev + Math.round(blockchainTime));
            setAttempts(prev => prev + 1);

            setShowToast(false);

            // Check if game is complete
            if (attempts + 1 < 5) {
              setGameState(GameState.WAITING);

              const delay = Math.floor(Math.random() * 4000) + 1000;
              clearAllTimers();

              const start = performance.now();
              const checkTime = (now: number) => {
                if (now - start >= delay) {
                  setGameState(GameState.READY);
                  readyTimeRef.current = now;
                } else {
                  frameRequestRef.current = requestAnimationFrame(checkTime);
                }
              };
              frameRequestRef.current = requestAnimationFrame(checkTime);
            } else {
              setGameState(GameState.FINISHED);
            }

          } catch (error) {
            console.error('Transaction failed:', error);
            setShowToast(false);
            setGameState(GameState.TRANSACTION_FAILED);

            // Show error message or handle failure gracefully
            // Could add a specific error state if needed
          }
        } else {
          // Web3 disabled - just record reaction time
          const newResult = { reactionTime, blockchainTime: 0 };
          setResults(prev => [...prev, newResult]);
          setTotalReactionTime(prev => prev + reactionTime);

          if (attempts < 4) {
            setAttempts(prev => prev + 1);
            setGameState(GameState.WAITING);

            const delay = Math.floor(Math.random() * 4000) + 1000;
            clearAllTimers();

            const start = performance.now();
            const checkTime = (now: number) => {
              if (now - start >= delay) {
                setGameState(GameState.READY);
                readyTimeRef.current = now;
              } else {
                frameRequestRef.current = requestAnimationFrame(checkTime);
              }
            };
            frameRequestRef.current = requestAnimationFrame(checkTime);
          } else {
            setGameState(GameState.FINISHED);
          }
        }
        break;
    }
  }, [gameState, attempts, startGame, isWeb3Enabled, selectedNetwork.id, clearAllTimers, sendUpdate]);

  const handleToggleWeb3 = async (enabled: boolean) => {
    if (gameState === GameState.PENDING || isInitializing) return; // Add isInitializing check
    setIsWeb3Enabled(enabled);
  };

  const handleNetworkSelect = async (network: Network) => {
    if (gameState === GameState.PENDING || isInitializing) return; // Add isInitializing check
    setSelectedNetwork(network);
  };

  const getContainerStyle = () => {
    switch (gameState) {
      case GameState.IDLE: return 'bg-purple-500 hover:bg-purple-600';
      case GameState.WAITING: return 'bg-red-500';
      case GameState.READY: return 'bg-green-500';
      case GameState.PENDING: return 'bg-green-500';
      case GameState.FINISHED: return 'bg-blue-500 hover:bg-blue-600';
      case GameState.GAME_OVER: return 'bg-red-600 hover:bg-red-700';
      case GameState.TRANSACTION_FAILED: return 'bg-red-600 hover:bg-red-700';  // Same styling as GAME_OVER
      default: return 'bg-purple-500';
    }
  };

  const getMessage = () => {
    switch (gameState) {
      case GameState.IDLE: return 'Click to Start';
      case GameState.WAITING: return 'Wait for green...';
      case GameState.READY: return 'Click Now!';
      case GameState.PENDING: return 'Processing Transaction...';
      case GameState.FINISHED: return 'Game Complete! Click to Play Again';
      case GameState.GAME_OVER: return 'Game Over! Clicked too early. Click to Try Again';
      case GameState.TRANSACTION_FAILED: return 'Transaction Failed! Click to Try Again';  // New message
      default: return 'Click to Start';
    }
  };

  const avgReactionTime = results.length > 0 ? Math.round(totalReactionTime / results.length) : 0;
  const avgBlockchainTime = (results.length > 0 && isWeb3Enabled) ? Math.round(totalBlockchainTime / results.length) : 0;
  const avgTotalTime = avgReactionTime + avgBlockchainTime;

  // Check pool status for debugging
  const poolStatus = getPoolStatus(selectedNetwork.id);

  return (


    <div className="flex flex-col items-center min-h-screen">
         {!embeddedWallet ? (
      <LoginPrompt />
    ) :
      (<>
      {showToast && (
        <div className="fixed top-24 right-6 z-50 bg-card border border-border p-4 rounded-lg shadow-lg animate-in fade-in slide-in-from-right-5">
          <div className="flex items-center gap-2">
            <Loader2 className="animate-spin text-primary" size={18} />
            <span>Transaction pending on {selectedNetwork.name}...</span>
          </div>
          {poolStatus && (
            <div className="text-xs text-muted-foreground mt-1">
              Transactions remaining: {poolStatus.available}
            </div>
          )}
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
            <span className={isDark ? "text-white" : "text-black"}>REACTION</span>
            <span className="text-red-500 ml-2">TIME</span>
          </h1>
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

        <div
          className={cn(
            "w-full select-none aspect-video rounded-lg flex flex-col items-center justify-center cursor-pointer shadow-lg text-center",
            getContainerStyle(),
            gameState === GameState.PENDING || isInitializing ? "cursor-wait pointer-events-none" : ""
          )}
          onClick={handleClick}
        >
          <h2 className="text-white text-2xl md:text-4xl font-bold mb-4 px-4">
            {getMessage()}
          </h2>

          {gameState === GameState.PENDING && (
            <Loader2 className="animate-spin text-white" size={32} />
          )}

          {(gameState === GameState.WAITING || gameState === GameState.READY) && (
            <div className="text-white text-xl">
              Attempt {attempts + 1} of 5
            </div>
          )}
        </div>

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
                  {`${selectedNetwork.name} Testnet Transaction Overhead: ${avgBlockchainTime} ms`}
                </h4>
                <p className="text-muted-foreground text-sm">
                  This is how much time the blockchain adds to each reaction.
                  Look how much it holds you back
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
      </>)}
    </div>
  );
}