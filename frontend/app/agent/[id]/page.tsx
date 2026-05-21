'use client';
import { use } from 'react';
import { useChainId, useReadContract } from 'wagmi';
import Link from 'next/link';
import { AGENT_IDENTITY, AGENT_IDENTITY_ABI } from '../../lib/contracts';

export default function AgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const agentId = BigInt(id);
  const chainId = useChainId();
  const registry = AGENT_IDENTITY[chainId];

  const { data, isLoading } = useReadContract({
    address: registry,
    abi: AGENT_IDENTITY_ABI,
    functionName: 'agents',
    args: [agentId],
    query: { refetchInterval: 10000 },
  });

  return (
    <main className="min-h-screen px-6 py-10 max-w-3xl mx-auto">
      <header className="flex justify-between items-baseline mb-12">
        <Link href="/" className="text-2xl font-bold text-accent">DC.news</Link>
        <span className="text-xs text-muted">Agent Identity</span>
      </header>

      <div className="border border-border p-6 bg-panel">
        <div className="flex justify-between items-baseline mb-4">
          <h1 className="text-xl font-bold">Agent #{id}</h1>
          <span className="text-xs text-muted">ERC-8004 inspired</span>
        </div>

        {isLoading && <p className="text-xs text-muted">Loading...</p>}

        {data && (
          <div className="space-y-4 text-sm">
            <Field label="Controller">
              <code className="text-accent">{(data as readonly [string, string, bigint, boolean])[0]}</code>
            </Field>
            <Field label="Metadata URI">
              <a
                href={(data as readonly [string, string, bigint, boolean])[1]}
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:underline break-all"
              >
                {(data as readonly [string, string, bigint, boolean])[1] || '(empty)'}
              </a>
            </Field>
            <Field label="Minted At">
              {new Date(Number((data as readonly [string, string, bigint, boolean])[2]) * 1000).toLocaleString()}
            </Field>
            <Field label="Active">
              <span className={(data as readonly [string, string, bigint, boolean])[3] ? 'text-accent' : 'text-red-400'}>
                {(data as readonly [string, string, bigint, boolean])[3] ? 'YES' : 'DEACTIVATED'}
              </span>
            </Field>
          </div>
        )}
      </div>

      <footer className="mt-16 pt-8 border-t border-border text-xs text-muted">
        <Link href="/" className="hover:text-accent">← back to feed</Link>
      </footer>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted uppercase tracking-wider mb-1">{label}</div>
      <div>{children}</div>
    </div>
  );
}
