"use client";

import { useAccount } from "wagmi";
import { useState, useEffect } from "react";
import { 
  Cpu, HardDrive, Zap, Activity, Play, Square, RefreshCw, 
  Shield, Star, AlertTriangle, Ban, Clock, Server, Smartphone, Monitor
} from "lucide-react";
import { useMinerFullStatus } from "@/hooks/useAICOIN";

export default function MinePage() {
  const { address, isConnected } = useAccount();
  const minerStatus = useMinerFullStatus(address);
  const [isMining, setIsMining] = useState(false);
  const [hashRate, setHashRate] = useState(0);
  const [selectedTier, setSelectedTier] = useState(0);
  const [taskCounts, setTaskCounts] = useState({ tier0: 0, tier1: 0, tier2: 0 });

  const tierNames = ["Mobile / CPU", "Consumer GPU", "Data Center"];
  const tierIcons = [Smartphone, Monitor, Server];
  const tierColors = ["text-blue", "text-accent", "text-purple"];

  const tierTasks: Record<number, string[]> = {
    0: ["Proof Verification", "Data Validation", "Network Relay", "Preprocessing"],
    1: ["Small Model Inference", "Proof Verification", "Data Validation", "Preprocessing"],
    2: ["Large Model Inference", "Video Processing", "Agent Conversations", "All Tier 0 & 1 Tasks"],
  };

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch("http://localhost:5000/status");
        const data = await response.json();
        if (data.mining_active) {
          setIsMining(true);
          setHashRate(15.4);
        }
      } catch {}
    };
    checkStatus();
  }, []);

  if (!isConnected) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="flex justify-center mb-6">
            <div className="auth-icon-circle"><Cpu className="auth-icon" /></div>
          </div>
          <h2 className="auth-title">Connect Your Wallet</h2>
          <p className="text-center mb-6 text-muted">Connect your wallet to start mining AICOIN.</p>
        </div>
      </div>
    );
  }

  const handleToggleMining = async () => {
    if (isMining) {
      try { await fetch("http://localhost:5000/stop", { method: "POST" }); } catch {}
      setIsMining(false);
      setHashRate(0);
    } else {
      try {
        await fetch("http://localhost:5000/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet: address, iterations: 100, tier: selectedTier })
        });
      } catch {}
      setIsMining(true);
      setHashRate(15.4);
    }
  };

  const TierIcon = tierIcons[selectedTier];

  return (
    <div className="page-container max-w-6xl mx-auto px-4">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Mining Dashboard</h1>
          <p className="page-subtitle">Tiered mining system — Every device earns AICOIN</p>
        </div>
        <button className="refresh-btn"><RefreshCw className="w-4 h-4 text-muted" /></button>
      </div>

      {/* Hardware Tier Selection */}
      <div className="feature-card mb-6">
        <div className="flex items-center gap-2 mb-4">
          <HardDrive className="w-5 h-5 text-accent" />
          <h2 className="section-title">Your Hardware Tier</h2>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-4">
          {[0, 1, 2].map((tier) => {
            const Icon = tierIcons[tier];
            return (
              <button
                key={tier}
                onClick={() => setSelectedTier(tier)}
                className={`p-4 rounded-xl text-center transition-all ${
                  selectedTier === tier 
                    ? "border-2 border-accent bg-opacity-10" 
                    : "border border-gray-700"
                }`}
                style={{
                  backgroundColor: selectedTier === tier ? "rgba(0,212,170,0.08)" : "var(--color-tensor-dark)",
                  borderColor: selectedTier === tier ? "var(--color-node-teal)" : "var(--color-stable-gray)"
                }}
              >
                <Icon className={`w-8 h-8 mx-auto mb-2 ${tierColors[tier]}`} />
                <div className="text-sm font-semibold text-white">{tierNames[tier]}</div>
                <div className="text-xs text-muted mt-1">
                  {tier === 0 ? "Phones, Basic Laptops" : tier === 1 ? "Gaming PCs, RTX 3060+" : "H100, A100, Servers"}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tier Capabilities */}
      <div className="feature-card mb-6">
        <div className="flex items-center gap-2 mb-3">
          <TierIcon className={`w-5 h-5 ${tierColors[selectedTier]}`} />
          <h2 className="section-title">What {tierNames[selectedTier]} Can Mine</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {tierTasks[selectedTier].map((task) => (
            <div key={task} className="p-3 rounded-lg text-center" style={{ backgroundColor: "var(--color-tensor-dark)", border: "1px solid var(--color-stable-gray)" }}>
              <Zap className="w-4 h-4 mx-auto mb-1 text-accent" />
              <span className="text-xs text-white font-medium">{task}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: "rgba(0,212,170,0.05)", border: "1px solid rgba(0,212,170,0.15)" }}>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-accent" />
            <span className="text-sm text-white font-medium">Reward: 10 AIC per valid proof — Same for all tiers</span>
          </div>
        </div>
      </div>

      {/* On-Chain Miner Status */}
      <div className="feature-card mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-accent" />
          <h2 className="section-title">Your On-Chain Miner Card</h2>
        </div>
        
        {minerStatus ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="stat-card">
                <span className="stat-label">Staked AIC</span>
                <div className="stat-value text-accent">{minerStatus.stakeAmount.toLocaleString()}</div>
                <div className="stat-unit">{minerStatus.stakeAmount > 0 ? "Ready" : "Stake to start"}</div>
              </div>
              <div className="stat-card">
                <span className="stat-label">Reputation</span>
                <div className={`stat-value ${minerStatus.reputation < 0 ? 'text-danger' : 'text-blue'}`}>
                  {minerStatus.reputation}
                </div>
                <div className="stat-unit">{minerStatus.reputation < 0 ? "Penalized" : "Neutral"}</div>
              </div>
              <div className="stat-card">
                <span className="stat-label">Status</span>
                <div className={`stat-value ${minerStatus.isBanned ? 'text-danger' : 'text-success'}`}>
                  {minerStatus.isBanned ? "BANNED" : "Active"}
                </div>
                <div className="stat-unit">Tier {selectedTier}</div>
              </div>
            </div>

            {minerStatus.offenseCount > 0 && (
              <div className="p-4 rounded-xl" style={{ backgroundColor: "rgba(255,71,87,0.08)", border: "1px solid rgba(255,71,87,0.2)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-danger" />
                  <span className="text-sm font-semibold text-white">Offense Record</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div><span className="text-muted">Offenses:</span> <span className="text-white font-semibold">{minerStatus.offenseCount}</span></div>
                  <div><span className="text-muted">Honest Days:</span> <span className="text-success font-semibold">{minerStatus.honestDays}</span></div>
                  <div><span className="text-muted">Restoration:</span> <span className="text-blue font-semibold">{minerStatus.daysUntilRestoration > 0 ? `${minerStatus.daysUntilRestoration}d` : "Active"}</span></div>
                </div>
              </div>
            )}

            {minerStatus.offenseCount === 0 && minerStatus.stakeAmount > 0 && (
              <div className="p-3 rounded-lg flex items-center gap-2" style={{ backgroundColor: "rgba(0,255,136,0.05)", border: "1px solid rgba(0,255,136,0.15)" }}>
                <Star className="w-4 h-4 text-success" />
                <span className="text-sm text-success">Clean record. Keep mining honestly.</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted text-sm">Connect wallet to see your miner status.</p>
        )}
      </div>

      {/* Mining Control */}
      <div className="feature-card mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full ${isMining ? 'pulse-dot-active' : 'pulse-dot-inactive'}`} />
            <div>
              <h2 className="text-lg font-semibold text-white">{isMining ? "Mining Active" : "Mining Stopped"}</h2>
              <p className="text-sm text-muted">
                {isMining 
                  ? `Running on ${tierNames[selectedTier]} — Processing ${tierTasks[selectedTier][0]}`
                  : "Start mining to earn AICOIN"}
              </p>
            </div>
          </div>
          <button 
            onClick={handleToggleMining} 
            disabled={minerStatus?.isBanned || (minerStatus?.stakeAmount ?? 0) === 0} 
            className={isMining ? "mining-stop-btn" : "mining-start-btn"}
          >
            {isMining ? (<><Square className="w-4 h-4" /><span>Stop</span></>) : (<><Play className="w-4 h-4" /><span>Start Mining</span></>)}
          </button>
        </div>
        {minerStatus?.isBanned && <p className="text-sm text-danger mt-3">Banned due to repeated offenses.</p>}
        {(minerStatus?.stakeAmount ?? 0) === 0 && <p className="text-sm text-danger mt-3">Stake $10 worth of AIC to start mining.</p>}
      </div>

      {/* Mining Log */}
      <div className="feature-card">
        <h2 className="section-title mb-4 flex items-center gap-2"><Activity className="w-5 h-5 text-accent" />Mining Log</h2>
        <div className="mining-log">
          {isMining ? (
            <div className="mining-log-entry">
              <span className="mining-log-time">Now</span>
              <span className="mining-log-status text-success">
                Mining on {tierNames[selectedTier]} — {tierTasks[selectedTier][0]} — Proofs submitting to Verifier
              </span>
            </div>
          ) : (
            <div className="mining-log-entry">
              <span className="mining-log-time">--:--:--</span>
              <span className="mining-log-status text-muted">Select your hardware tier and start mining</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 