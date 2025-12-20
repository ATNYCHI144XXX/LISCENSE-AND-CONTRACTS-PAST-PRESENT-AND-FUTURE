import { expect } from "chai";
import { ethers } from "hardhat";
import { KSystemsTreasury } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("KSystemsTreasury", function () {
  let treasury: KSystemsTreasury;
  let signer1: SignerWithAddress;
  let signer2: SignerWithAddress;
  let signer3: SignerWithAddress;
  let user: SignerWithAddress;
  const threshold = 2;

  beforeEach(async function () {
    [signer1, signer2, signer3, user] = await ethers.getSigners();
    
    const KSystemsTreasury = await ethers.getContractFactory("KSystemsTreasury");
    treasury = await KSystemsTreasury.deploy(
      [signer1.address, signer2.address, signer3.address],
      threshold
    );
    await treasury.waitForDeployment();

    // Fund the treasury
    await signer1.sendTransaction({
      to: await treasury.getAddress(),
      value: ethers.parseEther("10")
    });
  });

  describe("Deployment", function () {
    it("Should set correct signers", async function () {
      const signers = await treasury.getSigners();
      expect(signers).to.include(signer1.address);
      expect(signers).to.include(signer2.address);
      expect(signers).to.include(signer3.address);
    });

    it("Should set correct threshold", async function () {
      expect(await treasury.getThreshold()).to.equal(threshold);
    });

    it("Should mark addresses as signers", async function () {
      expect(await treasury.isSigner(signer1.address)).to.be.true;
      expect(await treasury.isSigner(signer2.address)).to.be.true;
      expect(await treasury.isSigner(signer3.address)).to.be.true;
      expect(await treasury.isSigner(user.address)).to.be.false;
    });

    it("Should receive ETH", async function () {
      const balance = await ethers.provider.getBalance(await treasury.getAddress());
      expect(balance).to.equal(ethers.parseEther("10"));
    });
  });

  describe("Transaction Submission", function () {
    it("Should allow signers to submit transactions", async function () {
      await expect(
        treasury.connect(signer1).submitTransaction(
          user.address,
          ethers.parseEther("1"),
          "0x",
          "Test payment"
        )
      ).to.emit(treasury, "TransactionSubmitted");
    });

    it("Should automatically confirm submitted transaction", async function () {
      const tx = await treasury.connect(signer1).submitTransaction(
        user.address,
        ethers.parseEther("1"),
        "0x",
        "Test payment"
      );
      
      await expect(tx).to.emit(treasury, "TransactionConfirmed");
    });

    it("Should reject submission from non-signers", async function () {
      await expect(
        treasury.connect(user).submitTransaction(
          user.address,
          ethers.parseEther("1"),
          "0x",
          "Test payment"
        )
      ).to.be.revertedWith("KSystemsTreasury: caller is not a signer");
    });

    it("Should reject submission without description", async function () {
      await expect(
        treasury.connect(signer1).submitTransaction(
          user.address,
          ethers.parseEther("1"),
          "0x",
          ""
        )
      ).to.be.revertedWith("KSystemsTreasury: description required");
    });

    it("Should apply extended timelock for large amounts", async function () {
      const tx = await treasury.connect(signer1).submitTransaction(
        user.address,
        ethers.parseEther("150"), // Above LARGE_AMOUNT_THRESHOLD
        "0x",
        "Large payment"
      );
      
      const txId = 0;
      const transaction = await treasury.getTransaction(txId);
      const expectedTimelock = 7 * 24 * 60 * 60; // 7 days
      
      expect(Number(transaction.executeAfter - transaction.submittedAt))
        .to.be.approximately(expectedTimelock, 10);
    });
  });

  describe("Transaction Confirmation", function () {
    let txId: number;

    beforeEach(async function () {
      const tx = await treasury.connect(signer1).submitTransaction(
        user.address,
        ethers.parseEther("1"),
        "0x",
        "Test payment"
      );
      txId = 0;
    });

    it("Should allow other signers to confirm", async function () {
      await expect(
        treasury.connect(signer2).confirmTransaction(txId)
      ).to.emit(treasury, "TransactionConfirmed");
    });

    it("Should track confirmation count", async function () {
      await treasury.connect(signer2).confirmTransaction(txId);
      const transaction = await treasury.getTransaction(txId);
      expect(transaction.confirmations).to.equal(2);
    });

    it("Should reject double confirmation", async function () {
      await expect(
        treasury.connect(signer1).confirmTransaction(txId)
      ).to.be.revertedWith("KSystemsTreasury: transaction already confirmed");
    });

    it("Should reject confirmation from non-signers", async function () {
      await expect(
        treasury.connect(user).confirmTransaction(txId)
      ).to.be.revertedWith("KSystemsTreasury: caller is not a signer");
    });
  });

  describe("Transaction Revocation", function () {
    let txId: number;

    beforeEach(async function () {
      await treasury.connect(signer1).submitTransaction(
        user.address,
        ethers.parseEther("1"),
        "0x",
        "Test payment"
      );
      txId = 0;
      await treasury.connect(signer2).confirmTransaction(txId);
    });

    it("Should allow signers to revoke confirmation", async function () {
      await expect(
        treasury.connect(signer2).revokeConfirmation(txId)
      ).to.emit(treasury, "TransactionRevoked");
    });

    it("Should decrease confirmation count", async function () {
      await treasury.connect(signer2).revokeConfirmation(txId);
      const transaction = await treasury.getTransaction(txId);
      expect(transaction.confirmations).to.equal(1);
    });

    it("Should reject revocation if not confirmed", async function () {
      await expect(
        treasury.connect(signer3).revokeConfirmation(txId)
      ).to.be.revertedWith("KSystemsTreasury: not confirmed");
    });
  });

  describe("Transaction Execution", function () {
    let txId: number;

    beforeEach(async function () {
      await treasury.connect(signer1).submitTransaction(
        user.address,
        ethers.parseEther("1"),
        "0x",
        "Test payment"
      );
      txId = 0;
      await treasury.connect(signer2).confirmTransaction(txId);
    });

    it("Should execute transaction when threshold reached and timelock expired", async function () {
      // Fast forward past timelock
      await time.increase(24 * 60 * 60 + 1);

      const userBalanceBefore = await ethers.provider.getBalance(user.address);
      
      await expect(
        treasury.connect(signer1).executeTransaction(txId)
      ).to.emit(treasury, "TransactionExecuted");

      const userBalanceAfter = await ethers.provider.getBalance(user.address);
      expect(userBalanceAfter - userBalanceBefore).to.equal(ethers.parseEther("1"));
    });

    it("Should reject execution before timelock", async function () {
      await expect(
        treasury.connect(signer1).executeTransaction(txId)
      ).to.be.revertedWith("KSystemsTreasury: timelock not expired");
    });

    it("Should reject execution without enough confirmations", async function () {
      await treasury.connect(signer2).revokeConfirmation(txId);
      await time.increase(24 * 60 * 60 + 1);

      await expect(
        treasury.connect(signer1).executeTransaction(txId)
      ).to.be.revertedWith("KSystemsTreasury: insufficient confirmations");
    });

    it("Should reject double execution", async function () {
      await time.increase(24 * 60 * 60 + 1);
      await treasury.connect(signer1).executeTransaction(txId);

      await expect(
        treasury.connect(signer1).executeTransaction(txId)
      ).to.be.revertedWith("KSystemsTreasury: transaction already executed");
    });

    it("Should reject execution from non-signers", async function () {
      await time.increase(24 * 60 * 60 + 1);

      await expect(
        treasury.connect(user).executeTransaction(txId)
      ).to.be.revertedWith("KSystemsTreasury: caller is not a signer");
    });
  });

  describe("Signer Management", function () {
    it("Should allow adding new signers", async function () {
      await expect(
        treasury.connect(signer1).addSigner(user.address)
      ).to.emit(treasury, "SignerAdded");

      expect(await treasury.isSigner(user.address)).to.be.true;
    });

    it("Should allow removing signers", async function () {
      await expect(
        treasury.connect(signer1).removeSigner(signer3.address)
      ).to.emit(treasury, "SignerRemoved");

      expect(await treasury.isSigner(signer3.address)).to.be.false;
    });

    it("Should reject removing signer if it breaks threshold", async function () {
      await treasury.connect(signer1).removeSigner(signer3.address);
      
      await expect(
        treasury.connect(signer1).removeSigner(signer2.address)
      ).to.be.revertedWith("KSystemsTreasury: would break threshold");
    });

    it("Should reject adding duplicate signers", async function () {
      await expect(
        treasury.connect(signer1).addSigner(signer1.address)
      ).to.be.revertedWith("KSystemsTreasury: already a signer");
    });
  });

  describe("Threshold Management", function () {
    it("Should allow changing threshold", async function () {
      await expect(
        treasury.connect(signer1).changeThreshold(3)
      ).to.emit(treasury, "ThresholdChanged");

      expect(await treasury.getThreshold()).to.equal(3);
    });

    it("Should reject threshold higher than signer count", async function () {
      await expect(
        treasury.connect(signer1).changeThreshold(4)
      ).to.be.revertedWith("KSystemsTreasury: threshold too high");
    });

    it("Should reject threshold of 0", async function () {
      await expect(
        treasury.connect(signer1).changeThreshold(0)
      ).to.be.revertedWith("KSystemsTreasury: threshold too low");
    });
  });

  describe("View Functions", function () {
    it("Should return transaction count", async function () {
      expect(await treasury.getTransactionCount()).to.equal(0);
      
      await treasury.connect(signer1).submitTransaction(
        user.address,
        ethers.parseEther("1"),
        "0x",
        "Test"
      );
      
      expect(await treasury.getTransactionCount()).to.equal(1);
    });

    it("Should return confirmations for transaction", async function () {
      await treasury.connect(signer1).submitTransaction(
        user.address,
        ethers.parseEther("1"),
        "0x",
        "Test"
      );
      await treasury.connect(signer2).confirmTransaction(0);

      const confirmations = await treasury.getConfirmations(0);
      expect(confirmations.length).to.equal(2);
      expect(confirmations).to.include(signer1.address);
      expect(confirmations).to.include(signer2.address);
    });
  });
});
