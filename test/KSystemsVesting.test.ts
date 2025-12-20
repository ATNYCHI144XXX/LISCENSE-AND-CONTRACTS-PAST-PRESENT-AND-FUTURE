import { expect } from "chai";
import { ethers } from "hardhat";
import { KSystemsVesting, KSystemsToken } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("KSystemsVesting", function () {
  let token: KSystemsToken;
  let vesting: KSystemsVesting;
  let owner: SignerWithAddress;
  let beneficiary: SignerWithAddress;
  let user: SignerWithAddress;

  const initialSupply = 1000000n;
  const vestingAmount = ethers.parseEther("100000");

  beforeEach(async function () {
    [owner, beneficiary, user] = await ethers.getSigners();
    
    // Deploy token
    const KSystemsToken = await ethers.getContractFactory("KSystemsToken");
    token = await KSystemsToken.deploy(initialSupply, owner.address);
    await token.waitForDeployment();

    // Deploy vesting
    const KSystemsVesting = await ethers.getContractFactory("KSystemsVesting");
    vesting = await KSystemsVesting.deploy(await token.getAddress());
    await vesting.waitForDeployment();

    // Approve vesting contract to spend tokens
    await token.approve(await vesting.getAddress(), ethers.parseEther("1000000"));
  });

  describe("Deployment", function () {
    it("Should set correct token address", async function () {
      expect(await vesting.token()).to.equal(await token.getAddress());
    });

    it("Should set correct owner", async function () {
      expect(await vesting.owner()).to.equal(owner.address);
    });
  });

  describe("Vesting Schedule Creation", function () {
    it("Should create vesting schedule", async function () {
      const startTime = await time.latest() + 100;
      const cliffDuration = 365 * 24 * 60 * 60; // 1 year
      const duration = 4 * 365 * 24 * 60 * 60; // 4 years

      await expect(
        vesting.createVestingSchedule(
          beneficiary.address,
          vestingAmount,
          startTime,
          cliffDuration,
          duration,
          true // revocable
        )
      ).to.emit(vesting, "VestingScheduleCreated");
    });

    it("Should transfer tokens to vesting contract", async function () {
      const startTime = await time.latest() + 100;
      const vestingBalanceBefore = await token.balanceOf(await vesting.getAddress());

      await vesting.createVestingSchedule(
        beneficiary.address,
        vestingAmount,
        startTime,
        365 * 24 * 60 * 60,
        4 * 365 * 24 * 60 * 60,
        true
      );

      const vestingBalanceAfter = await token.balanceOf(await vesting.getAddress());
      expect(vestingBalanceAfter - vestingBalanceBefore).to.equal(vestingAmount);
    });

    it("Should track total vested", async function () {
      const startTime = await time.latest() + 100;

      await vesting.createVestingSchedule(
        beneficiary.address,
        vestingAmount,
        startTime,
        0,
        365 * 24 * 60 * 60,
        true
      );

      expect(await vesting.totalVested()).to.equal(vestingAmount);
    });

    it("Should reject schedule creation from non-owner", async function () {
      const startTime = await time.latest() + 100;

      await expect(
        vesting.connect(user).createVestingSchedule(
          beneficiary.address,
          vestingAmount,
          startTime,
          0,
          365 * 24 * 60 * 60,
          true
        )
      ).to.be.reverted;
    });

    it("Should reject zero amount", async function () {
      const startTime = await time.latest() + 100;

      await expect(
        vesting.createVestingSchedule(
          beneficiary.address,
          0,
          startTime,
          0,
          365 * 24 * 60 * 60,
          true
        )
      ).to.be.revertedWith("KSystemsVesting: zero amount");
    });

    it("Should reject cliff exceeding duration", async function () {
      const startTime = await time.latest() + 100;

      await expect(
        vesting.createVestingSchedule(
          beneficiary.address,
          vestingAmount,
          startTime,
          4 * 365 * 24 * 60 * 60, // 4 years cliff
          365 * 24 * 60 * 60,      // 1 year duration
          true
        )
      ).to.be.revertedWith("KSystemsVesting: cliff exceeds duration");
    });

    it("Should use current time if startTime is 0", async function () {
      const tx = await vesting.createVestingSchedule(
        beneficiary.address,
        vestingAmount,
        0, // Will use current timestamp
        0,
        365 * 24 * 60 * 60,
        true
      );

      const receipt = await tx.wait();
      const event = receipt!.logs.find(
        (log: any) => log.fragment && log.fragment.name === "VestingScheduleCreated"
      );
      
      // Schedule should be created with current time
      expect(event).to.not.be.undefined;
    });
  });

  describe("Token Release", function () {
    let scheduleId: string;
    const duration = 365 * 24 * 60 * 60; // 1 year

    beforeEach(async function () {
      const currentTime = await time.latest();
      const tx = await vesting.createVestingSchedule(
        beneficiary.address,
        vestingAmount,
        currentTime,
        0, // No cliff
        duration,
        false
      );

      const receipt = await tx.wait();
      const schedules = await vesting.getBeneficiarySchedules(beneficiary.address);
      scheduleId = schedules[0];
    });

    it("Should release vested tokens", async function () {
      // Fast forward 6 months (50% vested)
      await time.increase(duration / 2);

      await expect(vesting.connect(beneficiary).release(scheduleId))
        .to.emit(vesting, "TokensReleased");

      const beneficiaryBalance = await token.balanceOf(beneficiary.address);
      expect(beneficiaryBalance).to.be.closeTo(
        vestingAmount / 2n,
        ethers.parseEther("100") // Allow small deviation
      );
    });

    it("Should release all tokens after full duration", async function () {
      await time.increase(duration + 1);

      await vesting.connect(beneficiary).release(scheduleId);

      const beneficiaryBalance = await token.balanceOf(beneficiary.address);
      expect(beneficiaryBalance).to.equal(vestingAmount);
    });

    it("Should reject release with no vested tokens", async function () {
      await expect(
        vesting.connect(beneficiary).release(scheduleId)
      ).to.be.revertedWith("KSystemsVesting: no tokens to release");
    });

    it("Should allow multiple releases", async function () {
      // First release at 25%
      await time.increase(duration / 4);
      await vesting.connect(beneficiary).release(scheduleId);
      const balance1 = await token.balanceOf(beneficiary.address);

      // Second release at 75%
      await time.increase(duration / 2);
      await vesting.connect(beneficiary).release(scheduleId);
      const balance2 = await token.balanceOf(beneficiary.address);

      expect(balance2).to.be.gt(balance1);
      expect(balance2).to.be.closeTo(
        (vestingAmount * 3n) / 4n,
        ethers.parseEther("100")
      );
    });

    it("Should respect cliff period", async function () {
      const currentTime = await time.latest();
      const cliffDuration = 365 * 24 * 60 * 60; // 1 year

      const tx = await vesting.createVestingSchedule(
        user.address,
        vestingAmount,
        currentTime,
        cliffDuration,
        2 * 365 * 24 * 60 * 60, // 2 years total
        false
      );

      const schedules = await vesting.getBeneficiarySchedules(user.address);
      const newScheduleId = schedules[0];

      // Try to release before cliff
      await time.increase(cliffDuration / 2);
      await expect(
        vesting.connect(user).release(newScheduleId)
      ).to.be.revertedWith("KSystemsVesting: no tokens to release");

      // After cliff, should work
      await time.increase(cliffDuration / 2 + 1);
      await expect(vesting.connect(user).release(newScheduleId))
        .to.emit(vesting, "TokensReleased");
    });
  });

  describe("Schedule Revocation", function () {
    let scheduleId: string;

    beforeEach(async function () {
      const currentTime = await time.latest();
      const tx = await vesting.createVestingSchedule(
        beneficiary.address,
        vestingAmount,
        currentTime,
        0,
        365 * 24 * 60 * 60,
        true // revocable
      );

      const schedules = await vesting.getBeneficiarySchedules(beneficiary.address);
      scheduleId = schedules[0];
    });

    it("Should allow owner to revoke schedule", async function () {
      await time.increase(182 * 24 * 60 * 60); // 6 months

      await expect(vesting.revoke(scheduleId))
        .to.emit(vesting, "VestingRevoked");
    });

    it("Should release vested tokens to beneficiary on revocation", async function () {
      await time.increase(182 * 24 * 60 * 60); // 6 months

      await vesting.revoke(scheduleId);

      const beneficiaryBalance = await token.balanceOf(beneficiary.address);
      expect(beneficiaryBalance).to.be.closeTo(
        vestingAmount / 2n,
        ethers.parseEther("100")
      );
    });

    it("Should refund unvested tokens to owner", async function () {
      await time.increase(182 * 24 * 60 * 60); // 6 months

      const ownerBalanceBefore = await token.balanceOf(owner.address);
      await vesting.revoke(scheduleId);
      const ownerBalanceAfter = await token.balanceOf(owner.address);

      const refund = ownerBalanceAfter - ownerBalanceBefore;
      expect(refund).to.be.closeTo(
        vestingAmount / 2n,
        ethers.parseEther("100")
      );
    });

    it("Should reject revocation of non-revocable schedule", async function () {
      const currentTime = await time.latest();
      const tx = await vesting.createVestingSchedule(
        user.address,
        vestingAmount,
        currentTime,
        0,
        365 * 24 * 60 * 60,
        false // NOT revocable
      );

      const schedules = await vesting.getBeneficiarySchedules(user.address);
      const nonRevocableId = schedules[0];

      await expect(
        vesting.revoke(nonRevocableId)
      ).to.be.revertedWith("KSystemsVesting: not revocable");
    });

    it("Should reject double revocation", async function () {
      await vesting.revoke(scheduleId);

      await expect(
        vesting.revoke(scheduleId)
      ).to.be.revertedWith("KSystemsVesting: already revoked");
    });

    it("Should reject revocation from non-owner", async function () {
      await expect(
        vesting.connect(user).revoke(scheduleId)
      ).to.be.reverted;
    });
  });

  describe("View Functions", function () {
    let scheduleId: string;

    beforeEach(async function () {
      const currentTime = await time.latest();
      const tx = await vesting.createVestingSchedule(
        beneficiary.address,
        vestingAmount,
        currentTime,
        0,
        365 * 24 * 60 * 60,
        true
      );

      const schedules = await vesting.getBeneficiarySchedules(beneficiary.address);
      scheduleId = schedules[0];
    });

    it("Should return vesting schedule details", async function () {
      const schedule = await vesting.getVestingSchedule(scheduleId);
      
      expect(schedule.beneficiary).to.equal(beneficiary.address);
      expect(schedule.totalAmount).to.equal(vestingAmount);
      expect(schedule.revocable).to.be.true;
      expect(schedule.revoked).to.be.false;
    });

    it("Should compute releasable amount", async function () {
      await time.increase(182 * 24 * 60 * 60); // 6 months

      const releasable = await vesting.computeReleasableAmount(scheduleId);
      expect(releasable).to.be.closeTo(
        vestingAmount / 2n,
        ethers.parseEther("100")
      );
    });

    it("Should return beneficiary schedules", async function () {
      const schedules = await vesting.getBeneficiarySchedules(beneficiary.address);
      expect(schedules.length).to.equal(1);
      expect(schedules[0]).to.equal(scheduleId);
    });

    it("Should return all schedule IDs", async function () {
      const allSchedules = await vesting.getAllScheduleIds();
      expect(allSchedules.length).to.be.gte(1);
      expect(allSchedules).to.include(scheduleId);
    });

    it("Should return total vested for beneficiary", async function () {
      const total = await vesting.getTotalVestedForBeneficiary(beneficiary.address);
      expect(total).to.equal(vestingAmount);
    });

    it("Should return total released for beneficiary", async function () {
      await time.increase(182 * 24 * 60 * 60);
      await vesting.connect(beneficiary).release(scheduleId);

      const totalReleased = await vesting.getTotalReleasedForBeneficiary(beneficiary.address);
      expect(totalReleased).to.be.gt(0);
    });
  });
});
