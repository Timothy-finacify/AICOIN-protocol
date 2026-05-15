"use client";

import { useState } from "react";
import { 
  Search, 
  Box, 
  Flame, 
  Clock, 
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  ExternalLink
} from "lucide-react";

const TOTAL_SUPPLY = 1_000_000_000;
const CIRCULATING_SUPPLY = 500_000_000;
const TOTAL_BURNED = 12_500_000;
const BURN_RATE_24H = 42_000;
const CURRENT_BLOCK = 847291;
const HALVING_EPOCH = 0;
const BLOCKS_UNTIL_HALVING = 152709;
const TREASURY_BALANCE = 1_875_000;
const TREASURY_FEE = 0.34;

const latestBlocks = [
  { number: 847291, miner: "0x7A92...e577", txCount: 14, timestamp: "2 secs ago" },
  { number: 847290, miner: "0x3F1a...c902", txCount: 8, timestamp: "17 secs ago" },
  { number: 847289, miner: "0x9B44...d115", txCount: 22, timestamp: "32 secs ago" },
  { number: 847288, miner: "0x1C6f...a334", txCount: 5, timestamp: "47 secs ago" },
  { number: 847287, miner: "0x5E2d...f778", txCount: 19, timestamp: "1 min ago" },
];

const latestTransactions = [
  { hash: "0x8a3b...7c2f", from: "0x7A92...e577", to: "0x9B44...d115", amount: 100, burn: 20, type: "send" },
  { hash: "0x2d4e...1a9b", from: "0x3F1a...c902", to: "0x5E2d...f778", amount: 50, burn: 10, type: "send" },
  { hash: "0xf761...3c8d", from: "Mining Reward", to: "0x1C6f...a334", amount: 100, burn: 0, type: "reward" },
  { hash: "0x9e12...4b5a", from: "0x9B44...d115", to: "0x0000...dEaD", amount: 500, burn: 500, type: "burn" },
  { hash: "0x4c88...6f01", from: "0x5E2d...f778", to: "0x7A92...e577", amount: 25, burn: 5, type: "send" },
];

export default function ExplorerPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const shortenAddress = (addr: string) => {
    if (addr === "Mining Reward" || addr === "0x0000...dEaD") return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.length > 0) {
      alert(`Search for: ${searchQuery}\n\nThis will query The Graph in production.`);
    }
  };

  return (
    <div className="page-container max-w-6xl mx-auto px-4">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Block Explorer</h1>
          <p className="page-subtitle">Verify every transaction, block, and burn on AICOIN</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="network-dot" />
          <span className="network-text">Live</span>
        </div>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="search-wrapper mb-8">
        <Search className="w-4 h-4 search-icon" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by Address / Transaction Hash / Block Number..."
          className="search-input-full"
        />
      </form>

      {/* Network Stats */}
      <div className="stats-grid-explorer">
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="w-4 h-4 text-accent" />
            <span className="stat-label">Total Supply</span>
          </div>
          <div className="stat-value text-accent">{TOTAL_SUPPLY.toLocaleString()}</div>
          <div className="stat-unit">AIC (Fixed Forever)</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="w-4 h-4 text-blue" />
            <span className="stat-label">Circulating</span>
          </div>
          <div className="stat-value" style={{ color: "var(--color-synapse-blue)" }}>
            {CIRCULATING_SUPPLY.toLocaleString()}
          </div>
          <div className="stat-unit">AIC</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-4 h-4 text-danger" />
            <span className="stat-label">Total Burned</span>
          </div>
          <div className="stat-value text-danger">{TOTAL_BURNED.toLocaleString()}</div>
          <div className="stat-unit">AIC Destroyed Forever</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-purple" />
            <span className="stat-label">Burn Rate (24h)</span>
          </div>
          <div className="stat-value text-purple">{BURN_RATE_24H.toLocaleString()}</div>
          <div className="stat-unit">AIC / Day</div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="stats-grid-explorer-secondary">
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <Box className="w-4 h-4 text-accent" />
            <span className="stat-label">Current Block</span>
          </div>
          <div className="stat-value text-accent">{CURRENT_BLOCK.toLocaleString()}</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4" style={{ color: "var(--color-hash-amber)" }} />
            <span className="stat-label">Halving Epoch</span>
          </div>
          <div className="stat-value" style={{ color: "var(--color-hash-amber)" }}>{HALVING_EPOCH}</div>
          <div className="stat-unit">{BLOCKS_UNTIL_HALVING.toLocaleString()} blocks until next halving</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="w-4 h-4 text-success" />
            <span className="stat-label">Treasury</span>
          </div>
          <div className="stat-value text-success">{TREASURY_BALANCE.toLocaleString()}</div>
          <div className="stat-unit">AIC ({TREASURY_FEE}% fee)</div>
        </div>
      </div>

      {/* Latest Blocks */}
      <div className="feature-card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title flex items-center gap-2">
            <Box className="w-5 h-5 text-accent" />
            Latest Blocks
          </h2>
          <button className="text-xs text-blue">View All</button>
        </div>
        <div className="explorer-table">
          <div className="explorer-table-header">
            <span className="explorer-th">Block</span>
            <span className="explorer-th">Miner</span>
            <span className="explorer-th">TXs</span>
            <span className="explorer-th">Time</span>
          </div>
          {latestBlocks.map((block) => (
            <div key={block.number} className="explorer-tr">
              <span className="explorer-td block-number">{block.number.toLocaleString()}</span>
              <span className="explorer-td address-text">{block.miner}</span>
              <span className="explorer-td" style={{ color: "var(--color-node-teal)" }}>{block.txCount}</span>
              <span className="explorer-td text-muted">{block.timestamp}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Latest Transactions */}
      <div className="feature-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-accent" />
            Latest Transactions
          </h2>
          <button className="text-xs text-blue">View All</button>
        </div>
        <div className="explorer-table">
          <div className="explorer-table-header">
            <span className="explorer-th">TX Hash</span>
            <span className="explorer-th">From</span>
            <span className="explorer-th">To</span>
            <span className="explorer-th">Amount</span>
            <span className="explorer-th">Burn</span>
          </div>
          {latestTransactions.map((tx) => (
            <div key={tx.hash} className="explorer-tr">
              <span className="explorer-td tx-hash-link">{shortenAddress(tx.hash)}</span>
              <span className="explorer-td address-text">{shortenAddress(tx.from)}</span>
              <span className="explorer-td address-text">
                {tx.type === "burn" ? (
                  <span className="flex items-center gap-1">
                    <Flame className="w-3 h-3 text-danger" />
                    <span className="text-danger">{shortenAddress(tx.to)}</span>
                  </span>
                ) : (
                  shortenAddress(tx.to)
                )}
              </span>
              <span className="explorer-td" style={{ color: "var(--color-node-teal)", fontFamily: "monospace" }}>
                {tx.amount} AIC
              </span>
              <span className="explorer-td" style={{ 
                color: tx.burn > 0 ? "var(--color-bear-red)" : "var(--color-gas-gray)",
                fontFamily: "monospace"
              }}>
                {tx.burn > 0 ? `${tx.burn} AIC` : "-"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}