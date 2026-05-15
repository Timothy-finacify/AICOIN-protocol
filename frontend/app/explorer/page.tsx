"use client";

import { useState } from "react";
import { useTotalSupply, useTotalBurned } from "@/hooks/useAICOIN";
import { formatUnits } from "viem";
import { 
  Search, 
  Box, 
  Flame, 
  Clock, 
  Coins
} from "lucide-react";

export default function ExplorerPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: totalSupply } = useTotalSupply();
  const { data: totalBurned } = useTotalBurned();

  const supply = totalSupply ? Number(formatUnits(totalSupply as bigint, 9)) : 0;
  const burned = totalBurned ? Number(formatUnits(totalBurned as bigint, 9)) : 0;
  const circulating = supply - burned;

  return (
    <div className="page-container max-w-6xl mx-auto px-4">
      <div className="page-header">
        <div>
          <h1 className="page-title">Block Explorer</h1>
          <p className="page-subtitle">Real-time AICOIN network data from Sepolia testnet</p>
        </div>
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="search-wrapper mb-8">
        <Search className="w-4 h-4 search-icon" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by Address / Transaction Hash..."
          className="search-input-full"
        />
      </form>

      <div className="stats-grid-explorer">
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="w-4 h-4 text-accent" />
            <span className="stat-label">Total Supply</span>
          </div>
          <div className="stat-value text-accent">{supply.toLocaleString()}</div>
          <div className="stat-unit">AIC (Fixed Forever)</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="w-4 h-4 text-blue" />
            <span className="stat-label">Circulating</span>
          </div>
          <div className="stat-value" style={{ color: "var(--color-synapse-blue)" }}>
            {circulating.toLocaleString()}
          </div>
          <div className="stat-unit">AIC</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-4 h-4 text-danger" />
            <span className="stat-label">Total Burned</span>
          </div>
          <div className="stat-value text-danger">{burned.toLocaleString()}</div>
          <div className="stat-unit">AIC Destroyed Forever</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-purple" />
            <span className="stat-label">Status</span>
          </div>
          <div className="stat-value text-success">Live</div>
          <div className="stat-unit">Sepolia Testnet</div>
        </div>
      </div>

      <div className="feature-card text-center py-16">
        <Box className="w-12 h-12 mx-auto mb-4 text-muted" />
        <h3 className="text-lg font-semibold text-white mb-2">More Data Coming Soon</h3>
        <p className="text-muted">
          Block and transaction data will be fully live after The Graph indexing is deployed.
          Core supply and burn stats are reading directly from the blockchain.
        </p>
      </div>
    </div>
  );
}