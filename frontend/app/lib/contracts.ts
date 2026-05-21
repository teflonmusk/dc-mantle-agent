// Deployed contract addresses + ABIs. Addresses populated after deploy
// by copying from /deployments/<network>.json — kept in source for the demo.

export const SIGNAL_REGISTRY: Record<number, `0x${string}`> = {
  5003: '0x0000000000000000000000000000000000000000', // sepolia — fill after deploy
  5000: '0x0000000000000000000000000000000000000000', // mainnet — fill after deploy
};

export const AGENT_IDENTITY: Record<number, `0x${string}`> = {
  5003: '0x0000000000000000000000000000000000000000',
  5000: '0x0000000000000000000000000000000000000000',
};

export const AGENT_IDENTITY_ABI = [
  {
    type: 'function', name: 'mintAgent', stateMutability: 'nonpayable',
    inputs: [{ name: 'metadataURI', type: 'string' }],
    outputs: [{ name: 'agentId', type: 'uint256' }],
  },
  {
    type: 'function', name: 'agents', stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [
      { name: 'controller', type: 'address' },
      { name: 'metadataURI', type: 'string' },
      { name: 'mintedAt', type: 'uint64' },
      { name: 'active', type: 'bool' },
    ],
  },
  {
    type: 'function', name: 'totalAgents', stateMutability: 'view',
    inputs: [], outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function', name: 'updateMetadata', stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'newMetadataURI', type: 'string' },
    ],
    outputs: [],
  },
  {
    type: 'event', name: 'AgentMinted',
    inputs: [
      { name: 'agentId', type: 'uint256', indexed: true },
      { name: 'controller', type: 'address', indexed: true },
      { name: 'metadataURI', type: 'string', indexed: false },
    ],
  },
] as const;

export const SIGNAL_REGISTRY_ABI = [
  {
    type: 'function', name: 'submitSignal', stateMutability: 'nonpayable',
    inputs: [{ name: 'headline', type: 'string' }, { name: 'contentURI', type: 'string' }],
    outputs: [{ name: 'id', type: 'uint256' }],
  },
  {
    type: 'function', name: 'signals', stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [
      { name: 'submitter', type: 'address' },
      { name: 'headline', type: 'string' },
      { name: 'contentURI', type: 'string' },
      { name: 'submittedAt', type: 'uint64' },
      { name: 'gradedAt', type: 'uint64' },
      { name: 'score', type: 'uint16' },
      { name: 'breakdownHash', type: 'bytes32' },
      { name: 'graded', type: 'bool' },
    ],
  },
  {
    type: 'function', name: 'totalSignals', stateMutability: 'view',
    inputs: [], outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'event', name: 'SignalSubmitted',
    inputs: [
      { name: 'id', type: 'uint256', indexed: true },
      { name: 'submitter', type: 'address', indexed: true },
      { name: 'headline', type: 'string', indexed: false },
      { name: 'contentURI', type: 'string', indexed: false },
    ],
  },
  {
    type: 'event', name: 'SignalGraded',
    inputs: [
      { name: 'id', type: 'uint256', indexed: true },
      { name: 'score', type: 'uint16', indexed: false },
      { name: 'breakdownHash', type: 'bytes32', indexed: false },
    ],
  },
] as const;
