// Compile Solidity contracts using solc-js. Output artifacts to ./artifacts/.
// Run: node compile.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import solc from 'solc';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CONTRACTS_DIR = path.join(ROOT, 'contracts');
const OUT_DIR = path.join(ROOT, 'artifacts');

const SOURCES = ['SignalRegistry.sol', 'AgentIdentity.sol'];

const sources = {};
for (const name of SOURCES) {
  sources[name] = { content: fs.readFileSync(path.join(CONTRACTS_DIR, name), 'utf8') };
}

const input = {
  language: 'Solidity',
  sources,
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  const fatal = output.errors.filter((e) => e.severity === 'error');
  for (const e of output.errors) console.log(e.formattedMessage);
  if (fatal.length) process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const file of Object.keys(output.contracts)) {
  for (const name of Object.keys(output.contracts[file])) {
    const artifact = output.contracts[file][name];
    fs.writeFileSync(
      path.join(OUT_DIR, `${name}.json`),
      JSON.stringify({ abi: artifact.abi, bytecode: '0x' + artifact.evm.bytecode.object }, null, 2)
    );
    console.log(`✓ ${name} → artifacts/${name}.json`);
  }
}
