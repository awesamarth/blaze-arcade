'use client'

import { useState, useEffect } from 'react'
import { createWalletClient, custom, createPublicClient, http, Hex, publicActions } from 'viem'
import { abstractTestnet } from 'viem/chains'
import { eip712WalletActions } from 'viem/zksync'
import { useWallets } from "@privy-io/react-auth";
import { ABSTRACT_UPDATER_ADDRESS, UPDATER_ABI } from '@/constants'

export default function TestPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [number, setNumber] = useState<string>('')
    const [txHash, setTxHash] = useState<string>('')
    const [error, setError] = useState<string>('')
    const [walletClient, setWalletClient] = useState<any>(null)

    // Pre-sign related state
    const [preSignedTx, setPreSignedTx] = useState<string>('')
    const [isPreSigning, setIsPreSigning] = useState(false)
    const [preSignTxHash, setPreSignTxHash] = useState<string>('')

    const { wallets } = useWallets()
    const embeddedWallet = wallets.find(wallet => wallet.walletClientType === 'privy');

    // Create public client
    const publicClient = createPublicClient({
        chain: abstractTestnet,
        transport: http('https://api.testnet.abs.xyz')
    })

    // Initialize wallet client when embedded wallet is available
    useEffect(() => {
        const initWalletClient = async () => {
            if (embeddedWallet) {
                try {
                    // First switch to Abstract testnet
                    await embeddedWallet.switchChain(11124)

                    // Get the provider
                    const provider = await embeddedWallet.getEthereumProvider()

                    // Create wallet client with custom transport
                    const client = createWalletClient({
                        account: embeddedWallet.address as Hex,
                        chain: abstractTestnet,
                        transport: custom(provider)
                    }).extend(eip712WalletActions()).extend(publicActions)

                    setWalletClient(client)
                } catch (err) {
                    console.error('Failed to initialize wallet client:', err)
                    setError(`Failed to switch to Abstract testnet: ${err}`)
                }
            }
        }

        initWalletClient()
    }, [embeddedWallet])

    const checkNumber = async () => {
        setIsLoading(true)
        setError('')
        setNumber('')

        try {
            console.log('Reading number from contract...')
            console.log('Contract address:', ABSTRACT_UPDATER_ADDRESS)

            const numberValue = await publicClient.readContract({
                address: ABSTRACT_UPDATER_ADDRESS as `0x${string}`,
                abi: UPDATER_ABI,
                functionName: 'number',
            })

            console.log('Number:', numberValue)
            //@ts-ignore
            setNumber(numberValue.toString())

        } catch (err: any) {
            console.error('Error:', err)
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    // NEW: Submit pre-signed transaction with zkSync detailed output
    const submitPreSignedTransactionDetailed = async () => {
        if (!preSignedTx) {
            setError('No pre-signed transaction available')
            return
        }

        setIsLoading(true)
        setError('')
        setPreSignTxHash('')

        try {
            console.log('Submitting with detailed output...')

            const startTime = performance.now()

            // Use zkSync detailed endpoint
            const result = await walletClient.request({
                //@ts-ignore
                method: 'zks_sendRawTransactionWithDetailedOutput',
                params: [preSignedTx]
            })

            const endTime = performance.now()

            console.log('🔥 Detailed result:', result)
            console.log('Time taken:', endTime - startTime, 'ms')

            // Extract transaction hash from result
            setPreSignTxHash(result.transactionHash)

        } catch (err: any) {
            console.error('Error submitting detailed tx:', err)
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    const submitTransaction = async () => {
        if (!walletClient || !embeddedWallet) {
            setError('Wallet not connected or not initialized')
            return
        }

        setIsLoading(true)
        setError('')
        setTxHash('')

        try {
            console.log('Sending transaction...')

            const hash = await walletClient.writeContract({
                address: ABSTRACT_UPDATER_ADDRESS as `0x${string}`,
                abi: UPDATER_ABI,
                functionName: 'update',
            })

            console.log('Transaction sent:', hash)
            setTxHash(hash)

            // Wait for transaction receipt
            const receipt = await publicClient.waitForTransactionReceipt({ hash })
            console.log('Transaction confirmed:', receipt)

        } catch (err: any) {
            console.error('Error:', err)
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    // NEW: Pre-sign transaction with proper gas estimation
    const preSignTransaction = async () => {
        if (!walletClient || !embeddedWallet) {
            setError('Wallet not connected or not initialized')
            return
        }

        setIsPreSigning(true)
        setError('')
        setPreSignedTx('')

        try {
            console.log('Pre-signing transaction...')

            // Get current nonce
            const nonce = await walletClient.getTransactionCount({
                address: embeddedWallet.address as `0x${string}`
            })

            // IMPORTANT: Properly estimate gas using writeContract preparation
            const gasEstimate = await walletClient.estimateContractGas({
                address: ABSTRACT_UPDATER_ADDRESS as `0x${string}`,
                abi: UPDATER_ABI,
                functionName: 'update',
                account: embeddedWallet.address as Hex,
            })

            // Get gas price
            const gasPrice = await walletClient.getGasPrice()

            console.log('Gas estimate:', gasEstimate)
            console.log('Gas price:', gasPrice)

            // Pre-sign the transaction with proper gas estimation
            const signedTx = await walletClient.signTransaction({
                account: embeddedWallet.address as Hex,
                to: ABSTRACT_UPDATER_ADDRESS as `0x${string}`,
                data: '0xa2e62045', // encodeFunctionData for update()
                nonce,
                maxFeePerGas: gasPrice,
                maxPriorityFeePerGas: gasPrice / 10n, // 10% tip
                value: 0n,
                type: 'eip1559' as const,
                gas: gasEstimate * 2n // DOUBLE the gas estimate for zkSync safety margin
            })

            console.log('Transaction pre-signed:', signedTx)
            setPreSignedTx(signedTx)

        } catch (err: any) {
            console.error('Error pre-signing:', err)
            setError(err.message)
        } finally {
            setIsPreSigning(false)
        }
    }
    // NEW: Submit pre-signed transaction
    const submitPreSignedTransaction = async () => {
        if (!preSignedTx) {
            setError('No pre-signed transaction available')
            return
        }

        setIsLoading(true)
        setError('')
        setPreSignTxHash('')

        try {
            console.log('Submitting pre-signed transaction...')

            const startTime = performance.now()

            // Send the pre-signed transaction
            const hash = await walletClient.sendRawTransaction({
                serializedTransaction: preSignedTx as `0x${string}`
            })

            const endTime = performance.now()

            console.log('Pre-signed transaction sent:', hash)
            console.log('Time taken:', endTime - startTime, 'ms')
            setPreSignTxHash(hash)

            // Wait for transaction receipt
            const receipt = await publicClient.waitForTransactionReceipt({ hash })
            console.log('Transaction confirmed:', receipt)

            console.log(' ACTUAL GAS USED:', receipt.gasUsed.toString())


        } catch (err: any) {
            console.error('Error submitting pre-signed tx:', err)
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8">
            <h1 className="text-2xl font-bold mb-8 text-black dark:text-white">
                Abstract Simple Test
            </h1>

            <div className="mb-6 text-center text-black dark:text-white">
                <p className="mb-2">Contract: {ABSTRACT_UPDATER_ADDRESS}</p>
                <p className="mb-4">Chain: Abstract Testnet (11124)</p>
                {embeddedWallet && (
                    <p className="mb-2">Wallet: {embeddedWallet.address?.slice(0, 8)}...{embeddedWallet.address?.slice(-4)}</p>
                )}
                <p className="mb-2">Wallet Client: {walletClient ? '✅ Ready' : '❌ Not Ready'}</p>
                <p className="mb-2">Pre-signed Tx: {preSignedTx ? '✅ Ready' : '❌ None'}</p>
            </div>

            {/* Regular Transaction Buttons */}
            <div className="flex gap-4 mb-4">
                <button
                    onClick={checkNumber}
                    disabled={isLoading}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                    {isLoading ? 'Loading...' : 'Check Number'}
                </button>

                <button
                    onClick={submitTransaction}
                    disabled={isLoading || !walletClient}
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                    {isLoading ? 'Loading...' : 'Submit Transaction'}
                </button>
            </div>

            {/* Pre-Sign Transaction Buttons */}
            <div className="flex gap-4 mb-8">
                <button
                    onClick={preSignTransaction}
                    disabled={isPreSigning || !walletClient}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                    {isPreSigning ? 'Pre-signing...' : 'Pre-Sign Transaction'}
                </button>

                <button
                    onClick={submitPreSignedTransaction}
                    disabled={isLoading || !preSignedTx}
                    className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                    {isLoading ? 'Submitting...' : 'Submit Pre-Signed'}
                </button>

                <button
                    onClick={submitPreSignedTransactionDetailed}
                    disabled={isLoading || !preSignedTx}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                    {isLoading ? 'Submitting...' : 'Submit Detailed (zkSync)'}
                </button>
            </div>

            {number && (
                <div className="mb-4 p-4 bg-green-100 dark:bg-green-900 rounded-lg">
                    <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                        Number:
                    </h3>
                    <p className="font-mono text-sm text-green-700 dark:text-green-300">
                        {number}
                    </p>
                </div>
            )}

            {txHash && (
                <div className="mb-4 p-4 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                        Regular Transaction Hash:
                    </h3>
                    <p className="font-mono text-sm text-blue-700 dark:text-blue-300 break-all">
                        {txHash}
                    </p>
                    <a
                        href={`https://sepolia.abscan.org/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 underline"
                    >
                        View on Abstract Explorer
                    </a>
                </div>
            )}

            {preSignTxHash && (
                <div className="mb-4 p-4 bg-orange-100 dark:bg-orange-900 rounded-lg">
                    <h3 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">
                        Pre-Signed Transaction Hash:
                    </h3>
                    <p className="font-mono text-sm text-orange-700 dark:text-orange-300 break-all">
                        {preSignTxHash}
                    </p>
                    <a
                        href={`https://sepolia.abscan.org/tx/${preSignTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-600 dark:text-orange-400 underline"
                    >
                        View on Abstract Explorer
                    </a>
                </div>
            )}

            {preSignedTx && (
                <div className="mb-4 p-4 bg-yellow-100 dark:bg-yellow-900 rounded-lg max-w-2xl">
                    <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                        Pre-Signed Transaction (Ready to Submit):
                    </h3>
                    <p className="font-mono text-xs text-yellow-700 dark:text-yellow-300 break-all">
                        {preSignedTx.slice(0, 100)}...
                    </p>
                </div>
            )}

            {error && (
                <div className="w-full max-w-2xl p-4 bg-red-100 dark:bg-red-900 rounded-lg">
                    <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">
                        Error:
                    </h3>
                    <pre className="text-sm text-red-700 dark:text-red-300 whitespace-pre-wrap">
                        {error}
                    </pre>
                </div>
            )}
        </div>
    )
}