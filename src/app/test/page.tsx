'use client'

import { useState } from 'react'
import { createWalletClient, custom, createPublicClient, http, Hex } from 'viem'
import { abstractTestnet, zksync } from 'viem/chains'
import { eip712WalletActions } from 'viem/zksync'
import { useWallets } from "@privy-io/react-auth";
import { ABSTRACT_UPDATER_ADDRESS, UPDATER_ABI } from '@/constants'

export default function TestPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [number, setNumber] = useState<string>('')
    const [txHash, setTxHash] = useState<string>('')
    const [error, setError] = useState<string>('')

    const { wallets } = useWallets()
    const embeddedWallet = wallets.find(wallet => wallet.walletClientType === 'privy');
    console.log("ye le embedded wallet vro: ", embeddedWallet)

    // Create public client exactly as docs show
    const publicClient = createPublicClient({
        chain: abstractTestnet,
        transport: http('https://api.testnet.abs.xyz')
    }).extend(eip712WalletActions())

    // Only create wallet client if embedded wallet exists
    const walletClient = embeddedWallet ? createWalletClient({
        account: embeddedWallet.address as Hex,
        chain: abstractTestnet,
        transport: http()
    }).extend(eip712WalletActions()) : null

    const checkNumber = async () => {
        setIsLoading(true)
        setError('')
        setNumber('')

        try {
            console.log('Reading number from contract...')

            const numberValue = await publicClient.readContract({
                address: ABSTRACT_UPDATER_ADDRESS as `0x${string}`,
                abi: [
                    {
                        "type": "function",
                        "name": "number",
                        "inputs": [],
                        "outputs": [{ "name": "", "type": "uint256" }],
                        "stateMutability": "view"
                    }
                ],
                functionName: 'number',
            })

            console.log('Number:', numberValue)
            setNumber(numberValue.toString())

        } catch (err: any) {
            console.error('Error:', err)
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }
    const submitTransaction = async () => {
        if (!walletClient || !embeddedWallet) {
            setError('Wallet not connected')
            return
        }

        setIsLoading(true)
        setError('')
        setTxHash('')

        try {
            console.log('Sending transaction...')

            const hash = await walletClient.sendTransaction({
                to: ABSTRACT_UPDATER_ADDRESS as `0x${string}`,
                data: "0xa2e62045", // encodeFunctionData for update()
            })

            console.log('Transaction sent:', hash)
            setTxHash(hash)

        } catch (err: any) {
            console.error('Error:', err)
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
            </div>

            <div className="flex gap-4 mb-8">
                <button
                    onClick={checkNumber}
                    disabled={isLoading}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                    {isLoading ? 'Loading...' : 'Check Number'}
                </button>

                <button
                    onClick={submitTransaction}
                    disabled={isLoading || !embeddedWallet}
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                    {isLoading ? 'Loading...' : 'Submit Transaction'}
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
                        Transaction Hash:
                    </h3>
                    <p className="font-mono text-sm text-blue-700 dark:text-blue-300 break-all">
                        {txHash}
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