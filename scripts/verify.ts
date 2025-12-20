import { run } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Verification script for K-Systems smart contracts
 * Verifies all deployed contracts on block explorers
 * Crown Omega Verification: Public verification of sovereign protocols
 */

async function main() {
  console.log("=".repeat(60));
  console.log("K-SYSTEMS CONTRACT VERIFICATION");
  console.log("Crown Omega Public Verification Protocol");
  console.log("=".repeat(60));

  // Find the most recent deployment file
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  
  if (!fs.existsSync(deploymentsDir)) {
    console.error("❌ No deployments directory found. Deploy contracts first.");
    return;
  }

  const files = fs.readdirSync(deploymentsDir)
    .filter(f => f.startsWith("deployment-") && f.endsWith(".json"))
    .sort()
    .reverse();

  if (files.length === 0) {
    console.error("❌ No deployment files found. Deploy contracts first.");
    return;
  }

  const latestFile = files[0];
  console.log(`\n📄 Using deployment file: ${latestFile}`);
  
  const deploymentData = JSON.parse(
    fs.readFileSync(path.join(deploymentsDir, latestFile), "utf8")
  );

  console.log(`\n🌐 Network: ${deploymentData.network}`);
  console.log(`⏰ Deployed: ${deploymentData.timestamp}`);
  console.log("=".repeat(60));

  // Configuration
  const initialSupply = process.env.INITIAL_SUPPLY || "1000000";
  const ownerAddress = process.env.OWNER_ADDRESS || deploymentData.deployer;
  const treasurySignersStr = process.env.TREASURY_SIGNERS || `${deploymentData.deployer},${deploymentData.deployer},${deploymentData.deployer}`;
  const treasurySigners = treasurySignersStr.split(',').map(addr => addr.trim());
  const treasuryThreshold = parseInt(process.env.TREASURY_THRESHOLD || "2");

  // Verify KSystemsToken
  console.log("\n🔍 Verifying KSystemsToken...");
  try {
    await run("verify:verify", {
      address: deploymentData.token,
      constructorArguments: [initialSupply, ownerAddress],
    });
    console.log("✅ KSystemsToken verified");
  } catch (error: any) {
    if (error.message.includes("already verified")) {
      console.log("ℹ️  KSystemsToken already verified");
    } else {
      console.error("❌ Error verifying KSystemsToken:", error.message);
    }
  }

  // Verify KSystemsTreasury
  console.log("\n🔍 Verifying KSystemsTreasury...");
  try {
    await run("verify:verify", {
      address: deploymentData.treasury,
      constructorArguments: [treasurySigners, treasuryThreshold],
    });
    console.log("✅ KSystemsTreasury verified");
  } catch (error: any) {
    if (error.message.includes("already verified")) {
      console.log("ℹ️  KSystemsTreasury already verified");
    } else {
      console.error("❌ Error verifying KSystemsTreasury:", error.message);
    }
  }

  // Verify KSystemsRoyalty
  console.log("\n🔍 Verifying KSystemsRoyalty...");
  try {
    await run("verify:verify", {
      address: deploymentData.royalty,
      constructorArguments: [],
    });
    console.log("✅ KSystemsRoyalty verified");
  } catch (error: any) {
    if (error.message.includes("already verified")) {
      console.log("ℹ️  KSystemsRoyalty already verified");
    } else {
      console.error("❌ Error verifying KSystemsRoyalty:", error.message);
    }
  }

  // Verify KSystemsVesting
  console.log("\n🔍 Verifying KSystemsVesting...");
  try {
    await run("verify:verify", {
      address: deploymentData.vesting,
      constructorArguments: [deploymentData.token],
    });
    console.log("✅ KSystemsVesting verified");
  } catch (error: any) {
    if (error.message.includes("already verified")) {
      console.log("ℹ️  KSystemsVesting already verified");
    } else {
      console.error("❌ Error verifying KSystemsVesting:", error.message);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("✨ VERIFICATION COMPLETE");
  console.log("⚜️ Crown Omega Public Verification: Complete ⚜️");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
