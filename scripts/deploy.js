// Deploy SignalRegistry + AgentIdentity to Mantle. Usage:
//   node deploy.js sepolia
//   node deploy.js mainnet
// Requires .env with MANTLE_PRIVATE_KEY set.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { defineChain } from 'viem';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ARTIFACTS = path.join(ROOT, 'artifacts');
const DEPLOYMENTS = path.join(ROOT, 'deployments');

const network = process.argv[2] || 'sepolia';
if (!['sepolia', 'mainnet'].includes(network)) {
  console.error('Usage: node deploy.js <sepolia|mainnet>');
  process.exit(1);
}

const chains = {
  sepolia: defineChain({
    id: 5003,
    name: 'Mantle Sepolia',
    nativeCurrency: { name: 'MNT', symbol: 'MNT', decimals: 18 },
    rpcUrls: { default: { http: ['https://rpc.sepolia.mantle.xyz'] } },
    blockExplorers: { default: { name: 'Mantlescan Sepolia', url: 'https://sepolia.mantlescan.xyz' } },
  }),
  mainnet: defineChain({
    id: 5000,
    name: 'Mantle',
    nativeCurrency: { name: 'MNT', symbol: 'MNT', decimals: 18 },
    rpcUrls: { default: { http: ['https://rpc.mantle.xyz'] } },
    blockExplorers: { default: { name: 'Mantlescan', url: 'https://explorer.mantle.xyz' } },
  }),
};

const chain = chains[network];
const pk = process.env.MANTLE_PRIVATE_KEY;
if (!pk || !pk.startsWith('0x')) {
  console.error('Set MANTLE_PRIVATE_KEY in .env (0x-prefixed 64-char hex)');
  process.exit(1);
}

const account = privateKeyToAccount(pk);
const publicClient = createPublicClient({ chain, transport: http() });
const walletClient = createWalletClient({ account, chain, transport: http() });

console.log(`Deployer: ${account.address}`);
console.log(`Network: ${chain.name} (${chain.id})`);
const balance = await publicClient.getBalance({ address: account.address });
console.log(`Balance: ${Number(balance) / 1e18} MNT`);
if (balance < 1_000_000_000_000_000n) {
  console.error('Balance too low. Fund the deployer first.');
  if (network === 'sepolia') console.error('Faucet: https://faucet.sepolia.mantle.xyz/');
  process.exit(1);
}

async function deploy(name, args = []) {
  const artifact = JSON.parse(fs.readFileSync(path.join(ARTIFACTS, `${name}.json`), 'utf8'));
  console.log(`\nDeploying ${name}...`);
  const hash = await walletClient.deployContract({ abi: artifact.abi, bytecode: artifact.bytecode, args });
  console.log(`  tx: ${hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`  ✓ ${name} @ ${receipt.contractAddress} (block ${receipt.blockNumber})`);
  return receipt.contractAddress;
}

// AgentIdentity first (no constructor args)
const agentIdentity = await deploy('AgentIdentity');
// SignalRegistry takes initial grader address (the deployer = DC agent for now)
const signalRegistry = await deploy('SignalRegistry', [account.address]);

fs.mkdirSync(DEPLOYMENTS, { recursive: true });
const record = {
  network,
  chainId: chain.id,
  deployer: account.address,
  deployedAt: new Date().toISOString(),
  contracts: { AgentIdentity: agentIdentity, SignalRegistry: signalRegistry },
};
fs.writeFileSync(path.join(DEPLOYMENTS, `${network}.json`), JSON.stringify(record, null, 2));
console.log(`\n✓ Saved: deployments/${network}.json`);
console.log(`\nVerify next:`);
console.log(`  https://${network === 'sepolia' ? 'sepolia.mantlescan.xyz' : 'explorer.mantle.xyz'}/address/${signalRegistry}`);
