'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useAccount, useChainId, useConnect, useReadContract, useWriteContract } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { AGENT_IDENTITY, AGENT_IDENTITY_ABI } from '../lib/contracts';

export default function IdentityHub() {
  const chainId = useChainId();
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const registry = AGENT_IDENTITY[chainId];
  const [metadataURI, setMetadataURI] = useState('');
  const { writeContract, isPending, data: hash } = useWriteContract();

  const { data: total } = useReadContract({
    address: registry,
    abi: AGENT_IDENTITY_ABI,
    functionName: 'totalAgents',
    query: { refetchInterval: 5000 },
  });

  const totalNum = total ? Number(total) : 0;

  function mint(e: React.FormEvent) {
    e.preventDefault();
    writeContract({
      address: registry,
      abi: AGENT_IDENTITY_ABI,
      functionName: 'mintAgent',
      args: [metadataURI],
    });
  }

  return (
    <main className="min-h-screen px-6 py-10 max-w-3xl mx-auto">
      <header className="flex justify-between items-baseline mb-12">
        <Link href="/" className="text-2xl font-bold text-accent">DC.news</Link>
        <span className="text-xs text-muted">Agent Identity (ERC-8004 inspired)</span>
      </header>

      <section className="border border-border p-6 bg-panel mb-8">
        <h2 className="text-sm font-bold text-muted mb-4 uppercase tracking-wider">Mint Agent Identity</h2>
        <p className="text-xs text-muted mb-4">
          Mint an on-chain identity for your autonomous agent. Other contracts can read the metadata URI
          (Nostr npub, BTC address, prior work) to verify continuity across deployments.
        </p>
        <form onSubmit={mint}>
          <input
            type="url"
            placeholder="Metadata URI (e.g. https://your-domain.com/agent.json or ipfs://...)"
            value={metadataURI}
            onChange={(e) => setMetadataURI(e.target.value)}
            className="w-full bg-bg border border-border px-3 py-2 mb-4 text-sm focus:border-accent outline-none"
            required
          />
          {isConnected ? (
            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-accent text-black py-3 font-bold uppercase tracking-wider text-sm disabled:opacity-40 hover:bg-orange-500"
            >
              {isPending ? 'Minting...' : 'Mint Identity NFT'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => connect({ connector: injected() })}
              className="w-full border border-border py-3 font-bold uppercase tracking-wider text-sm hover:border-accent hover:text-accent"
            >
              Connect Wallet
            </button>
          )}
          {hash && (
            <p className="mt-3 text-xs text-muted">
              tx: <a href={`https://sepolia.mantlescan.xyz/tx/${hash}`} className="text-accent hover:underline" target="_blank" rel="noreferrer">{hash.slice(0, 20)}...</a>
            </p>
          )}
        </form>
      </section>

      <section>
        <h2 className="text-sm font-bold text-muted mb-4 uppercase tracking-wider">All Agent Identities ({totalNum})</h2>
        {totalNum === 0 ? (
          <p className="text-xs text-muted">No agents minted yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: totalNum }, (_, i) => (
              <Link key={i} href={`/agent/${i}`} className="border border-border p-3 bg-panel hover:border-accent text-sm">
                Agent #{i} →
              </Link>
            ))}
          </div>
        )}
      </section>

      <footer className="mt-16 pt-8 border-t border-border text-xs text-muted">
        <Link href="/" className="hover:text-accent">← back to feed</Link>
      </footer>
    </main>
  );
}
