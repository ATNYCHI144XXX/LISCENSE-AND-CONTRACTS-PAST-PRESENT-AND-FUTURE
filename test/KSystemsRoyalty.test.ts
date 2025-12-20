import { expect } from "chai";
import { ethers } from "hardhat";
import { KSystemsRoyalty } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("KSystemsRoyalty", function () {
  let royalty: KSystemsRoyalty;
  let owner: SignerWithAddress;
  let recipient1: SignerWithAddress;
  let recipient2: SignerWithAddress;
  let payer: SignerWithAddress;

  beforeEach(async function () {
    [owner, recipient1, recipient2, payer] = await ethers.getSigners();
    
    const KSystemsRoyalty = await ethers.getContractFactory("KSystemsRoyalty");
    royalty = await KSystemsRoyalty.deploy();
    await royalty.waitForDeployment();
  });

  describe("IP Asset Registration", function () {
    it("Should allow owner to register IP asset", async function () {
      await expect(
        royalty.registerIPAsset(
          "K-MOS-001",
          "K-Mathematical Operating System",
          "Mathematical",
          [recipient1.address, recipient2.address],
          [7000, 3000]  // 70%, 30%
        )
      ).to.emit(royalty, "IPAssetRegistered")
        .withArgs("K-MOS-001", "K-Mathematical Operating System", "Mathematical");
    });

    it("Should reject registration with invalid shares", async function () {
      await expect(
        royalty.registerIPAsset(
          "K-MOS-001",
          "Test",
          "Mathematical",
          [recipient1.address, recipient2.address],
          [5000, 3000]  // Only 80%, not 100%
        )
      ).to.be.revertedWith("KSystemsRoyalty: shares must sum to 10000");
    });

    it("Should reject duplicate asset registration", async function () {
      await royalty.registerIPAsset(
        "K-MOS-001",
        "Test",
        "Mathematical",
        [recipient1.address],
        [10000]
      );

      await expect(
        royalty.registerIPAsset(
          "K-MOS-001",
          "Test2",
          "Mathematical",
          [recipient1.address],
          [10000]
        )
      ).to.be.revertedWith("KSystemsRoyalty: asset already exists");
    });

    it("Should reject registration from non-owner", async function () {
      await expect(
        royalty.connect(recipient1).registerIPAsset(
          "K-MOS-001",
          "Test",
          "Mathematical",
          [recipient1.address],
          [10000]
        )
      ).to.be.reverted;
    });

    it("Should reject registration with mismatched arrays", async function () {
      await expect(
        royalty.registerIPAsset(
          "K-MOS-001",
          "Test",
          "Mathematical",
          [recipient1.address, recipient2.address],
          [10000]  // Mismatch
        )
      ).to.be.revertedWith("KSystemsRoyalty: length mismatch");
    });
  });

  describe("Royalty Payments", function () {
    beforeEach(async function () {
      await royalty.registerIPAsset(
        "K-MOS-001",
        "K-Math System",
        "Mathematical",
        [recipient1.address, recipient2.address],
        [7000, 3000]
      );
    });

    it("Should accept royalty payment and distribute", async function () {
      const payment = ethers.parseEther("1");
      
      await expect(
        royalty.connect(payer).payRoyalty("K-MOS-001", { value: payment })
      ).to.emit(royalty, "RoyaltyPaymentReceived");
    });

    it("Should split payments correctly", async function () {
      const payment = ethers.parseEther("1");
      await royalty.connect(payer).payRoyalty("K-MOS-001", { value: payment });

      const balance1 = await royalty.getBalance(recipient1.address);
      const balance2 = await royalty.getBalance(recipient2.address);

      expect(balance1).to.equal(ethers.parseEther("0.7"));  // 70%
      expect(balance2).to.equal(ethers.parseEther("0.3"));  // 30%
    });

    it("Should emit distribution events", async function () {
      const payment = ethers.parseEther("1");
      const tx = await royalty.connect(payer).payRoyalty("K-MOS-001", { value: payment });

      await expect(tx)
        .to.emit(royalty, "RoyaltyDistributed")
        .withArgs("K-MOS-001", recipient1.address, ethers.parseEther("0.7"));

      await expect(tx)
        .to.emit(royalty, "RoyaltyDistributed")
        .withArgs("K-MOS-001", recipient2.address, ethers.parseEther("0.3"));
    });

    it("Should track total earned", async function () {
      const payment = ethers.parseEther("1");
      await royalty.connect(payer).payRoyalty("K-MOS-001", { value: payment });

      const asset = await royalty.getIPAsset("K-MOS-001");
      expect(asset.totalEarned).to.equal(payment);
    });

    it("Should reject payment to inactive asset", async function () {
      await royalty.deactivateIPAsset("K-MOS-001");

      await expect(
        royalty.connect(payer).payRoyalty("K-MOS-001", { value: ethers.parseEther("1") })
      ).to.be.revertedWith("KSystemsRoyalty: asset inactive");
    });

    it("Should reject zero payment", async function () {
      await expect(
        royalty.connect(payer).payRoyalty("K-MOS-001", { value: 0 })
      ).to.be.revertedWith("KSystemsRoyalty: zero payment");
    });

    it("Should reject payment to non-existent asset", async function () {
      await expect(
        royalty.connect(payer).payRoyalty("INVALID", { value: ethers.parseEther("1") })
      ).to.be.revertedWith("KSystemsRoyalty: asset does not exist");
    });
  });

  describe("Withdrawals", function () {
    beforeEach(async function () {
      await royalty.registerIPAsset(
        "K-MOS-001",
        "K-Math System",
        "Mathematical",
        [recipient1.address, recipient2.address],
        [7000, 3000]
      );

      await royalty.connect(payer).payRoyalty("K-MOS-001", { 
        value: ethers.parseEther("1") 
      });
    });

    it("Should allow recipients to withdraw", async function () {
      const balanceBefore = await ethers.provider.getBalance(recipient1.address);
      
      const tx = await royalty.connect(recipient1).withdraw();
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(recipient1.address);
      const expectedBalance = balanceBefore + ethers.parseEther("0.7") - gasUsed;

      expect(balanceAfter).to.be.closeTo(expectedBalance, ethers.parseEther("0.0001"));
    });

    it("Should emit withdrawal event", async function () {
      await expect(royalty.connect(recipient1).withdraw())
        .to.emit(royalty, "FundsWithdrawn")
        .withArgs(recipient1.address, ethers.parseEther("0.7"));
    });

    it("Should clear balance after withdrawal", async function () {
      await royalty.connect(recipient1).withdraw();
      expect(await royalty.getBalance(recipient1.address)).to.equal(0);
    });

    it("Should reject withdrawal with no balance", async function () {
      await expect(
        royalty.connect(owner).withdraw()
      ).to.be.revertedWith("KSystemsRoyalty: no balance");
    });
  });

  describe("Asset Management", function () {
    beforeEach(async function () {
      await royalty.registerIPAsset(
        "K-MOS-001",
        "K-Math System",
        "Mathematical",
        [recipient1.address],
        [10000]
      );
    });

    it("Should allow owner to update recipients", async function () {
      await expect(
        royalty.updateRecipients(
          "K-MOS-001",
          [recipient1.address, recipient2.address],
          [5000, 5000]
        )
      ).to.emit(royalty, "RecipientsUpdated");
    });

    it("Should allow owner to deactivate asset", async function () {
      await expect(royalty.deactivateIPAsset("K-MOS-001"))
        .to.emit(royalty, "IPAssetDeactivated")
        .withArgs("K-MOS-001");

      expect(await royalty.isAssetActive("K-MOS-001")).to.be.false;
    });

    it("Should reject deactivating already inactive asset", async function () {
      await royalty.deactivateIPAsset("K-MOS-001");
      
      await expect(
        royalty.deactivateIPAsset("K-MOS-001")
      ).to.be.revertedWith("KSystemsRoyalty: asset already inactive");
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await royalty.registerIPAsset(
        "K-MOS-001",
        "K-Math System",
        "Mathematical",
        [recipient1.address, recipient2.address],
        [7000, 3000]
      );
    });

    it("Should return IP asset details", async function () {
      const asset = await royalty.getIPAsset("K-MOS-001");
      expect(asset.assetId).to.equal("K-MOS-001");
      expect(asset.name).to.equal("K-Math System");
      expect(asset.category).to.equal("Mathematical");
      expect(asset.active).to.be.true;
    });

    it("Should return all asset IDs", async function () {
      await royalty.registerIPAsset(
        "CROWN-001",
        "Crown Omega",
        "Mathematical",
        [recipient1.address],
        [10000]
      );

      const assetIds = await royalty.getAllAssetIds();
      expect(assetIds.length).to.equal(2);
      expect(assetIds).to.include("K-MOS-001");
      expect(assetIds).to.include("CROWN-001");
    });

    it("Should return payment history", async function () {
      await royalty.connect(payer).payRoyalty("K-MOS-001", { 
        value: ethers.parseEther("1") 
      });

      const history = await royalty.getPaymentHistory("K-MOS-001");
      expect(history.length).to.equal(1);
      expect(history[0].amount).to.equal(ethers.parseEther("1"));
      expect(history[0].payer).to.equal(payer.address);
    });
  });
});
