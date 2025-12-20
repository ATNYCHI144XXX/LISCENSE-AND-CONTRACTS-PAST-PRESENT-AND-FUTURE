import { ethers } from "hardhat";

/**
 * Helper utilities for K-Systems contract deployment
 */

export function formatEther(value: bigint): string {
  return ethers.formatEther(value);
}

export function parseEther(value: string): bigint {
  return ethers.parseEther(value);
}

export async function getGasPrice() {
  const feeData = await ethers.provider.getFeeData();
  return feeData.gasPrice;
}

export async function estimateDeploymentCost(
  contractName: string,
  args: any[]
): Promise<bigint> {
  const factory = await ethers.getContractFactory(contractName);
  const deploymentData = factory.interface.encodeDeploy(args);
  const gasLimit = await ethers.provider.estimateGas({
    data: deploymentData,
  });
  const gasPrice = await getGasPrice();
  return gasLimit * (gasPrice || 0n);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForConfirmations(
  tx: any,
  confirmations: number = 5
) {
  console.log(`⏳ Waiting for ${confirmations} confirmations...`);
  await tx.wait(confirmations);
  console.log(`✅ ${confirmations} confirmations received`);
}

export function printSection(title: string) {
  console.log("\n" + "=".repeat(60));
  console.log(title);
  console.log("=".repeat(60));
}

export function printSuccess(message: string) {
  console.log(`✅ ${message}`);
}

export function printError(message: string) {
  console.log(`❌ ${message}`);
}

export function printInfo(message: string) {
  console.log(`ℹ️  ${message}`);
}
