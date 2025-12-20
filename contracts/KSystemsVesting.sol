// SPDX-License-Identifier: PROPRIETARY
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title KSystemsVesting
 * @notice Token vesting contract for K-Systems team and investor allocations
 * @dev Supports linear and cliff vesting schedules with revocable option
 * 
 * Crown Omega Verification:
 * - Implements τ-Math temporal lock mechanisms
 * - Time-synchronized release schedules
 * - Revocable for compliance and security
 * 
 * Features:
 * - Linear or cliff vesting schedules
 * - Multiple beneficiaries support
 * - Revocable option for owner
 * - Release function for vested tokens
 * - Event logging for transparency
 */
contract KSystemsVesting is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Structs
    struct VestingSchedule {
        address beneficiary;
        uint256 totalAmount;
        uint256 startTime;
        uint256 cliffDuration;
        uint256 duration;
        uint256 released;
        bool revocable;
        bool revoked;
    }

    // State variables
    IERC20 public immutable token;
    mapping(bytes32 => VestingSchedule) public vestingSchedules;
    mapping(address => bytes32[]) public beneficiarySchedules;
    bytes32[] private scheduleIds;

    uint256 public totalVested;
    uint256 public totalReleased;

    // Events
    event VestingScheduleCreated(
        bytes32 indexed scheduleId,
        address indexed beneficiary,
        uint256 amount,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 duration,
        bool revocable
    );
    event TokensReleased(bytes32 indexed scheduleId, address indexed beneficiary, uint256 amount);
    event VestingRevoked(bytes32 indexed scheduleId, address indexed beneficiary, uint256 refunded);

    /**
     * @dev Constructor
     * @param _token Address of the KSYS token
     */
    constructor(address _token) {
        require(_token != address(0), "KSystemsVesting: invalid token");
        token = IERC20(_token);
    }

    /**
     * @dev Create a new vesting schedule
     * @param beneficiary Address of the beneficiary
     * @param totalAmount Total amount to vest
     * @param startTime Start timestamp (use 0 for current time)
     * @param cliffDuration Cliff period in seconds
     * @param duration Total vesting duration in seconds
     * @param revocable Whether the schedule can be revoked
     * @return scheduleId Unique identifier for the schedule
     */
    function createVestingSchedule(
        address beneficiary,
        uint256 totalAmount,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 duration,
        bool revocable
    ) external onlyOwner returns (bytes32 scheduleId) {
        require(beneficiary != address(0), "KSystemsVesting: invalid beneficiary");
        require(totalAmount > 0, "KSystemsVesting: zero amount");
        require(duration > 0, "KSystemsVesting: zero duration");
        require(cliffDuration <= duration, "KSystemsVesting: cliff exceeds duration");

        uint256 start = startTime == 0 ? block.timestamp : startTime;
        require(start >= block.timestamp, "KSystemsVesting: start time in past");

        // Generate unique schedule ID
        scheduleId = keccak256(
            abi.encodePacked(beneficiary, totalAmount, start, block.timestamp)
        );
        require(
            vestingSchedules[scheduleId].beneficiary == address(0),
            "KSystemsVesting: schedule exists"
        );

        // Transfer tokens to this contract
        token.safeTransferFrom(msg.sender, address(this), totalAmount);

        // Create schedule
        vestingSchedules[scheduleId] = VestingSchedule({
            beneficiary: beneficiary,
            totalAmount: totalAmount,
            startTime: start,
            cliffDuration: cliffDuration,
            duration: duration,
            released: 0,
            revocable: revocable,
            revoked: false
        });

        beneficiarySchedules[beneficiary].push(scheduleId);
        scheduleIds.push(scheduleId);
        totalVested += totalAmount;

        emit VestingScheduleCreated(
            scheduleId,
            beneficiary,
            totalAmount,
            start,
            cliffDuration,
            duration,
            revocable
        );

        return scheduleId;
    }

    /**
     * @dev Release vested tokens for a schedule
     * @param scheduleId Schedule identifier
     */
    function release(bytes32 scheduleId) external nonReentrant {
        VestingSchedule storage schedule = vestingSchedules[scheduleId];
        require(schedule.beneficiary != address(0), "KSystemsVesting: invalid schedule");
        require(!schedule.revoked, "KSystemsVesting: schedule revoked");

        uint256 releasable = _computeReleasableAmount(schedule);
        require(releasable > 0, "KSystemsVesting: no tokens to release");

        schedule.released += releasable;
        totalReleased += releasable;

        token.safeTransfer(schedule.beneficiary, releasable);

        emit TokensReleased(scheduleId, schedule.beneficiary, releasable);
    }

    /**
     * @dev Revoke a vesting schedule
     * @param scheduleId Schedule identifier
     */
    function revoke(bytes32 scheduleId) external onlyOwner nonReentrant {
        VestingSchedule storage schedule = vestingSchedules[scheduleId];
        require(schedule.beneficiary != address(0), "KSystemsVesting: invalid schedule");
        require(schedule.revocable, "KSystemsVesting: not revocable");
        require(!schedule.revoked, "KSystemsVesting: already revoked");

        uint256 releasable = _computeReleasableAmount(schedule);
        uint256 refund = schedule.totalAmount - schedule.released - releasable;

        schedule.revoked = true;

        // Release any vested tokens to beneficiary
        if (releasable > 0) {
            schedule.released += releasable;
            totalReleased += releasable;
            token.safeTransfer(schedule.beneficiary, releasable);
        }

        // Refund unvested tokens to owner
        if (refund > 0) {
            totalVested -= refund;
            token.safeTransfer(owner(), refund);
        }

        emit VestingRevoked(scheduleId, schedule.beneficiary, refund);
    }

    /**
     * @dev Compute releasable amount for a schedule
     * @param schedule The vesting schedule
     * @return Releasable amount
     */
    function _computeReleasableAmount(VestingSchedule memory schedule) 
        private 
        view 
        returns (uint256) 
    {
        if (block.timestamp < schedule.startTime + schedule.cliffDuration) {
            return 0;
        }

        if (block.timestamp >= schedule.startTime + schedule.duration) {
            return schedule.totalAmount - schedule.released;
        }

        uint256 timeVested = block.timestamp - schedule.startTime;
        uint256 vestedAmount = (schedule.totalAmount * timeVested) / schedule.duration;
        
        return vestedAmount - schedule.released;
    }

    // View Functions

    /**
     * @dev Get vesting schedule details
     * @param scheduleId Schedule identifier
     */
    function getVestingSchedule(bytes32 scheduleId) 
        external 
        view 
        returns (VestingSchedule memory) 
    {
        return vestingSchedules[scheduleId];
    }

    /**
     * @dev Get all schedule IDs for a beneficiary
     * @param beneficiary Beneficiary address
     */
    function getBeneficiarySchedules(address beneficiary) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        return beneficiarySchedules[beneficiary];
    }

    /**
     * @dev Get all schedule IDs
     */
    function getAllScheduleIds() external view returns (bytes32[] memory) {
        return scheduleIds;
    }

    /**
     * @dev Compute releasable amount for a schedule
     * @param scheduleId Schedule identifier
     */
    function computeReleasableAmount(bytes32 scheduleId) 
        external 
        view 
        returns (uint256) 
    {
        VestingSchedule memory schedule = vestingSchedules[scheduleId];
        require(schedule.beneficiary != address(0), "KSystemsVesting: invalid schedule");
        
        if (schedule.revoked) {
            return 0;
        }
        
        return _computeReleasableAmount(schedule);
    }

    /**
     * @dev Get total vested amount for a beneficiary
     * @param beneficiary Beneficiary address
     */
    function getTotalVestedForBeneficiary(address beneficiary) 
        external 
        view 
        returns (uint256 total) 
    {
        bytes32[] memory schedules = beneficiarySchedules[beneficiary];
        for (uint256 i = 0; i < schedules.length; i++) {
            VestingSchedule memory schedule = vestingSchedules[schedules[i]];
            if (!schedule.revoked) {
                total += schedule.totalAmount;
            }
        }
        return total;
    }

    /**
     * @dev Get total released amount for a beneficiary
     * @param beneficiary Beneficiary address
     */
    function getTotalReleasedForBeneficiary(address beneficiary) 
        external 
        view 
        returns (uint256 total) 
    {
        bytes32[] memory schedules = beneficiarySchedules[beneficiary];
        for (uint256 i = 0; i < schedules.length; i++) {
            total += vestingSchedules[schedules[i]].released;
        }
        return total;
    }
}
