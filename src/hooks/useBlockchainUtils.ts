// src/hooks/useBlockchainUtils.ts
import { useWallets } from "@privy-io/react-auth";
import { createWalletClient, custom, Hex, http, publicActions, webSocket } from "viem";
import { foundry, megaethTestnet, somniaTestnet, abstractTestnet } from "viem/chains";
import { riseTestnet } from "@/wagmi-config";
import { eip712WalletActions } from 'viem/zksync'
import { UPDATER_ABI, LOCAL_UPDATER_ADDRESS, MEGA_UPDATER_ADDRESS, RISE_UPDATER_ADDRESS, SOMNIA_UPDATER_ADDRESS, ABSTRACT_UPDATER_ADDRESS } from '@/constants';

// Chain configurations
// Chain configurations
const CHAIN_CONFIGS = {
  megaeth: {
    chain: megaethTestnet,
    contractAddress: MEGA_UPDATER_ADDRESS,
    chainId: 6342,
    transport: () => http('https://carrot.megaeth.com/rpc')
  },
  rise: {
    chain: riseTestnet,
    contractAddress: RISE_UPDATER_ADDRESS,
    chainId: 11155931,
    transport: () => http('https://testnet.riselabs.xyz/')
  },
  somnia: {
    chain: somniaTestnet,
    contractAddress: SOMNIA_UPDATER_ADDRESS,
    chainId: 50312,
    transport: () => http('https://dream-rpc.somnia.network')
  },
  foundry: {
    chain: foundry,
    contractAddress: LOCAL_UPDATER_ADDRESS,
    chainId: 31337,
    transport: () => webSocket('ws://127.0.0.1:8545')
  },
  abstract: {  // Add this new entry
    chain: abstractTestnet,
    contractAddress: ABSTRACT_UPDATER_ADDRESS,
    chainId: 11124,
    transport: () => http('https://api.testnet.abs.xyz')
  }
};


// Pre-signed transaction pool
let preSignedPool: Record<string, {
  transactions: string[];
  currentIndex: number;
  baseNonce: number;
  hasTriggeredRefill: boolean;
}> = {};

// One-time cached gas parameters
let gasParams: Record<string, { maxFeePerGas: bigint; maxPriorityFeePerGas: bigint; }> = {};

// Client cache to store clients for each chain
let clientCache: Record<string, any> = {};

