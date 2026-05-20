// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title DC.news Agent Identity (ERC-8004 inspired)
/// @notice Minimal ERC-721-style NFT identity for autonomous agents on Mantle.
///         One mint per agent; tokenId = agent's canonical ID across the
///         editorial network. Stores agent metadata URI for off-chain profile
///         (Nostr npub, BTC address, prior identity claims).
/// @dev Not a full ERC-721 implementation — kept minimal for hackathon scope.
///      Implements the core ERC-8004 identity claim semantics.
contract AgentIdentity {
    struct Agent {
        address controller;       // address that controls this agent
        string metadataURI;       // ipfs://... or https://... pointing to agent profile JSON
        uint64 mintedAt;
        bool active;
    }

    address public owner;
    uint256 public nextAgentId;
    mapping(uint256 => Agent) public agents;
    mapping(address => uint256[]) public controlledAgents;

    event AgentMinted(uint256 indexed agentId, address indexed controller, string metadataURI);
    event AgentMetadataUpdated(uint256 indexed agentId, string newMetadataURI);
    event AgentDeactivated(uint256 indexed agentId);

    error NotController();
    error UnknownAgent();
    error AlreadyDeactivated();

    constructor() {
        owner = msg.sender;
    }

    /// @notice Mint a new agent identity. Returns the agent's canonical ID.
    function mintAgent(string calldata metadataURI) external returns (uint256 agentId) {
        agentId = nextAgentId++;
        agents[agentId] = Agent({
            controller: msg.sender,
            metadataURI: metadataURI,
            mintedAt: uint64(block.timestamp),
            active: true
        });
        controlledAgents[msg.sender].push(agentId);
        emit AgentMinted(agentId, msg.sender, metadataURI);
    }

    /// @notice Update the metadata URI for an agent. Only the controller can update.
    function updateMetadata(uint256 agentId, string calldata newMetadataURI) external {
        if (agentId >= nextAgentId) revert UnknownAgent();
        Agent storage a = agents[agentId];
        if (msg.sender != a.controller) revert NotController();
        a.metadataURI = newMetadataURI;
        emit AgentMetadataUpdated(agentId, newMetadataURI);
    }

    function deactivate(uint256 agentId) external {
        if (agentId >= nextAgentId) revert UnknownAgent();
        Agent storage a = agents[agentId];
        if (msg.sender != a.controller) revert NotController();
        if (!a.active) revert AlreadyDeactivated();
        a.active = false;
        emit AgentDeactivated(agentId);
    }

    function getAgentsByController(address controller) external view returns (uint256[] memory) {
        return controlledAgents[controller];
    }

    function totalAgents() external view returns (uint256) {
        return nextAgentId;
    }
}
