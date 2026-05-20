// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title DC.news Signal Registry
/// @notice On-chain editorial record. Anyone can submit a signal; only the
///         authorized grader (the DC agent) can post the AI-graded score.
/// @dev Built for the Mantle Turing Test Hackathon 2026. Every submit/grade
///      cycle is permanent and verifiable.
contract SignalRegistry {
    struct Signal {
        address submitter;
        string headline;
        string contentURI;       // ipfs://... or https://... — keeps gas low
        uint64 submittedAt;
        uint64 gradedAt;
        uint16 score;            // 0-100
        bytes32 breakdownHash;   // hash of full score breakdown JSON
        bool graded;
    }

    address public grader;
    address public owner;
    uint256 public nextId;
    mapping(uint256 => Signal) public signals;

    event SignalSubmitted(uint256 indexed id, address indexed submitter, string headline, string contentURI);
    event SignalGraded(uint256 indexed id, uint16 score, bytes32 breakdownHash);
    event GraderUpdated(address indexed oldGrader, address indexed newGrader);

    error NotOwner();
    error NotGrader();
    error AlreadyGraded();
    error InvalidScore();
    error UnknownSignal();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyGrader() {
        if (msg.sender != grader) revert NotGrader();
        _;
    }

    constructor(address _grader) {
        owner = msg.sender;
        grader = _grader;
    }

    /// @notice Anyone may submit a signal. AI grading happens via off-chain
    ///         agent listening to SignalSubmitted, which then calls gradeSignal.
    function submitSignal(string calldata headline, string calldata contentURI) external returns (uint256 id) {
        id = nextId++;
        signals[id] = Signal({
            submitter: msg.sender,
            headline: headline,
            contentURI: contentURI,
            submittedAt: uint64(block.timestamp),
            gradedAt: 0,
            score: 0,
            breakdownHash: bytes32(0),
            graded: false
        });
        emit SignalSubmitted(id, msg.sender, headline, contentURI);
    }

    /// @notice Grader (the DC agent) posts the AI-derived quality score.
    /// @dev Score range 0-100. breakdownHash is keccak256 of the full
    ///      JSON breakdown stored at contentURI metadata.
    function gradeSignal(uint256 id, uint16 score, bytes32 breakdownHash) external onlyGrader {
        if (id >= nextId) revert UnknownSignal();
        Signal storage s = signals[id];
        if (s.graded) revert AlreadyGraded();
        if (score > 100) revert InvalidScore();
        s.score = score;
        s.breakdownHash = breakdownHash;
        s.gradedAt = uint64(block.timestamp);
        s.graded = true;
        emit SignalGraded(id, score, breakdownHash);
    }

    function setGrader(address newGrader) external onlyOwner {
        emit GraderUpdated(grader, newGrader);
        grader = newGrader;
    }

    function totalSignals() external view returns (uint256) {
        return nextId;
    }
}
