'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { useTheme } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {WagmiProvider} from '@privy-io/wagmi';
import { riseTestnet, wagmiConfig } from '@/wagmi-config';
import { foundry, megaethTestnet, somniaTestnet } from 'viem/chains';


export default function Providers({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme()

  const queryClient = new QueryClient();

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PROJECT_ID!}
      config={{
        // Create embedded wallets for users who don't have a wallet
        embeddedWallets: {
          createOnLogin: 'all-users',
        },
        defaultChain: megaethTestnet,
        supportedChains: [megaethTestnet, foundry, somniaTestnet, riseTestnet],
        appearance: {
          theme: ('dark' as "dark" | "light" | `#${string}` | undefined)
        }
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
} 