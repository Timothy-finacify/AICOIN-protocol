"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected, walletConnect, coinbaseWallet } from "wagmi/connectors";
import { useState } from "react";
import Link from "next/link";
import { 
  Wallet, 
  Store, 
  Search,
  Building2,
  LogOut, 
  X, 
  ChevronDown,
  Wallet2,
  Link2,
  CircleDot
} from "lucide-react";

export function Navbar() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const [showWalletMenu, setShowWalletMenu] = useState(false);

  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const walletOptions = [
    {
      name: "MetaMask",
      icon: Wallet2,
      connector: injected(),
    },
    {
      name: "WalletConnect",
      icon: Link2,
      connector: walletConnect({
        projectId: "aicoin-protocol",
      }),
    },
    {
      name: "Coinbase Wallet",
      icon: CircleDot,
      connector: coinbaseWallet(),
    },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link href="/" className="navbar-brand">
          AICOIN
        </Link>
        
        <div className="navbar-links">
          <Link href="/wallet" className="navbar-link">
            <Wallet className="navbar-link-icon" />
            <span>Wallet</span>
          </Link>
          <Link href="/marketplace" className="navbar-link">
            <Store className="navbar-link-icon" />
            <span>Marketplace</span>
          </Link>
          <Link href="/explorer" className="navbar-link">
            <Search className="navbar-link-icon" />
            <span>Explorer</span>
          </Link>
          <Link href="/register" className="navbar-link">
            <Building2 className="navbar-link-icon" />
            <span>Register</span>
          </Link>

          <div className="relative">
            {isConnected ? (
              <div className="flex items-center gap-3">
                <span className="address-chip">
                  {address ? shortenAddress(address) : ""}
                </span>
                <button onClick={() => disconnect()} className="icon-btn">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div>
                <button onClick={() => setShowWalletMenu(!showWalletMenu)} className="connect-btn">
                  <Wallet className="w-4 h-4" />
                  <span>Connect Wallet</span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {showWalletMenu && (
                  <div className="wallet-dropdown">
                    <div className="wallet-dropdown-header">
                      <span className="wallet-dropdown-title">Connect Wallet</span>
                      <button onClick={() => setShowWalletMenu(false)} className="wallet-dropdown-close">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="wallet-dropdown-list">
                      {walletOptions.map((wallet) => {
                        const IconComponent = wallet.icon;
                        return (
                          <button
                            key={wallet.name}
                            onClick={() => {
                              connect({ connector: wallet.connector });
                              setShowWalletMenu(false);
                            }}
                            className="wallet-option"
                          >
                            <IconComponent className="w-5 h-5 wallet-option-icon" />
                            <span className="wallet-option-name">{wallet.name}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="wallet-dropdown-footer">
                      <p>By connecting, you agree to the Terms of Service</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}