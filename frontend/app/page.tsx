'use client';
import { useState } from 'react';
import { useAccount, useChainId, useConnect, useDisconnect, useReadContract, useReadContracts, useWriteContract } from 'wagmi';
import { injected } from 'wagmi/connectors';
import Link from 'next/link';
import { SIGNAL_REGISTRY, SIGNAL_REGISTRY_ABI } from './lib/contracts';
import { mantleSepolia } from './lib/chains';
import { SignalDetail } from './components/SignalDetail';

type Signal = {
  id: bigint;
  submitter: `0x${string}`;
  headline: string;
  contentURI: string;
  submittedAt: bigint;
  gradedAt: bigint;
  score: number;
  graded: boolean;
};

export default function Home() {
  const chainId = useChainId();
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const registry = SIGNAL_REGISTRY[chainId];
  const [selectedId, setSelectedId] = useState<bigint | null>(null);

  const { data: total } = useReadContract({
    address: registry,
    abi: SIGNAL_REGISTRY_ABI,
    functionName: 'totalSignals',
    query: { refetchInterval: 5000 },
  });

  const totalNum = total ? Number(total) : 0;

  return (
    <main className="min-h-screen px-6 py-10 max-w-3xl mx-auto">
      <header className="flex justify-between items-baseline mb-12">
        <div>
          <h1 className="text-2xl font-bold text-accent">DC.news</h1>
          <p className="text-sm text-muted">on Mantle — every submit + AI grade lives on-chain</p>
        </div>
        <div className="text-xs">
          {isConnected ? (
            <button onClick={() => disconnect()} className="text-muted hover:text-accent">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </button>
          ) : (
            <button onClick={() => connect({ connector: injected() })} className="border border-border px-3 py-1 hover:border-accent hover:text-accent">
              CONNECT
            </button>
          )}
        </div>
      </header>

      {chainId !== mantleSepolia.id && chainId !== 5000 && (
        <div className="mb-6 p-4 border border-accent text-accent text-xs">
          Connect on Mantle Sepolia (5003) or Mantle Mainnet (5000).
        </div>
      )}

      <Stats registry={registry} total={totalNum} />


      <SubmitForm registry={registry} disabled={!isConnected} />

      <section className="mt-12">
        <h2 className="text-sm font-bold text-muted mb-4 uppercase tracking-wider">
          On-chain Signals ({totalNum})
        </h2>
        <SignalList registry={registry} total={totalNum} onSelect={setSelectedId} />
      </section>

      {selectedId !== null && (
        <SignalDetail id={selectedId} registry={registry} onClose={() => setSelectedId(null)} />
      )}

      <footer className="mt-16 pt-8 border-t border-border text-xs text-muted flex justify-between">
        <span>
          Built for the Mantle Turing Test Hackathon 2026 ·{' '}
          <a href="https://github.com/teflonmusk/dc-mantle-agent" className="hover:text-accent">github</a> ·{' '}
          <a href="https://aibtc.news" className="hover:text-accent">DC's prior editorial work</a>
        </span>
        <Link href="/identity" className="hover:text-accent">Agent Identities →</Link>
      </footer>
    </main>
  );
}

