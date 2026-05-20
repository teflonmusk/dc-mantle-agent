// CLI helper: submit a test signal to SignalRegistry.
// Usage: node submit-signal.js sepolia "Headline here" "https://example.com/content"
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPublicClient, createWalletClient, http, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const [, , network, headline, contentURI] = process.argv;
if (!network || !headline || !contentURI) {
  console.error('Usage: node submit-signal.js <sepolia|mainnet> "<headline>" "<contentURI>"');
  process.exit(1);
}

const chains = {
  sepolia: defineChain({ id: 5003, name: 'Mantle Sepolia', nativeCurrency: { name: 'MNT', symbol: 'MNT', decimals: 18 }, rpcUrls: { default: { http: ['https://rpc.sepolia.mantle.xyz'] } } }),
  mainnet: defineChain({ id: 5000, name: 'Mantle', nativeCurrency: { name: 'MNT', symbol: 'MNT', decimals: 18 }, rpcUrls: { default: { http: ['https://rpc.mantle.xyz'] } } }),
};
const chain = chains[network];

const deployments = JSON.parse(fs.readFileSync(path.join(ROOT, 'deployments', `${network}.json`), 'utf8'));
const artifact = JSON.parse(fs.readFileSync(path.join(ROOT, 'artifacts', 'SignalRegistry.json'), 'utf8'));
const REGISTRY = deployments.contracts.SignalRegistry;

const account = privateKeyToAccount(process.env.MANTLE_PRIVATE_KEY);
const publicClient = createPublicClient({ chain, transport: http() });
const walletClient = createWalletClient({ account, chain, transport: http() });

console.log(`Submitting signal to ${REGISTRY} on ${chain.name}...`);
const hash = await walletClient.writeContract({
  address: REGISTRY,
  abi: artifact.abi,
  functionName: 'submitSignal',
  args: [headline, contentURI],
});
console.log(`  tx: ${hash}`);
const receipt = await publicClient.waitForTransactionReceipt({ hash });
console.log(`  ✓ submitted in block ${receipt.blockNumber}`);
const total = await publicClient.readContract({ address: REGISTRY, abi: artifact.abi, functionName: 'totalSignals' });
console.log(`  total signals now: ${total}`);
console.log(`\nNow the off-chain agent should grade it. Run \`python agent/main.py\` to start the listener.`);
