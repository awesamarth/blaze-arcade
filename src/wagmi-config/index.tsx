import { foundry, mainnet, megaethTestnet, sepolia, somniaTestnet, abstractTestnet } from 'viem/chains';
import { http, webSocket } from 'wagmi';
import { defineChain } from 'viem'


import { createConfig } from '@privy-io/wagmi';


export const riseTestnet = defineChain({
  id: 11155931,
  name: 'RISE Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ["https://testnet.riselabs.xyz"],
      webSocket: ["wss://testnet.riselabs.xyz/ws"],
    },
  },
  blockExplorers: {
    default: { name: 'Blockscout', url: 'https://explorer.testnet.riselabs.xyz' },
  },
  contracts: {
    multicall3: {
      address: '0xca11bde05977b3631167028862be2a173976ca11',
    },
  }
})


// Replace these with your app's chains

export const wagmiConfig = createConfig({
  chains: [foundry, megaethTestnet, somniaTestnet, riseTestnet, abstractTestnet],
  transports: {
    [megaethTestnet.id]: http(),
    [foundry.id]: http(),
    [somniaTestnet.id]: http(),
    [riseTestnet.id]: http(),
    [abstractTestnet.id]:http()
    

  },
});