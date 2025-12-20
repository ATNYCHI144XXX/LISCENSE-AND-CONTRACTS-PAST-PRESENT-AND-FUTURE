# K-Systems DApp Frontend

React + TypeScript + Vite frontend for K-Systems smart contract infrastructure.

## Features

- 🪙 **Token Dashboard**: View balance, transfer KSYS tokens
- 🏦 **Treasury Panel**: Multi-sig treasury management
- 💎 **Royalty Manager**: IP asset registration and royalty distribution
- ⏰ **Vesting Dashboard**: Token vesting schedule management
- 🔐 **Wallet Integration**: MetaMask, Coinbase Wallet support

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Configuration

### 1. Update Contract Addresses

After deploying smart contracts, update `src/config/contracts.ts`:

```typescript
export const contracts = {
  token: {
    address: '0xYourTokenAddress',
    abi: TokenABI
  },
  // ... other contracts
}
```

### 2. Import ABIs

Copy contract ABIs from `../artifacts/contracts/` after compilation:

```bash
# From root directory
npm run compile

# ABIs will be in artifacts/contracts/ContractName.sol/ContractName.json
```

### 3. Environment Variables

Create `.env` file (optional):

```env
VITE_ALCHEMY_API_KEY=your_alchemy_key
VITE_DEFAULT_CHAIN_ID=11155111
```

## Tech Stack

- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **TailwindCSS**: Styling
- **ethers.js**: Ethereum interaction
- **wagmi**: React hooks for Ethereum

## Project Structure

```
frontend/
├── src/
│   ├── components/       # React components
│   │   ├── WalletConnect.tsx
│   │   ├── TokenDashboard.tsx
│   │   ├── TreasuryPanel.tsx
│   │   ├── RoyaltyManager.tsx
│   │   └── VestingDashboard.tsx
│   ├── config/           # Configuration
│   │   ├── contracts.ts
│   │   └── chains.ts
│   ├── hooks/            # Custom React hooks
│   ├── styles/           # Global styles
│   ├── types/            # TypeScript definitions
│   ├── App.tsx           # Main app component
│   └── main.tsx          # Entry point
├── index.html
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

## Development

### Adding Contract Interaction

1. Import contract ABI in `config/contracts.ts`
2. Create a custom hook in `hooks/`
3. Use the hook in your component

Example:

```typescript
// hooks/useTokenBalance.ts
import { useEffect, useState } from 'react'
import { ethers } from 'ethers'
import { contracts } from '../config/contracts'

export function useTokenBalance(address: string) {
  const [balance, setBalance] = useState('0')

  useEffect(() => {
    const fetchBalance = async () => {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const contract = new ethers.Contract(
        contracts.token.address,
        contracts.token.abi,
        provider
      )
      const balance = await contract.balanceOf(address)
      setBalance(ethers.formatEther(balance))
    }

    if (address) {
      fetchBalance()
    }
  }, [address])

  return balance
}
```

### Styling

Using TailwindCSS with custom K-Systems theme:

```tsx
<div className="bg-ksystems-primary text-white">
  Crown Omega Verified
</div>
```

Custom colors:
- `ksystems-primary`: #1E3A8A
- `ksystems-secondary`: #3B82F6
- `ksystems-accent`: #60A5FA

## Testing

```bash
# Run linter
npm run lint

# Type check
npx tsc --noEmit
```

## Deployment

### Build for Production

```bash
npm run build
```

Output will be in `dist/` directory.

### Deploy to Vercel

```bash
npm install -g vercel
vercel --prod
```

### Deploy to GitHub Pages

```bash
# Install gh-pages
npm install -D gh-pages

# Add to package.json scripts:
# "deploy": "npm run build && gh-pages -d dist"

npm run deploy
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Opera (latest)

**Note**: MetaMask or compatible Web3 wallet required.

## License

PROPRIETARY - All Rights Reserved
Owner: ATNYCHI144XXX (Brendon Joseph Kelly)

---

⚜️ **Crown Omega Verified** ⚜️
K-Systems Sovereign Architecture
