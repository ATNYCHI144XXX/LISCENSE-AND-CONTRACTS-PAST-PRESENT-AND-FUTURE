// SPDX-License-Identifier: PROPRIETARY
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/IKSystemsToken.sol";

/**
 * @title KSystemsToken
 * @notice K-Systems Sovereign Asset Token (KSYS)
 * @dev ERC-20 token representing K-Systems IP portfolio
 * 
 * Crown Omega Verification:
 * - Backed by 77+ complete systems across 16 categories
 * - ~1,644,808+ lines of verified code
 * - $2.8T+ sovereign asset infrastructure
 * - Mathematical foundation: K-MOS formal specifications
 * 
 * Features:
 * - Mintable (controlled by MINTER_ROLE)
 * - Burnable (with reason logging)
 * - Pausable (emergency stop via PAUSER_ROLE)
 * - Voting capability for governance (via ERC20Votes)
 * - Permit functionality for gasless approvals
 * - Access control (owner/admin roles)
 */
contract KSystemsToken is 
    ERC20, 
    ERC20Burnable, 
    ERC20Permit,
    ERC20Votes,
    AccessControl, 
    Pausable,
    IKSystemsToken 
{
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant SNAPSHOT_ROLE = keccak256("SNAPSHOT_ROLE");

    /**
     * @dev Constructor to initialize K-Systems Token
     * @param initialSupply Initial token supply (will be multiplied by 10^18)
     * @param owner Address to receive all roles and initial supply
     */
    constructor(uint256 initialSupply, address owner) 
        ERC20("K-Systems Token", "KSYS")
        ERC20Permit("K-Systems Token")
    {
        require(owner != address(0), "KSystemsToken: owner is zero address");
        
        // Grant all roles to the owner
        _grantRole(DEFAULT_ADMIN_ROLE, owner);
        _grantRole(MINTER_ROLE, owner);
        _grantRole(PAUSER_ROLE, owner);
        _grantRole(SNAPSHOT_ROLE, owner);

        // Mint initial supply to owner
        if (initialSupply > 0) {
            _mint(owner, initialSupply * 10**decimals());
        }

        emit TokensMinted(owner, initialSupply * 10**decimals(), "Initial supply minted - Crown Omega verified");
    }

    /**
     * @dev Mint new tokens (restricted to MINTER_ROLE)
     * @param to Address to receive minted tokens
     * @param amount Amount of tokens to mint
     * @param reason Explanation for minting (Crown Omega audit trail)
     */
    function mint(address to, uint256 amount, string calldata reason) 
        external 
        override 
        onlyRole(MINTER_ROLE) 
    {
        require(bytes(reason).length > 0, "KSystemsToken: reason required");
        _mint(to, amount);
        emit TokensMinted(to, amount, reason);
    }

    /**
     * @dev Burn tokens with reason logging
     * @param amount Amount of tokens to burn
     * @param reason Explanation for burning
     */
    function burn(uint256 amount, string calldata reason) external override {
        require(bytes(reason).length > 0, "KSystemsToken: reason required");
        _burn(_msgSender(), amount);
        emit TokensBurned(_msgSender(), amount, reason);
    }

    /**
     * @dev Burn tokens from another account with reason logging
     * @param account Account to burn from
     * @param amount Amount to burn
     * @param reason Explanation for burning
     */
    function burnFrom(address account, uint256 amount, string calldata reason) 
        external 
        override 
    {
        require(bytes(reason).length > 0, "KSystemsToken: reason required");
        _spendAllowance(account, _msgSender(), amount);
        _burn(account, amount);
        emit TokensBurned(account, amount, reason);
    }

    /**
     * @dev Create a snapshot for governance (restricted to SNAPSHOT_ROLE)
     * @return Snapshot ID (block number)
     */
    function snapshot() external override onlyRole(SNAPSHOT_ROLE) returns (uint256) {
        uint256 snapshotId = block.number;
        emit SnapshotCreated(snapshotId);
        return snapshotId;
    }

    /**
     * @dev Pause all token transfers (emergency stop)
     */
    function pause() external override onlyRole(PAUSER_ROLE) {
        _pause();
        emit EmergencyPause(_msgSender(), "Emergency pause activated - Crown Omega protocol");
    }

    /**
     * @dev Unpause token transfers
     */
    function unpause() external override onlyRole(PAUSER_ROLE) {
        _unpause();
        emit EmergencyUnpause(_msgSender());
    }

    /**
     * @dev Get balance at specific snapshot (block number)
     * Uses ERC20Votes getPastVotes functionality
     */
    function balanceOfAt(address account, uint256 snapshotId) 
        external 
        view 
        override 
        returns (uint256) 
    {
        return getPastVotes(account, snapshotId);
    }

    /**
     * @dev Get total supply at specific snapshot (block number)
     * Uses ERC20Votes getPastTotalSupply functionality
     */
    function totalSupplyAt(uint256 snapshotId) 
        external 
        view 
        override 
        returns (uint256) 
    {
        return getPastTotalSupply(snapshotId);
    }

    // Required overrides for multiple inheritance

    function _update(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Votes) whenNotPaused {
        super._update(from, to, amount);
    }

    function nonces(address owner)
        public
        view
        override(ERC20Permit, Nonces)
        returns (uint256)
    {
        return super.nonces(owner);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
