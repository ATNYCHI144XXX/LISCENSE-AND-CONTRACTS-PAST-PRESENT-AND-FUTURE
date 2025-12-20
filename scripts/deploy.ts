import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Deployment script for K-Systems smart contract infrastructure
 * Deploys: KSystemsToken, KSystemsTreasury, KSystemsRoyalty, KSystemsVesting
 * Crown Omega Verification: All contracts deployed with sovereign protocol
 */

interface DeploymentAddresses {
  network: string;
  timestamp: string;
  token: string;
  treasury: string;
  royalty: string;
  vesting: string;
  deployer: string;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log("=".repeat(60));
  console.log("K-SYSTEMS SMART CONTRACT DEPLOYMENT");
  console.log("Crown Omega Verification Protocol");
  console.log("=".repeat(60));
  console.log(`\nNetwork: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
  console.log("=".repeat(60));

  // Configuration from environment variables or defaults
  const initialSupply = process.env.INITIAL_SUPPLY || "1000000"; // 1M tokens
  const ownerAddress = process.env.OWNER_ADDRESS || deployer.address;
  
  // Treasury configuration
  const treasurySignersStr = process.env.TREASURY_SIGNERS || `${deployer.address},${deployer.address},${deployer.address}`;
  const treasurySigners = treasurySignersStr.split(',').map(addr => addr.trim());
  const treasuryThreshold = parseInt(process.env.TREASURY_THRESHOLD || "2");

  console.log("\n📋 Deployment Configuration:");
  console.log(`  Initial Supply: ${initialSupply} KSYS`);
  console.log(`  Owner Address: ${ownerAddress}`);
  console.log(`  Treasury Signers: ${treasurySigners.length}`);
  console.log(`  Treasury Threshold: ${treasuryThreshold}`);
  console.log("=".repeat(60));

  // Deploy KSystemsToken
  console.log("\n🚀 Deploying KSystemsToken...");
  const KSystemsToken = await ethers.getContractFactory("KSystemsToken");
  const token = await KSystemsToken.deploy(initialSupply, ownerAddress);
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log(`✅ KSystemsToken deployed to: ${tokenAddress}`);

  // Deploy KSystemsTreasury
  console.log("\n🚀 Deploying KSystemsTreasury...");
  const KSystemsTreasury = await ethers.getContractFactory("KSystemsTreasury");
  const treasury = await KSystemsTreasury.deploy(treasurySigners, treasuryThreshold);
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  console.log(`✅ KSystemsTreasury deployed to: ${treasuryAddress}`);

  // Deploy KSystemsRoyalty
  console.log("\n🚀 Deploying KSystemsRoyalty...");
  const KSystemsRoyalty = await ethers.getContractFactory("KSystemsRoyalty");
  const royalty = await KSystemsRoyalty.deploy();
  await royalty.waitForDeployment();
  const royaltyAddress = await royalty.getAddress();
  console.log(`✅ KSystemsRoyalty deployed to: ${royaltyAddress}`);

  // Deploy KSystemsVesting
  console.log("\n🚀 Deploying KSystemsVesting...");
  const KSystemsVesting = await ethers.getContractFactory("KSystemsVesting");
  const vesting = await KSystemsVesting.deploy(tokenAddress);
  await vesting.waitForDeployment();
  const vestingAddress = await vesting.getAddress();
  console.log(`✅ KSystemsVesting deployed to: ${vestingAddress}`);

  console.log("\n" + "=".repeat(60));
  console.log("✨ DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log(`KSystemsToken:     ${tokenAddress}`);
  console.log(`KSystemsTreasury:  ${treasuryAddress}`);
  console.log(`KSystemsRoyalty:   ${royaltyAddress}`);
  console.log(`KSystemsVesting:   ${vestingAddress}`);
  console.log("=".repeat(60));

  // Save deployment addresses
  const deploymentData: DeploymentAddresses = {
    network: network.name,
    timestamp: new Date().toISOString(),
    token: tokenAddress,
    treasury: treasuryAddress,
    royalty: royaltyAddress,
    vesting: vestingAddress,
    deployer: deployer.address
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  const filename = `deployment-${network.name}-${Date.now()}.json`;
  const filepath = path.join(deploymentsDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(deploymentData, null, 2));
  
  console.log(`\n💾 Deployment addresses saved to: ${filename}`);
  console.log("\n⚜️ Crown Omega Verification: Complete ⚜️");
  console.log("\n📝 Next steps:");
  console.log("  1. Verify contracts on block explorer (run: npm run verify)");
  console.log("  2. Update frontend/src/config/contracts.ts with addresses");
  console.log("  3. Configure initial IP assets in KSystemsRoyalty");
  console.log("  4. Set up token distribution and vesting schedules");
  console.log("=".repeat(60));

  return deploymentData;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
