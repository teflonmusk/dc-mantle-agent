'use client';
import { useReadContract } from 'wagmi';
import { SIGNAL_REGISTRY_ABI } from '../lib/contracts';

type Props = {
  id: bigint;
  registry: `0x${string}`;
  onClose: () => void;
};

export function SignalDetail({ id, registry, onClose }: Props) {
  const { data } = useReadContract({
    address: registry,
    abi: SIGNAL_REGISTRY_ABI,
    functionName: 'signals',
    args: [id],
    query: { refetchInterval: 5000 },
  });

  if (!data) {
    return (
      <Backdrop onClose={onClose}>
        <div className="p-6 text-xs text-muted">Loading...</div>
      </Backdrop>
    );
  }

  const [submitter, headline, contentURI, submittedAt, gradedAt, score, breakdownHash, graded] = data as readonly [
    `0x${string}`, string, string, bigint, bigint, number, `0x${string}`, boolean
  ];

  return (
    <Backdrop onClose={onClose}>
      <div className="p-6 max-w-2xl">
        <div className="flex justify-between items-baseline mb-4">
          <h2 className="text-lg font-bold">Signal #{id.toString()}</h2>
          <button onClick={onClose} className="text-muted hover:text-accent text-sm">✕ close</button>
        </div>

        <div className="mb-4">
          <h3 className="text-base font-bold text-accent mb-2">{headline}</h3>
          <a href={contentURI} target="_blank" rel="noreferrer" className="text-xs text-muted hover:text-accent break-all">
            ↗ {contentURI}
          </a>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 text-xs">
          <Field label="Submitter">
            <code className="text-accent">{submitter.slice(0, 10)}...{submitter.slice(-6)}</code>
          </Field>
          <Field label="Submitted">{new Date(Number(submittedAt) * 1000).toLocaleString()}</Field>
          {graded && (
            <>
              <Field label="Graded">{new Date(Number(gradedAt) * 1000).toLocaleString()}</Field>
              <Field label="Latency">
                {Math.floor((Number(gradedAt) - Number(submittedAt)) / 1)}s
              </Field>
            </>
          )}
        </div>

        {graded ? (
          <div className="border border-border bg-bg p-4">
            <div className="flex justify-between items-baseline mb-3">
              <span className="text-xs text-muted uppercase tracking-wider">AI Score</span>
              <span className={`text-3xl font-bold ${score >= 80 ? 'text-accent' : score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                {score}<span className="text-sm text-muted">/100</span>
              </span>
            </div>
            <div className="space-y-1 text-xs">
              <BreakdownBar label="Source Quality" max={30} />
              <BreakdownBar label="Thesis Clarity" max={25} />
              <BreakdownBar label="Beat Relevance" max={20} />
              <BreakdownBar label="Timeliness" max={15} />
              <BreakdownBar label="Disclosure" max={10} />
            </div>
            <p className="text-xs text-muted mt-3 break-all">
              Breakdown hash: <code>{breakdownHash.slice(0, 18)}...</code>
            </p>
          </div>
        ) : (
          <div className="border border-border bg-bg p-6 text-center">
            <p className="text-sm text-muted animate-pulse">DC agent is grading this signal...</p>
            <p className="text-xs text-muted mt-2">Typically lands within 10-20 seconds.</p>
          </div>
        )}
      </div>
    </Backdrop>
  );
}

function Backdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-panel border border-border max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-muted uppercase tracking-wider mb-1">{label}</div>
      <div>{children}</div>
    </div>
  );
}

function BreakdownBar({ label, max }: { label: string; max: number }) {
  return (
    <div>
      <div className="flex justify-between mb-0.5">
        <span className="text-muted">{label}</span>
        <span className="text-accent">— /{max}</span>
      </div>
      <div className="h-1 bg-border" />
    </div>
  );
}
