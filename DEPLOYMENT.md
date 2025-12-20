# K-Systems Smart Contract Deployment Guide

This guide provides step-by-step instructions for deploying the K-Systems smart contract infrastructure to various blockchain networks.

---

## 📋 Pre-Deployment Checklist

### 1. Environment Setup

- [ ] Node.js >= 18.0.0 installed
- [ ] Git repository cloned
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file configured with all required variables

### 2. Wallet Preparation

- [ ] Deployment wallet created and secured
- [ ] Private key added to `.env` (NEVER commit this!)
- [ ] Wallet funded with native currency for gas:
  - Sepolia testnet: Get free ETH from faucet
  - Ethereum mainnet: Ensure sufficient ETH (~0.5 ETH recommended)
  - Polygon: Ensure sufficient MATIC
  - Base: Ensure sufficient ETH

### 3. API Keys

- [ ] Alchemy API key obtained
- [ ] Etherscan API key obtained (for verification)
- [ ] Polygonscan API key obtained (if deploying to Polygon)
- [ ] Basescan API key obtained (if deploying to Base)

### 4. Configuration Review

- [ ] Initial token supply configured (`INITIAL_SUPPLY`)
- [ ] Treasury signers addresses prepared (`TREASURY_SIGNERS`)
- [ ] Treasury threshold determined (`TREASURY_THRESHOLD`)
- [ ] Owner address configured (if different from deployer)

---

## 🌐 Testnet Deployment (Recommended First)

### Deploy to Sepolia Testnet

#### Step 1: Get Testnet ETH

Visit Sepolia faucet:
- https://sepoliafaucet.com/
- https://faucet.quicknode.com/ethereum/sepolia

Request at least 0.5 ETH for deployment and testing.

#### Step 2: Configure Environment

```bash
# .env configuration for Sepolia
PRIVATE_KEY=your_private_key_here
ALCHEMY_API_KEY=your_alchemy_key
ETHERSCAN_API_KEY=your_etherscan_key

INITIAL_SUPPLY=1000000
TREASURY_SIGNERS=0xAddr1,0xAddr2,0xAddr3
TREASURY_THRESHOLD=2
```

#### Step 3: Deploy

```bash
npm run deploy:sepolia
```

Expected output:
```
============================================================
K-SYSTEMS SMART CONTRACT DEPLOYMENT
Crown Omega Verification Protocol
============================================================

Network: sepolia (Chain ID: 11155111)
Deployer: 0x...
Balance: 0.5 ETH
============================================================

🚀 Deploying KSystemsToken...
✅ KSystemsToken deployed to: 0x...

🚀 Deploying KSystemsTreasury...
✅ KSystemsTreasury deployed to: 0x...

🚀 Deploying KSystemsRoyalty...
✅ KSystemsRoyalty deployed to: 0x...

🚀 Deploying KSystemsVesting...
✅ KSystemsVesting deployed to: 0x...

💾 Deployment addresses saved to: deployment-sepolia-...json
```

#### Step 4: Verify Contracts

Wait ~1 minute for blocks to confirm, then:

```bash
npm run verify
```

This will verify all contracts on Etherscan.

#### Step 5: Test on Sepolia

- Import token to MetaMask using token address
- Interact with contracts through Etherscan
- Test treasury proposals
- Test royalty payments
- Verify all functionality works as expected

---

## 🚀 Mainnet Deployment

### Security Considerations

**⚠️ CRITICAL WARNINGS:**

1. **Audit First**: Ensure contracts are audited before mainnet deployment
2. **Test Thoroughly**: Complete testing on testnet before mainnet
3. **Secure Private Keys**: Use hardware wallet or multi-sig for deployment
4. **Verify Addresses**: Triple-check all addresses in configuration
5. **Gas Prices**: Monitor gas prices and deploy during low-congestion times
6. **Backup Everything**: Save all deployment data securely

### Deploy to Ethereum Mainnet

#### Step 1: Final Preparation

```bash
# Verify compilation
npm run compile

# Run full test suite
npm test

# Check gas estimates
REPORT_GAS=true npm test
```

#### Step 2: Configure Mainnet Settings

```bash
# .env for Ethereum Mainnet
PRIVATE_KEY=your_secure_private_key
ALCHEMY_API_KEY=your_alchemy_key
ETHERSCAN_API_KEY=your_etherscan_key

# Production configuration
INITIAL_SUPPLY=1000000
OWNER_ADDRESS=0xYourMultiSigOrSecureAddress
TREASURY_SIGNERS=0xSigner1,0xSigner2,0xSigner3
TREASURY_THRESHOLD=2
```

#### Step 3: Pre-Deployment Checks

```bash
# Check deployer balance
npx hardhat run scripts/check-balance.ts --network ethereum

# Estimate deployment cost
# Expected: ~0.3-0.5 ETH depending on gas prices
```

#### Step 4: Deploy to Mainnet

```bash
npm run deploy:ethereum
```

**Monitor the deployment carefully:**
- Watch each transaction on Etherscan
- Verify each contract deploys successfully
- Save all transaction hashes
- Backup deployment JSON file

