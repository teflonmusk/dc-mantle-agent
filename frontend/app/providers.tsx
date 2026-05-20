'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, createConfig, WagmiProvider } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { mantleSepolia, mantleMainnet } from './lib/chains';

const config = createConfig({
  chains: [mantleSepolia, mantleMainnet],
  connectors: [injected()],
  transports: {
    [mantleSepolia.id]: http(),
    [mantleMainnet.id]: http(),
  },
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
