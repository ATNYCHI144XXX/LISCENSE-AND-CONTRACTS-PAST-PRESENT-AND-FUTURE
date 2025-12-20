// SPDX-License-Identifier: PROPRIETARY
pragma solidity ^0.8.20;

/**
 * @title IKSystemsTreasury
 * @notice Interface for K-Systems Multi-Signature Treasury
 * @dev Implements PDCN disbursement protocol with time-locks and multi-sig
 * Crown Omega Verification: All transactions verified via sovereign protocol
 */
interface IKSystemsTreasury {
    // Structs
    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
        uint256 confirmations;
        uint256 submittedAt;
        uint256 executeAfter;
        string description;
    }

    // Events
    event SignerAdded(address indexed signer);
    event SignerRemoved(address indexed signer);
    event ThresholdChanged(uint256 newThreshold);
    event TransactionSubmitted(uint256 indexed txId, address indexed submitter, string description);
    event TransactionConfirmed(uint256 indexed txId, address indexed signer);
    event TransactionRevoked(uint256 indexed txId, address indexed signer);
    event TransactionExecuted(uint256 indexed txId, address indexed executor);
    event DepositReceived(address indexed sender, uint256 amount);
    event ERC20Withdrawn(address indexed token, address indexed to, uint256 amount);
    event EmergencyRecovery(address indexed token, address indexed to, uint256 amount, string reason);

    // Core Functions
    function submitTransaction(
        address to,
        uint256 value,
        bytes calldata data,
        string calldata description
    ) external returns (uint256 txId);
    
    function confirmTransaction(uint256 txId) external;
    function revokeConfirmation(uint256 txId) external;
    function executeTransaction(uint256 txId) external;
    
    // Management Functions
    function addSigner(address signer) external;
    function removeSigner(address signer) external;
    function changeThreshold(uint256 newThreshold) external;
    function changeTimelock(uint256 newTimelock) external;
    
    // View Functions
    function getTransaction(uint256 txId) external view returns (Transaction memory);
    function getTransactionCount() external view returns (uint256);
    function getConfirmations(uint256 txId) external view returns (address[] memory);
    function isSigner(address account) external view returns (bool);
    function getSigners() external view returns (address[] memory);
    function getThreshold() external view returns (uint256);
    function getTimelock() external view returns (uint256);
    
    // ERC20 Support
    function withdrawERC20(address token, address to, uint256 amount) external;
    
    // Emergency Functions
    function emergencyRecovery(address token, address to, uint256 amount, string calldata reason) external;
}
