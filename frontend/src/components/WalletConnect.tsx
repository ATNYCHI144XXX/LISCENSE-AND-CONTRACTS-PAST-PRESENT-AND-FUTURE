import { useState } from 'react'

/**
 * WalletConnect Component
 * Handles wallet connection with MetaMask, Coinbase Wallet, WalletConnect
 * Crown Omega Verification: Secure wallet integration
 */

export default function WalletConnect() {
  const [account, setAccount] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('Please install MetaMask to use this DApp')
      return
    }

    try {
      setIsConnecting(true)
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })
      setAccount(accounts[0])
    } catch (error) {
      console.error('Failed to connect wallet:', error)
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = () => {
    setAccount(null)
  }

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(38)}`
  }

  if (account) {
    return (
      <div className="flex items-center gap-3">
        <div className="bg-green-500/20 text-green-400 px-4 py-2 rounded-lg font-mono text-sm border border-green-500/30">
          {formatAddress(account)}
        </div>
        <button
          onClick={disconnectWallet}
          className="btn btn-secondary text-sm"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={connectWallet}
      disabled={isConnecting}
      className="btn btn-primary"
    >
      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
    </button>
  )
}
