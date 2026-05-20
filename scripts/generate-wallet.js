// Generate a fresh EVM wallet for hackathon ops. Writes ONLY to local file.
// Usage: node generate-wallet.js
// The private key is written to .env (gitignored). Public address is printed.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT, '.env');

const pk = generatePrivateKey();
const account = privateKeyToAccount(pk);

// Read existing .env if present, otherwise seed from .env.example
let env;
if (fs.existsSync(ENV_PATH)) {
  env = fs.readFileSync(ENV_PATH, 'utf8');
} else {
  env = fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8');
}

// Replace or insert MANTLE_PRIVATE_KEY
if (env.includes('MANTLE_PRIVATE_KEY=')) {
  env = env.replace(/MANTLE_PRIVATE_KEY=.*/m, `MANTLE_PRIVATE_KEY=${pk}`);
} else {
  env += `\nMANTLE_PRIVATE_KEY=${pk}\n`;
}

fs.writeFileSync(ENV_PATH, env, { mode: 0o600 });

console.log(`✓ Generated fresh hackathon wallet`);
console.log(`  Public address: ${account.address}`);
console.log(`  Private key:    written to .env (mode 600, gitignored)`);
console.log(`\nFund this address with:`);
console.log(`  • Testnet (free):  https://faucet.sepolia.mantle.xyz/  → paste address`);
console.log(`  • Mainnet (real):  send $20-50 of MNT from any exchange to ${account.address}`);
console.log(`\nDO NOT use this wallet for anything except this hackathon. Rotate after submission.`);
