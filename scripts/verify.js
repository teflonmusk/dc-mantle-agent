// Verify deployed contracts on Mantlescan. Usage: node verify.js <sepolia|mainnet>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import solc from 'solc';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CONTRACTS_DIR = path.join(ROOT, 'contracts');

const network = process.argv[2] || 'sepolia';
const apiKey = process.env.MANTLE_SCAN_API_KEY;
if (!apiKey) {
  console.error('Set MANTLE_SCAN_API_KEY in .env (get at https://mantlescan.xyz/myapikey)');
  process.exit(1);
}

const apiUrl = network === 'sepolia'
  ? 'https://api-sepolia.mantlescan.xyz/api'
  : 'https://api.mantlescan.xyz/api';

const deployments = JSON.parse(fs.readFileSync(path.join(ROOT, 'deployments', `${network}.json`), 'utf8'));

async function verify(name, address, constructorArgs = '') {
  const source = fs.readFileSync(path.join(CONTRACTS_DIR, `${name}.sol`), 'utf8');
  const body = new URLSearchParams({
    apikey: apiKey,
    module: 'contract',
    action: 'verifysourcecode',
    contractaddress: address,
    sourceCode: source,
    contractname: `${name}.sol:${name}`,
    compilerversion: 'v0.8.27+commit.40a35a09',
    optimizationUsed: '1',
    runs: '200',
    constructorArguments: constructorArgs,
    licenseType: '3', // MIT
  });

  console.log(`Verifying ${name} at ${address}...`);
  const res = await fetch(apiUrl, { method: 'POST', body });
  const json = await res.json();
  if (json.status === '1') {
    console.log(`  ✓ submitted: GUID ${json.result}`);
    // Poll for status
    for (let i = 0; i < 12; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const check = await fetch(`${apiUrl}?apikey=${apiKey}&module=contract&action=checkverifystatus&guid=${json.result}`);
      const cj = await check.json();
      console.log(`  [${i + 1}/12] ${cj.result}`);
      if (cj.result.includes('Verified') || cj.result.includes('Already')) {
        console.log(`  ✓ ${name} verified`);
        return;
      }
      if (cj.result.includes('Fail')) {
        console.error(`  ✗ verification failed: ${cj.result}`);
        return;
      }
    }
  } else {
    console.error(`  ✗ ${json.result}`);
  }
}

// AgentIdentity: no constructor args
await verify('AgentIdentity', deployments.contracts.AgentIdentity);

// SignalRegistry: constructor(address _grader) — pad address to 32 bytes
const grader = deployments.deployer.toLowerCase().replace('0x', '').padStart(64, '0');
await verify('SignalRegistry', deployments.contracts.SignalRegistry, grader);
