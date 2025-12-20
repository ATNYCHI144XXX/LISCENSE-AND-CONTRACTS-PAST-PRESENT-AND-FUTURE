import { expect } from "chai";
import { ethers } from "hardhat";
import { KSystemsToken } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("KSystemsToken", function () {
  let token: KSystemsToken;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  const initialSupply = 1000000n;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    const KSystemsToken = await ethers.getContractFactory("KSystemsToken");
    token = await KSystemsToken.deploy(initialSupply, owner.address);
    await token.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await token.name()).to.equal("K-Systems Token");
      expect(await token.symbol()).to.equal("KSYS");
    });

    it("Should mint initial supply to owner", async function () {
      const decimals = await token.decimals();
      const expectedSupply = initialSupply * (10n ** decimals);
      expect(await token.totalSupply()).to.equal(expectedSupply);
      expect(await token.balanceOf(owner.address)).to.equal(expectedSupply);
    });

    it("Should grant all roles to owner", async function () {
      const DEFAULT_ADMIN_ROLE = await token.DEFAULT_ADMIN_ROLE();
      const MINTER_ROLE = await token.MINTER_ROLE();
      const PAUSER_ROLE = await token.PAUSER_ROLE();
      const SNAPSHOT_ROLE = await token.SNAPSHOT_ROLE();

      expect(await token.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
      expect(await token.hasRole(MINTER_ROLE, owner.address)).to.be.true;
      expect(await token.hasRole(PAUSER_ROLE, owner.address)).to.be.true;
      expect(await token.hasRole(SNAPSHOT_ROLE, owner.address)).to.be.true;
    });
  });

  describe("Minting", function () {
    it("Should allow MINTER_ROLE to mint tokens", async function () {
      const mintAmount = ethers.parseEther("1000");
      await token.mint(user1.address, mintAmount, "Team allocation");
      
      expect(await token.balanceOf(user1.address)).to.equal(mintAmount);
    });

    it("Should emit TokensMinted event", async function () {
      const mintAmount = ethers.parseEther("1000");
      await expect(token.mint(user1.address, mintAmount, "Test mint"))
        .to.emit(token, "TokensMinted")
        .withArgs(user1.address, mintAmount, "Test mint");
    });

    it("Should reject minting without MINTER_ROLE", async function () {
      const mintAmount = ethers.parseEther("1000");
      await expect(
        token.connect(user1).mint(user2.address, mintAmount, "Unauthorized")
      ).to.be.reverted;
    });

    it("Should reject minting without reason", async function () {
      const mintAmount = ethers.parseEther("1000");
      await expect(
        token.mint(user1.address, mintAmount, "")
      ).to.be.revertedWith("KSystemsToken: reason required");
    });
  });

  describe("Burning", function () {
    beforeEach(async function () {
      const amount = ethers.parseEther("1000");
      await token.transfer(user1.address, amount);
    });

    it("Should allow users to burn their own tokens", async function () {
      const burnAmount = ethers.parseEther("500");
      const initialBalance = await token.balanceOf(user1.address);
      
      await token.connect(user1).burn(burnAmount, "Voluntary burn");
      
      expect(await token.balanceOf(user1.address)).to.equal(initialBalance - burnAmount);
    });

    it("Should emit TokensBurned event", async function () {
      const burnAmount = ethers.parseEther("500");
      await expect(token.connect(user1).burn(burnAmount, "Test burn"))
        .to.emit(token, "TokensBurned")
        .withArgs(user1.address, burnAmount, "Test burn");
    });

    it("Should reject burning without reason", async function () {
      const burnAmount = ethers.parseEther("500");
      await expect(
        token.connect(user1).burn(burnAmount, "")
      ).to.be.revertedWith("KSystemsToken: reason required");
    });

    it("Should allow burnFrom with approval", async function () {
      const burnAmount = ethers.parseEther("500");
      await token.connect(user1).approve(owner.address, burnAmount);
      
      await token.burnFrom(user1.address, burnAmount, "Approved burn");
      
      expect(await token.balanceOf(user1.address)).to.equal(ethers.parseEther("500"));
    });
  });

  describe("Pausable", function () {
    it("Should allow PAUSER_ROLE to pause", async function () {
      await token.pause();
      expect(await token.paused()).to.be.true;
    });

    it("Should allow PAUSER_ROLE to unpause", async function () {
      await token.pause();
      await token.unpause();
      expect(await token.paused()).to.be.false;
    });

    it("Should prevent transfers when paused", async function () {
      await token.pause();
      await expect(
        token.transfer(user1.address, ethers.parseEther("100"))
      ).to.be.reverted;
    });

    it("Should allow transfers when unpaused", async function () {
      await token.pause();
      await token.unpause();
      await expect(
        token.transfer(user1.address, ethers.parseEther("100"))
      ).to.not.be.reverted;
    });

    it("Should reject pause from non-PAUSER_ROLE", async function () {
      await expect(token.connect(user1).pause()).to.be.reverted;
    });
  });

  describe("Snapshots", function () {
    it("Should allow SNAPSHOT_ROLE to create snapshot", async function () {
      await expect(token.snapshot()).to.emit(token, "SnapshotCreated");
    });

    it("Should reject snapshot creation from non-SNAPSHOT_ROLE", async function () {
      await expect(token.connect(user1).snapshot()).to.be.reverted;
    });

    it("Should track balances at snapshot", async function () {
      // Transfer some tokens
      await token.transfer(user1.address, ethers.parseEther("1000"));
      
      // Create snapshot
      const tx = await token.snapshot();
      const receipt = await tx.wait();
      const snapshotBlock = receipt!.blockNumber;
      
      // Make more transfers
      await token.transfer(user2.address, ethers.parseEther("500"));
      
      // Check historical balance
      const historicalBalance = await token.balanceOfAt(user1.address, snapshotBlock);
      expect(historicalBalance).to.equal(ethers.parseEther("1000"));
    });
  });

  describe("Transfers", function () {
    it("Should transfer tokens between accounts", async function () {
      const amount = ethers.parseEther("1000");
      await token.transfer(user1.address, amount);
      
      expect(await token.balanceOf(user1.address)).to.equal(amount);
    });

    it("Should update balances correctly after transfer", async function () {
      const amount = ethers.parseEther("1000");
      const ownerInitialBalance = await token.balanceOf(owner.address);
      
      await token.transfer(user1.address, amount);
      
      expect(await token.balanceOf(owner.address)).to.equal(ownerInitialBalance - amount);
      expect(await token.balanceOf(user1.address)).to.equal(amount);
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      const amount = ethers.parseEther("1");
      await expect(
        token.connect(user1).transfer(user2.address, amount)
      ).to.be.reverted;
    });
  });

  describe("Access Control", function () {
    it("Should allow admin to grant roles", async function () {
      const MINTER_ROLE = await token.MINTER_ROLE();
      await token.grantRole(MINTER_ROLE, user1.address);
      
      expect(await token.hasRole(MINTER_ROLE, user1.address)).to.be.true;
    });

    it("Should allow admin to revoke roles", async function () {
      const MINTER_ROLE = await token.MINTER_ROLE();
      await token.grantRole(MINTER_ROLE, user1.address);
      await token.revokeRole(MINTER_ROLE, user1.address);
      
      expect(await token.hasRole(MINTER_ROLE, user1.address)).to.be.false;
    });

    it("Should reject role grants from non-admin", async function () {
      const MINTER_ROLE = await token.MINTER_ROLE();
      await expect(
        token.connect(user1).grantRole(MINTER_ROLE, user2.address)
      ).to.be.reverted;
    });
  });
});