#### Step 5: Verify on Etherscan

```bash
npm run verify
```

#### Step 6: Post-Deployment Security

1. **Transfer Ownership**:
   ```bash
   # Transfer token admin role to multi-sig
   npx hardhat run scripts/transfer-roles.ts --network ethereum
   ```

2. **Verify Permissions**:
   - Confirm all roles are set correctly
   - Verify treasury signers are correct
   - Check owner addresses

3. **Initial Configuration**:
   - Register initial IP assets in KSystemsRoyalty
   - Set up initial vesting schedules if needed
   - Fund treasury if required

4. **Documentation**:
   - Update README.md with contract addresses
   - Update frontend configuration
   - Document all deployment parameters

---

## 🔷 Polygon Deployment

Polygon offers lower gas fees and faster transactions.

### Deploy to Polygon Mainnet

```bash
# Configure .env for Polygon
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
POLYGONSCAN_API_KEY=your_polygonscan_key

# Deploy
npm run deploy:polygon

# Verify
npm run verify
```

### Polygon Gas Considerations

- Gas fees are much lower (~$0.01-$0.10 per transaction)
- Deployment typically costs < 10 MATIC
- Faster block times (2-3 seconds vs 12 seconds)

---

## 🔵 Base Deployment

Base is an Ethereum Layer 2 with low fees and high throughput.

### Deploy to Base Mainnet

```bash
# Configure .env for Base
BASE_RPC_URL=https://mainnet.base.org
BASESCAN_API_KEY=your_basescan_key

# Deploy
npm run deploy:base

# Verify
npm run verify
```

---

## 📋 Post-Deployment Configuration

### 1. Register IP Assets

```javascript
// Register K-Systems IP in royalty contract
await royalty.registerIPAsset(
  "K-MOS-001",                           // assetId
  "K-Mathematical Operating System",     // name
  "Mathematical",                        // category
  [recipient1, recipient2],              // recipients
  [7000, 3000]                          // shares (70%, 30%)
);
```

### 2. Create Vesting Schedules

```javascript
// Create team vesting schedule
await vesting.createVestingSchedule(
  teamMemberAddress,                    // beneficiary
  ethers.parseEther("100000"),         // 100k tokens
  startTime,                           // start timestamp
  365 * 24 * 60 * 60,                 // 1 year cliff
  4 * 365 * 24 * 60 * 60,            // 4 year total duration
  true                                // revocable
);
```

### 3. Configure Treasury

```javascript
// Example: Submit funding proposal
await treasury.submitTransaction(
  recipientAddress,
  ethers.parseEther("10"),
  "0x",
  "Q1 Development Funding"
);
```

### 4. Grant Permissions

```javascript
// Grant minter role to vesting contract
const MINTER_ROLE = await token.MINTER_ROLE();
await token.grantRole(MINTER_ROLE, vestingAddress);
```

---

## 🔍 Verification Checklist

After deployment, verify:

- [ ] All contracts deployed successfully
- [ ] All contracts verified on block explorer
- [ ] Token has correct name, symbol, supply
- [ ] Treasury has correct signers and threshold
- [ ] Royalty contract owner is correct
- [ ] Vesting contract has token address configured
- [ ] Initial token distribution completed
- [ ] Roles and permissions properly configured
- [ ] Frontend updated with contract addresses
- [ ] Documentation updated
- [ ] Deployment backed up securely

---

## 🚨 Troubleshooting

### Common Issues

#### 1. "Insufficient funds" error

**Solution**: Ensure wallet has enough native currency for gas fees.

```bash
# Check balance
npx hardhat run scripts/check-balance.ts --network <network>
```

#### 2. "Nonce too high" error

**Solution**: Reset nonce or wait for pending transactions.

```bash
# Clear pending transactions in MetaMask
# Settings -> Advanced -> Reset Account
```

#### 3. "Timeout waiting for deployment"

**Solution**: Increase timeout in hardhat.config.ts:

```typescript
networks: {
  ethereum: {
    // ...
    timeout: 120000  // 2 minutes
  }
}
```

#### 4. Verification fails

**Solution**: Wait longer before verifying (1-2 minutes), then retry:

```bash
npm run verify
```

If still failing, manually verify on Etherscan using the deployment JSON.

---

## 📞 Support

For deployment issues:

1. Check contract addresses in `deployments/` directory
2. Review deployment logs
3. Verify `.env` configuration
4. Check network status on status.alchemy.com
5. Create GitHub issue if problems persist

---

## ⚜️ Crown Omega Deployment Protocol Complete ⚜️

Your K-Systems smart contract infrastructure is now deployed and ready for sovereign operations.

**Next Steps:**
1. Update frontend with contract addresses
2. Configure initial IP assets
3. Set up monitoring and alerts
4. Begin token distribution
5. Activate PDCN disbursement protocol

---

*Deployment Guide - K-Systems Sovereign Architecture*
*Crown Omega Verified - All Rights Reserved*
