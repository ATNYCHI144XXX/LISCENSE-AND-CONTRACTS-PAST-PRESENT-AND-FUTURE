// SPDX-License-Identifier: PROPRIETARY
pragma solidity ^0.8.20;

/**
 * @title IKSystemsRoyalty
 * @notice Interface for K-Systems Royalty & IP Licensing System
 * @dev Manages royalty distribution for 77+ IP systems across K-Stack
 * Crown Omega Verification: IP portfolio backed by formal mathematical proofs
 */
interface IKSystemsRoyalty {
    // Structs
    struct IPAsset {
        string assetId;
        string name;
        address[] recipients;
        uint256[] shares; // Basis points (10000 = 100%)
        uint256 totalEarned;
        bool active;
        string category;
    }

    struct Payment {
        uint256 amount;
        uint256 timestamp;
        address payer;
        string assetId;
    }

    // Events
    event IPAssetRegistered(string indexed assetId, string name, string category);
    event IPAssetUpdated(string indexed assetId);
    event IPAssetDeactivated(string indexed assetId);
    event RoyaltyPaymentReceived(string indexed assetId, address indexed payer, uint256 amount);
    event RoyaltyDistributed(string indexed assetId, address indexed recipient, uint256 amount);
    event RecipientsUpdated(string indexed assetId, address[] recipients, uint256[] shares);
    event FundsWithdrawn(address indexed recipient, uint256 amount);

    // Registration Functions
    function registerIPAsset(
        string calldata assetId,
        string calldata name,
        string calldata category,
        address[] calldata recipients,
        uint256[] calldata shares
    ) external;
    
    function updateRecipients(
        string calldata assetId,
        address[] calldata recipients,
        uint256[] calldata shares
    ) external;
    
    function deactivateIPAsset(string calldata assetId) external;
    
    // Payment Functions
    function payRoyalty(string calldata assetId) external payable;
    function payRoyaltyERC20(string calldata assetId, address token, uint256 amount) external;
    function distributeRoyalties(string calldata assetId) external;
    
    // Withdrawal Functions
    function withdraw() external;
    function withdrawERC20(address token) external;
    
    // View Functions
    function getIPAsset(string calldata assetId) external view returns (IPAsset memory);
    function getBalance(address account) external view returns (uint256);
    function getERC20Balance(address account, address token) external view returns (uint256);
    function getTotalEarned(string calldata assetId) external view returns (uint256);
    function getPaymentHistory(string calldata assetId) external view returns (Payment[] memory);
    function isAssetActive(string calldata assetId) external view returns (bool);
}
