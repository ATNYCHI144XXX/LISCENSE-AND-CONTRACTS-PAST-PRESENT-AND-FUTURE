import { useState } from 'react'
import WalletConnect from './components/WalletConnect'
import TokenDashboard from './components/TokenDashboard'
import TreasuryPanel from './components/TreasuryPanel'
import RoyaltyManager from './components/RoyaltyManager'
import VestingDashboard from './components/VestingDashboard'

function App() {
  const [activeTab, setActiveTab] = useState<'token' | 'treasury' | 'royalty' | 'vesting'>('token')

  const tabs = [
    { id: 'token', label: 'Token Dashboard', icon: '🪙' },
    { id: 'treasury', label: 'Treasury', icon: '🏦' },
    { id: 'royalty', label: 'Royalty Manager', icon: '💎' },
    { id: 'vesting', label: 'Vesting', icon: '⏰' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-ksystems-dark via-gray-900 to-ksystems-primary">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-sm border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="text-3xl crown-omega-seal">⚜️</div>
              <div>
                <h1 className="text-2xl font-bold text-white">K-Systems DApp</h1>
                <p className="text-sm text-gray-400 font-mono">Crown Omega Verified</p>
              </div>
            </div>
            <WalletConnect />
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-black/20 backdrop-blur-sm border-b border-gray-700">
        <div className="container mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  px-6 py-3 font-medium transition-all duration-200 whitespace-nowrap
                  border-b-2 ${
                    activeTab === tab.id
                      ? 'border-ksystems-accent text-white'
                      : 'border-transparent text-gray-400 hover:text-gray-200'
                  }
                `}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {activeTab === 'token' && <TokenDashboard />}
        {activeTab === 'treasury' && <TreasuryPanel />}
        {activeTab === 'royalty' && <RoyaltyManager />}
        {activeTab === 'vesting' && <VestingDashboard />}
      </main>

      {/* Footer */}
      <footer className="bg-black/30 backdrop-blur-sm border-t border-gray-700 mt-20">
        <div className="container mx-auto px-4 py-6 text-center text-gray-400 text-sm">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="crown-omega-seal">⚜️</span>
            <span>K-Systems Sovereign Architecture</span>
          </div>
          <p className="font-mono text-xs">
            77+ Systems | $2.8T+ Asset Infrastructure | Crown Omega Verified
          </p>
          <p className="text-xs mt-2 text-gray-500">
            All Rights Reserved • ATNYCHI144XXX (Brendon Joseph Kelly)
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
