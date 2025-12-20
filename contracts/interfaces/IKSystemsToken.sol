// SPDX-License-Identifier: PROPRIETARY
pragma solidity ^0.8.20;

/**
 * @title IKSystemsToken
 * @notice Interface for K-Systems Token (KSYS) - ERC-20 with governance features
 * @dev Sovereign Asset Token representing K-Systems IP portfolio
 * Crown Omega Verification: Asset backed by $2.8T+ IP infrastructure
 */
interface IKSystemsToken {
    // Events
    event TokensMinted(address indexed to, uint256 amount, string reason);
    event TokensBurned(address indexed from, uint256 amount, string reason);
    event SnapshotCreated(uint256 indexed snapshotId);
    event EmergencyPause(address indexed operator, string reason);
    event EmergencyUnpause(address indexed operator);

    // Core ERC-20 Functions
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);

    // Extended Functions
    function mint(address to, uint256 amount, string calldata reason) external;
    function burn(uint256 amount, string calldata reason) external;
    function burnFrom(address account, uint256 amount, string calldata reason) external;
    
    // Governance & Snapshots
    function snapshot() external returns (uint256);
    function balanceOfAt(address account, uint256 snapshotId) external view returns (uint256);
    function totalSupplyAt(uint256 snapshotId) external view returns (uint256);
    
    // Emergency Controls
    function pause() external;
    function unpause() external;
    function paused() external view returns (bool);
}
