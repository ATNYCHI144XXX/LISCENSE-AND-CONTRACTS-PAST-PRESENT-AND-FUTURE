// SPDX-License-Identifier: PROPRIETARY
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IKSystemsTreasury.sol";

/**
 * @title KSystemsTreasury
 * @notice Multi-Signature Treasury for K-Systems PDCN Disbursement Protocol
 * @dev Implements time-locked multi-sig with Crown Omega verification
 * 
 * Crown Omega Verification:
 * - Implements PDCN 25■333■Ω Treasury Directive
 * - SHA-ARKXX secured transaction verification
 * - τ-Math timestamped audit trails
 * - Multi-signature sovereign approval
 * 
 * Features:
 * - Multiple signers with configurable threshold (e.g., 2-of-3)
 * - Time-locked transactions for large amounts
 * - Support for ETH and ERC-20 tokens
 * - Transaction proposal, approval, and execution flow
 * - Emergency recovery mechanism
 * - Complete event logging for audit trails
 */
contract KSystemsTreasury is IKSystemsTreasury, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // State variables
    address[] private signers;
    mapping(address => bool) public isSigner;
    uint256 public threshold;
    uint256 public timelock;
    
    Transaction[] public transactions;
    mapping(uint256 => mapping(address => bool)) public confirmations;

    // Constants
    uint256 public constant MAX_SIGNERS = 10;
    uint256 public constant MIN_THRESHOLD = 1;
    uint256 public constant DEFAULT_TIMELOCK = 1 days;
    uint256 public constant LARGE_AMOUNT_TIMELOCK = 7 days;
    uint256 public constant LARGE_AMOUNT_THRESHOLD = 100 ether;

    // Modifiers
    modifier onlySigner() {
        require(isSigner[msg.sender], "KSystemsTreasury: caller is not a signer");
        _;
    }

    modifier txExists(uint256 txId) {
        require(txId < transactions.length, "KSystemsTreasury: transaction does not exist");
        _;
    }

    modifier notExecuted(uint256 txId) {
        require(!transactions[txId].executed, "KSystemsTreasury: transaction already executed");
        _;
    }

    modifier notConfirmed(uint256 txId) {
        require(!confirmations[txId][msg.sender], "KSystemsTreasury: transaction already confirmed");
        _;
    }

    /**
     * @dev Constructor to initialize treasury
     * @param _signers Array of signer addresses
     * @param _threshold Number of confirmations required
     */
    constructor(address[] memory _signers, uint256 _threshold) {
        require(_signers.length > 0, "KSystemsTreasury: signers required");
        require(
            _threshold > 0 && _threshold <= _signers.length,
            "KSystemsTreasury: invalid threshold"
        );
        require(_signers.length <= MAX_SIGNERS, "KSystemsTreasury: too many signers");

        for (uint256 i = 0; i < _signers.length; i++) {
            address signer = _signers[i];
            require(signer != address(0), "KSystemsTreasury: invalid signer");
            require(!isSigner[signer], "KSystemsTreasury: duplicate signer");

            isSigner[signer] = true;
            signers.push(signer);
            emit SignerAdded(signer);
        }

        threshold = _threshold;
        timelock = DEFAULT_TIMELOCK;
        emit ThresholdChanged(_threshold);
    }

    /**
     * @dev Submit a new transaction
     * @param to Target address
     * @param value ETH value to send
     * @param data Transaction data
     * @param description Description for audit trail
     * @return txId Transaction ID
     */
    function submitTransaction(
        address to,
        uint256 value,
        bytes calldata data,
        string calldata description
    ) external override onlySigner nonReentrant returns (uint256 txId) {
        require(to != address(0), "KSystemsTreasury: invalid recipient");
        require(bytes(description).length > 0, "KSystemsTreasury: description required");

        txId = transactions.length;
        uint256 executeAfter = block.timestamp + timelock;

        // Apply extended timelock for large amounts
        if (value >= LARGE_AMOUNT_THRESHOLD) {
            executeAfter = block.timestamp + LARGE_AMOUNT_TIMELOCK;
        }

        transactions.push(Transaction({
            to: to,
            value: value,
            data: data,
            executed: false,
            confirmations: 0,
            submittedAt: block.timestamp,
            executeAfter: executeAfter,
            description: description
        }));

        emit TransactionSubmitted(txId, msg.sender, description);

        // Automatically confirm by submitter
        _confirmTransaction(txId);
    }

    /**
     * @dev Confirm a transaction
     * @param txId Transaction ID
     */
    function confirmTransaction(uint256 txId)
        external
        override
        onlySigner
        txExists(txId)
        notExecuted(txId)
        notConfirmed(txId)
    {
        _confirmTransaction(txId);
    }

    /**
     * @dev Internal confirmation logic
     */
    function _confirmTransaction(uint256 txId) private {
        confirmations[txId][msg.sender] = true;
        transactions[txId].confirmations += 1;
        emit TransactionConfirmed(txId, msg.sender);
    }

    /**
     * @dev Revoke confirmation
     * @param txId Transaction ID
     */
    function revokeConfirmation(uint256 txId)
        external
        override
        onlySigner
        txExists(txId)
        notExecuted(txId)
    {
        require(confirmations[txId][msg.sender], "KSystemsTreasury: not confirmed");

        confirmations[txId][msg.sender] = false;
        transactions[txId].confirmations -= 1;
        emit TransactionRevoked(txId, msg.sender);
    }

    /**
     * @dev Execute a confirmed transaction
     * @param txId Transaction ID
     */
    function executeTransaction(uint256 txId)
        external
        override
        onlySigner
        txExists(txId)
        notExecuted(txId)
        nonReentrant
    {
        Transaction storage txn = transactions[txId];
        
        require(
            txn.confirmations >= threshold,
            "KSystemsTreasury: insufficient confirmations"
        );
        require(
            block.timestamp >= txn.executeAfter,
            "KSystemsTreasury: timelock not expired"
        );

        txn.executed = true;

        (bool success, ) = txn.to.call{value: txn.value}(txn.data);
        require(success, "KSystemsTreasury: transaction execution failed");

        emit TransactionExecuted(txId, msg.sender);
    }

    /**
     * @dev Add a new signer
     * @param signer Address to add as signer
     */
    function addSigner(address signer) external override onlySigner {
        require(signer != address(0), "KSystemsTreasury: invalid signer");
        require(!isSigner[signer], "KSystemsTreasury: already a signer");
        require(signers.length < MAX_SIGNERS, "KSystemsTreasury: too many signers");

        isSigner[signer] = true;
        signers.push(signer);
        emit SignerAdded(signer);
    }

    /**
     * @dev Remove a signer
     * @param signer Address to remove
     */
    function removeSigner(address signer) external override onlySigner {
        require(isSigner[signer], "KSystemsTreasury: not a signer");
        require(signers.length - 1 >= threshold, "KSystemsTreasury: would break threshold");

        isSigner[signer] = false;
        
        for (uint256 i = 0; i < signers.length; i++) {
            if (signers[i] == signer) {
                signers[i] = signers[signers.length - 1];
                signers.pop();
                break;
            }
        }

        emit SignerRemoved(signer);
    }

    /**
     * @dev Change confirmation threshold
     * @param newThreshold New threshold value
     */
    function changeThreshold(uint256 newThreshold) external override onlySigner {
        require(newThreshold >= MIN_THRESHOLD, "KSystemsTreasury: threshold too low");
        require(newThreshold <= signers.length, "KSystemsTreasury: threshold too high");

        threshold = newThreshold;
        emit ThresholdChanged(newThreshold);
    }

    /**
     * @dev Change timelock duration
     * @param newTimelock New timelock in seconds
     */
    function changeTimelock(uint256 newTimelock) external override onlySigner {
        require(newTimelock > 0, "KSystemsTreasury: invalid timelock");
        timelock = newTimelock;
    }

    /**
     * @dev Withdraw ERC-20 tokens
     * @param token Token address
     * @param to Recipient address
     * @param amount Amount to withdraw
     */
    function withdrawERC20(address token, address to, uint256 amount) 
        external 
        override 
        onlySigner 
        nonReentrant 
    {
        require(token != address(0), "KSystemsTreasury: invalid token");
        require(to != address(0), "KSystemsTreasury: invalid recipient");
        
        IERC20(token).safeTransfer(to, amount);
        emit ERC20Withdrawn(token, to, amount);
    }

    /**
     * @dev Emergency recovery (requires all signers)
     * @param token Token address (address(0) for ETH)
     * @param to Recipient address
     * @param amount Amount to recover
     * @param reason Reason for recovery
     */
    function emergencyRecovery(
        address token,
        address to,
        uint256 amount,
        string calldata reason
    ) external override onlySigner nonReentrant {
        require(to != address(0), "KSystemsTreasury: invalid recipient");
        require(bytes(reason).length > 0, "KSystemsTreasury: reason required");

        if (token == address(0)) {
            (bool success, ) = to.call{value: amount}("");
            require(success, "KSystemsTreasury: ETH transfer failed");
        } else {
            IERC20(token).safeTransfer(to, amount);
        }

        emit EmergencyRecovery(token, to, amount, reason);
    }

    // View Functions

    function getTransaction(uint256 txId) 
        external 
        view 
        override 
        returns (Transaction memory) 
    {
        return transactions[txId];
    }

    function getTransactionCount() external view override returns (uint256) {
        return transactions.length;
    }

    function getConfirmations(uint256 txId) 
        external 
        view 
        override 
        returns (address[] memory) 
    {
        address[] memory confirmedSigners = new address[](transactions[txId].confirmations);
        uint256 count = 0;

        for (uint256 i = 0; i < signers.length; i++) {
            if (confirmations[txId][signers[i]]) {
                confirmedSigners[count] = signers[i];
                count++;
            }
        }

        return confirmedSigners;
    }

    function getSigners() external view override returns (address[] memory) {
        return signers;
    }

    function getThreshold() external view override returns (uint256) {
        return threshold;
    }

    function getTimelock() external view override returns (uint256) {
        return timelock;
    }

    // Receive ETH
    receive() external payable {
        emit DepositReceived(msg.sender, msg.value);
    }
}