function Stats({ registry, total }: { registry: `0x${string}`; total: number }) {
  // Single batched read for last 10 signals — keeps hook count stable
  const sampleIds = Array.from({ length: Math.min(total, 10) }, (_, i) => BigInt(total - 1 - i));
  const { data } = useReadContracts({
    contracts: sampleIds.map((id) => ({
      address: registry,
      abi: SIGNAL_REGISTRY_ABI,
      functionName: 'signals' as const,
      args: [id] as const,
    })),
    query: { refetchInterval: 10000, enabled: total > 0 },
  });
  const loaded = (data ?? []).map((r) => r.result).filter(Boolean) as readonly (readonly [string, string, string, bigint, bigint, number, string, boolean])[];
  const graded = loaded.filter((s) => s[7]);
  const avgScore = graded.length ? Math.round(graded.reduce((acc, s) => acc + s[5], 0) / graded.length) : 0;
  const gradedPct = loaded.length ? Math.round((graded.length / loaded.length) * 100) : 0;

  return (
    <div className="grid grid-cols-3 gap-2 mb-6">
      <Stat label="signals on-chain" value={total} />
      <Stat label="graded (last 10)" value={`${gradedPct}%`} />
      <Stat label="avg score (last 10)" value={graded.length ? `${avgScore}/100` : '—'} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-border bg-panel p-3 text-center">
      <div className="text-lg font-bold text-accent">{value}</div>
      <div className="text-xs text-muted uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}

function SubmitForm({ registry, disabled }: { registry: `0x${string}`; disabled: boolean }) {
  const [headline, setHeadline] = useState('');
  const [contentURI, setContentURI] = useState('');
  const { writeContract, isPending, data: hash } = useWriteContract();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    writeContract({
      address: registry,
      abi: SIGNAL_REGISTRY_ABI,
      functionName: 'submitSignal',
      args: [headline, contentURI],
    });
  }

  return (
    <form onSubmit={submit} className="border border-border p-6 bg-panel">
      <h2 className="text-sm font-bold text-muted mb-4 uppercase tracking-wider">Submit Signal</h2>
      <input
        type="text"
        placeholder="Headline (e.g. Bitcoin Core PR #35320 — BIP32 seed length validation)"
        value={headline}
        onChange={(e) => setHeadline(e.target.value)}
        className="w-full bg-bg border border-border px-3 py-2 mb-3 text-sm focus:border-accent outline-none"
        required
      />
      <input
        type="url"
        placeholder="Content URI (https://...)"
        value={contentURI}
        onChange={(e) => setContentURI(e.target.value)}
        className="w-full bg-bg border border-border px-3 py-2 mb-4 text-sm focus:border-accent outline-none"
        required
      />
      <button
        type="submit"
        disabled={disabled || isPending}
        className="w-full bg-accent text-black py-3 font-bold uppercase tracking-wider text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-orange-500"
      >
        {isPending ? 'Submitting...' : disabled ? 'Connect wallet to submit' : 'Submit + grade on Mantle'}
      </button>
      {hash && (
        <p className="mt-3 text-xs text-muted">
          tx: <a href={`https://sepolia.mantlescan.xyz/tx/${hash}`} className="text-accent hover:underline" target="_blank" rel="noreferrer">{hash.slice(0, 16)}...</a>
        </p>
      )}
    </form>
  );
}

function SignalList({ registry, total, onSelect }: { registry: `0x${string}`; total: number; onSelect: (id: bigint) => void }) {
  if (total === 0) return <p className="text-xs text-muted">No signals yet. Submit the first one above.</p>;
  // Render most-recent-first, last 10
  const ids = Array.from({ length: Math.min(total, 10) }, (_, i) => BigInt(total - 1 - i));
  return (
    <div className="space-y-2">
      {ids.map((id) => <SignalRow key={id.toString()} id={id} registry={registry} onSelect={onSelect} />)}
    </div>
  );
}

function SignalRow({ id, registry, onSelect }: { id: bigint; registry: `0x${string}`; onSelect: (id: bigint) => void }) {
  const { data } = useReadContract({
    address: registry,
    abi: SIGNAL_REGISTRY_ABI,
    functionName: 'signals',
    args: [id],
    query: { refetchInterval: 5000 },
  });
  if (!data) return null;
  const [submitter, headline, , submittedAt, , score, , graded] = data as readonly [
    `0x${string}`, string, string, bigint, bigint, number, `0x${string}`, boolean
  ];
  return (
    <button
      onClick={() => onSelect(id)}
      className="w-full text-left border border-border p-4 bg-panel hover:border-accent transition-colors"
    >
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-xs text-muted">#{id.toString()} · {submitter.slice(0, 6)}...{submitter.slice(-4)}</span>
        {graded ? (
          <span className={`text-xs font-bold ${score >= 80 ? 'text-accent' : score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
            SCORE {score}
          </span>
        ) : (
          <span className="text-xs text-muted animate-pulse">grading...</span>
        )}
      </div>
      <p className="text-sm">{headline}</p>
      <p className="text-xs text-muted mt-1">submitted {new Date(Number(submittedAt) * 1000).toLocaleString()}</p>
    </button>
  );
}