export function useBlockchainUtils() {
  const { wallets } = useWallets();
  const embeddedWallet = wallets.find(wallet => wallet.walletClientType === 'privy');

  // Helper to parse CAIP format chain ID
  const parseChainId = (caipChainId: string | null): number | null => {
    if (!caipChainId) return null;
    const chainId = caipChainId.split(':')[1];
    return chainId ? parseInt(chainId) : null;
  };

  // Get current chain from embedded wallet
  const getCurrentChain = (): string | null => {
    if (!embeddedWallet) return null;

    const caipChainId = embeddedWallet.chainId;
    const chainId = parseChainId(caipChainId);

    for (const [key, config] of Object.entries(CHAIN_CONFIGS)) {
      if (config.chainId === chainId) return key;
    }

    return null;
  };

  const checkBalance = async (chainKey: string): Promise<bigint> => {
    if (!embeddedWallet) throw new Error('No embedded wallet found');


    // Use cached client if available, otherwise create one
    const client = clientCache[chainKey] || await createChainClient(chainKey);
    console.log("client is here: ")
    console.log(client)
    console.log("checking balance of ", client.account.address)
    console.log("on chain: ", chainKey)

    const balance = await client.getBalance({
      address: embeddedWallet.address as `0x${string}`

    });

    console.log("balance is here: ", balance)

    return balance;
  };

  // Create wallet client for a specific chain
  const createChainClient = async (chainKey: string) => {
    if (!embeddedWallet) throw new Error('No embedded wallet found');

    const config = CHAIN_CONFIGS[chainKey as keyof typeof CHAIN_CONFIGS];
    if (!config) throw new Error(`Unsupported chain: ${chainKey}`);

    const provider = await embeddedWallet.getEthereumProvider();

    const baseClient = createWalletClient({
      account: embeddedWallet.address as Hex,
      chain: config.chain,
      transport: custom(provider),
    }).extend(publicActions);

    if (chainKey === 'abstract') {
      return baseClient.extend(eip712WalletActions());
    }

    return baseClient;

  };

  // Switch to a specific chain
  const switchToChain = async (chainKey: string) => {
    if (!embeddedWallet) throw new Error('No embedded wallet found');

    const config = CHAIN_CONFIGS[chainKey as keyof typeof CHAIN_CONFIGS];
    if (!config) throw new Error(`Unsupported chain: ${chainKey}`);

    await embeddedWallet.switchChain(config.chainId);
  };

  // Initialize and pre-sign transactions
  const initData = async (chainKey: string, batchSize: number = 10) => {
    if (!embeddedWallet) {
      console.log("no wallet");
      return;
    }

    console.log("initdata called");

    // Ensure we're on the correct chain
    await switchToChain(chainKey);

    // Create client only if not already cached
    if (!clientCache[chainKey]) {
      clientCache[chainKey] = await createChainClient(chainKey);
    }

    const client = clientCache[chainKey];

    // Get current nonce ONCE
    const currentNonce = await client.getTransactionCount({
      address: embeddedWallet.address as `0x${string}`
    });

    // Get gas parameters ONCE (if not already cached)
    if (!gasParams[chainKey]) {
      try {
        const gasPrice = await client.getGasPrice();
        gasParams[chainKey] = {
          maxFeePerGas: gasPrice,
          maxPriorityFeePerGas: gasPrice / 10n // 10% tip
        };
      } catch (error) {
        // Fallback gas values for testnets
        gasParams[chainKey] = {
          maxFeePerGas: 20000000000n, // 20 gwei
          maxPriorityFeePerGas: 2000000000n, // 2 gwei
        };
      }
    }

    // Pre-sign batch of transactions
    await preSignBatch(chainKey, currentNonce, batchSize);
  };

  // Pre-sign a batch of transactions
  const preSignBatch = async (chainKey: string, startNonce: number, batchSize: number) => {
    if (!embeddedWallet) return;
    console.log("start nonce: ", startNonce)
    console.log("batch size: ", batchSize)

    // Use cached client instead of creating new one
    const client = clientCache[chainKey];
    if (!client) {
      throw new Error(`No client available for ${chainKey}. Please run initData first.`);
    }

    const config = CHAIN_CONFIGS[chainKey as keyof typeof CHAIN_CONFIGS];
    const gas = gasParams[chainKey];

    // Sign transactions in parallel with ZERO RPC calls
    const signingPromises = Array.from({ length: batchSize }, async (_, i) => {
      const txData = {
        account: embeddedWallet.address as Hex,
        to: config.contractAddress as `0x${string}`,
        data: '0xa2e62045',
        nonce: startNonce + i,
        maxFeePerGas: gas.maxFeePerGas,
        maxPriorityFeePerGas: gas.maxPriorityFeePerGas,
        value: 0n,
        type: 'eip1559' as const,
        gas: chainKey === 'abstract' ? 200000n : 100000n,
      };

      //@ts-ignore
      return await client.signTransaction(txData);
    });

    const results = await Promise.all(signingPromises);

    preSignedPool[chainKey] = {
      transactions: results,
      currentIndex: 0,
      baseNonce: startNonce,
      hasTriggeredRefill: false
    };

    console.log(`Pre-signed ${batchSize} transactions for ${chainKey}`);
  };

  // Extend the pool instead of replacing it
  const extendPool = async (chainKey: string, startNonce: number, batchSize: number) => {
    if (!embeddedWallet) return;

    const client = clientCache[chainKey];
    if (!client) {
      throw new Error(`No client available for ${chainKey}. Please run initData first.`);
    }

    const config = CHAIN_CONFIGS[chainKey as keyof typeof CHAIN_CONFIGS];
    const gas = gasParams[chainKey];

    // Sign new transactions
    const signingPromises = Array.from({ length: batchSize }, async (_, i) => {
      const txData = {
        account: embeddedWallet.address as Hex,
        to: config.contractAddress as `0x${string}`,
        data: '0xa2e62045',
        nonce: startNonce + i,
        maxFeePerGas: gas.maxFeePerGas,
        maxPriorityFeePerGas: gas.maxPriorityFeePerGas,
        value: 0n,
        type: 'eip1559' as const,
        gas: chainKey === 'abstract' ? 200000n : 100000n
      };

      //@ts-ignore
      return await client.signTransaction(txData);
    });

    const newTransactions = await Promise.all(signingPromises);

    // Extend the existing pool
    const pool = preSignedPool[chainKey];
    pool.transactions.push(...newTransactions);

    // Reset the refill flag so we can refill again when we hit the next 50% mark
    pool.hasTriggeredRefill = false;

    console.log(`Extended pool with ${batchSize} more transactions. Total: ${pool.transactions.length}`);
  };

  // Get next pre-signed transaction
  const getNextTransaction = (chainKey: string): string => {
    const pool = preSignedPool[chainKey];
    if (!pool || pool.currentIndex >= pool.transactions.length) {
      throw new Error(`No pre-signed transactions available for ${chainKey}`);
    }

    const tx = pool.transactions[pool.currentIndex];
    pool.currentIndex++;

    // Refill every time we use 5 transactions (50% of initial batch)
    // But only if we haven't already started a refill for this batch
    if (pool.currentIndex % 5 === 0 && !pool.hasTriggeredRefill) {
      console.log("Refilling at", pool.currentIndex, "transactions used");
      pool.hasTriggeredRefill = true;
      const nextNonce = pool.baseNonce + pool.transactions.length;
      extendPool(chainKey, nextNonce, 10);
    }

    return tx;
  };

  // Send update transaction (ultra-fast)
  const sendUpdate = async (chainKey: string): Promise<number> => {
    if (!embeddedWallet) throw new Error('No embedded wallet found');

    const startTime = performance.now();

    if (chainKey === 'megaeth') {
      return await sendMegaethTransaction(startTime);
    } else if (chainKey === 'rise') {
      return await sendRiseTransaction(startTime);
    } else if (chainKey === 'abstract') {
      return await sendAbstractTransaction(startTime); // Use new detailed endpoint
    } else {
      return await sendRegularTransaction(chainKey, startTime);
    }
  };

  // MegaETH: use realtime_sendRawTransaction
  const sendMegaethTransaction = async (startTime: number): Promise<number> => {
    // Use cached client
    const client = clientCache['megaeth'] || await createChainClient('megaeth');
    const signedTx = getNextTransaction('megaeth');

    await client.request({
      //@ts-ignore
      method: 'realtime_sendRawTransaction',
      params: [signedTx]
    });

    return performance.now() - startTime;
  };

  // RISE: use eth_sendRawTransactionSync
  const sendRiseTransaction = async (startTime: number): Promise<number> => {
    // Use cached client
    const client = clientCache['rise'] || await createChainClient('rise');
    const signedTx = getNextTransaction('rise');

    await client.request({
      //@ts-ignore
      method: 'eth_sendRawTransactionSync',
      params: [signedTx]
    });

    return performance.now() - startTime;
  };

  // Abstract: use zks_sendRawTransactionWithDetailedOutput
  const sendAbstractTransaction = async (startTime: number): Promise<number> => {
    // Use cached client
    const client = clientCache['abstract'] || await createChainClient('abstract');
    const signedTx = getNextTransaction('abstract');

    await client.request({
      //@ts-ignore
      method: 'zks_sendRawTransactionWithDetailedOutput',
      params: [signedTx]
    });

    return performance.now() - startTime;
  };

  // Foundry and Somnia: send raw transaction and wait for receipt
  const sendRegularTransaction = async (chainKey: string, startTime: number): Promise<number> => {
    // Use cached client
    const client = clientCache[chainKey] || await createChainClient(chainKey);
    const signedTx = getNextTransaction(chainKey);

    // Send raw transaction and wait for receipt
    const hash = await client.sendRawTransaction({ serializedTransaction: signedTx as `0x${string}` });
    const receipt = await client.waitForTransactionReceipt({ hash });

    return performance.now() - startTime;
  };

  // Get pool status for a chain
  const getPoolStatus = (chainKey: string) => {
    const pool = preSignedPool[chainKey];
    if (!pool) return null;

    return {
      available: pool.transactions.length - pool.currentIndex,
      total: pool.transactions.length,
      percentUsed: (pool.currentIndex / pool.transactions.length) * 100
    };
  };

  return {
    initData,
    sendUpdate,
    getPoolStatus,
    switchToChain,
    getCurrentChain,
    parseChainId,
    checkBalance
  };
}