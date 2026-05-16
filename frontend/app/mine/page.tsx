  "use client";

import { useAccount } from "wagmi";
import { useState, useEffect } from "react";
import { 
  Cpu, HardDrive, Zap, Timer, TrendingUp, Activity, CircleDot, Play, Square, RefreshCw, Shield, Star, AlertTriangle, Ban, Clock
} from "lucide-react";
import { useMinerFullStatus } from "@/hooks/useAICOIN";

export default function MinePage() {
  const { address, isConnected } = useAccount();
  const minerStatus = useMinerFullStatus(address);
  const [isMining, setIsMining] = useState(false);
  const [selectedGPU, setSelectedGPU] = useState(0);
  const [hashRate, setHashRate] = useState(0);

  useEffect(() => {
    if (isMining && minerStatus) {
      const interval = setInterval(async () => {
        try {
          await fetch("http://localhost:5000/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ wallet: address, iterations: 50 })
          });
        } catch {}
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [isMining, address]);

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

  const gpuList = [
    { name: "NVIDIA RTX 3060", memory: "12GB", hashRate: 15.4, power: "170W" },
    { name: "NVIDIA RTX 4070", memory: "12GB", hashRate: 24.8, power: "200W" },
    { name: "AMD RX 6800", memory: "16GB", hashRate: 18.2, power: "250W" },
    { name: "Apple M2 Pro", memory: "16GB", hashRate: 12.6, power: "30W" },
    { name: "CPU Mining", memory: "System", hashRate: 2.1, power: "65W" },
  ];

  const handleToggleMining = async () => {
    if (isMining) {
      await fetch("http://localhost:5000/stop", { method: "POST" });
      setIsMining(false);
      setHashRate(0);
    } else {
      setIsMining(true);
      setHashRate(gpuList[selectedGPU].hashRate);
    }
  };

  const reputationColor = minerStatus ? 
    minerStatus.reputation > 0 ? "text-success" :
    minerStatus.reputation < 0 ? "text-danger" : "text-blue" : "text-muted";

  return (
    <div className="page-container max-w-5xl mx-auto px-4">
      <div className="page-header">
        <div>
          <h1 className="page-title">Mining Dashboard</h1>
          <p className="page-subtitle">Dynamic stake system — Verifier V2 on Sepolia</p>
        </div>
        <button className="refresh-btn"><RefreshCw className="w-4 h-4 text-muted" /></button>
      </div>

      {/* On-Chain Miner Status */}
      <div className="feature-card mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-accent" />
          <h2 className="section-title">Your On-Chain Miner Card</h2>
        </div>
        
        {minerStatus ? (
          <div className="space-y-4">
            {/* Status Row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="stat-card">
                <span className="stat-label">Staked AIC</span>
                <div className="stat-value text-accent">{minerStatus.stakeAmount.toLocaleString()}</div>
                <div className="stat-unit">{minerStatus.stakeAmount > 0 ? "Ready to mine" : "Stake to start"}</div>
              </div>
              <div className="stat-card">
                <span className="stat-label">Reputation</span>
                <div className={`stat-value ${reputationColor}`}>{minerStatus.reputation}</div>
                <div className="stat-unit">
                  {minerStatus.reputation < 0 ? "Penalized" : minerStatus.reputation > 0 ? "Positive" : "Neutral"}
                </div>
              </div>
              <div className="stat-card">
                <span className="stat-label">Status</span>
                <div className={`stat-value ${minerStatus.isBanned ? 'text-danger' : 'text-success'}`}>
                  {minerStatus.isBanned ? "BANNED" : "Active"}
                </div>
                <div className="stat-unit">Verifier V2</div>
              </div>
            </div>

            {/* Offense & Recovery Row */}
            {minerStatus.offenseCount > 0 && (
              <div className="p-4 rounded-xl" style={{ backgroundColor: "rgba(255, 71, 87, 0.08)", border: "1px solid rgba(255, 71, 87, 0.2)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-danger" />
                  <span className="text-sm font-semibold text-white">Offense Record</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted">Total Offenses:</span>
                    <span className="text-white ml-2 font-semibold">{minerStatus.offenseCount}</span>
                  </div>
                  <div>
                    <span className="text-muted">Honest Days:</span>
                    <span className="text-success ml-2 font-semibold">{minerStatus.honestDays}</span>
                  </div>
                  <div>
                    <span className="text-muted">Restoration in:</span>
                    <span className="text-blue ml-2 font-semibold">
                      {minerStatus.daysUntilRestoration > 0 ? `${minerStatus.daysUntilRestoration} days` : "Started"}
                    </span>
                  </div>
                </div>
                {minerStatus.reputation < 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-blue" />
                      <span className="text-xs text-muted">
                        Reputation restores +1 every 30 days of honest mining after a 30-day waiting period.
                        Full reset at 365 days. Any new offense resets the clock.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Clean Record */}
            {minerStatus.offenseCount === 0 && minerStatus.stakeAmount > 0 && (
              <div className="p-3 rounded-lg flex items-center gap-2" style={{ backgroundColor: "rgba(0, 255, 136, 0.05)", border: "1px solid rgba(0, 255, 136, 0.15)" }}>
                <Star className="w-4 h-4 text-success" />
                <span className="text-sm text-success">Clean record. No offenses. Keep mining honestly.</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted text-sm">Connect wallet to see your miner status.</p>
        )}
      </div>

      {/* Mining Stats */}
      <div className="mining-stats-grid">
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-3">
            <Activity className="w-5 h-5" style={{ color: "var(--color-node-teal)" }} />
            <span className="stat-label">Hash Rate</span>
          </div>
          <div className="stat-value" style={{ color: "var(--color-node-teal)" }}>{hashRate.toFixed(1)}</div>
          <div className="stat-unit">proofs/sec</div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="w-5 h-5 text-accent" />
            <span className="stat-label">Min. Stake</span>
          </div>
          <div className="stat-value text-accent">$10 USD</div>
          <div className="stat-unit">Dynamic (pegged)</div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-3">
            <Ban className="w-5 h-5 text-danger" />
            <span className="stat-label">Fraud Penalty</span>
          </div>
          <div className="stat-value text-danger">50-100%</div>
          <div className="stat-unit">+ Reputation loss</div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-3">
            <Zap className="w-5 h-5" style={{ color: "var(--color-hash-amber)" }} />
            <span className="stat-label">Est. Daily</span>
          </div>
          <div className="stat-value" style={{ color: "var(--color-hash-amber)" }}>{(hashRate * 86400 * 100).toLocaleString()}</div>
          <div className="stat-unit">AIC/day</div>
        </div>
      </div>

      {/* Mining Control */}
      <div className="feature-card mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full ${isMining ? 'pulse-dot-active' : 'pulse-dot-inactive'}`} />
            <div>
              <h2 className="text-lg font-semibold text-white">{isMining ? "Mining Active" : "Mining Stopped"}</h2>
              <p className="text-sm text-muted">{isMining ? "Running AI inference" : "Start mining to earn AICOIN"}</p>
            </div>
          </div>
          <button onClick={handleToggleMining} disabled={minerStatus?.isBanned || (minerStatus?.stakeAmount ?? 0) === 0} className={isMining ? "mining-stop-btn" : "mining-start-btn"}>
            {isMining ? (<><Square className="w-4 h-4" /><span>Stop</span></>) : (<><Play className="w-4 h-4" /><span>Start</span></>)}
          </button>
        </div>
        {minerStatus?.isBanned && <p className="text-sm text-danger mt-3">You are banned from mining due to repeated offenses.</p>}
      </div>

      {/* GPU Selection */}
      <div className="feature-card mb-6">
        <h2 className="section-title mb-4 flex items-center gap-2"><HardDrive className="w-5 h-5 text-accent" />Hardware</h2>
        <div className="gpu-grid">
          {gpuList.map((gpu, index) => (
            <button key={gpu.name} onClick={() => !isMining && setSelectedGPU(index)} className={`gpu-card ${selectedGPU === index ? 'gpu-card-active' : ''}`} disabled={isMining}>
              <div className="flex items-center justify-between mb-3">
                <span className="gpu-name">{gpu.name}</span>
                {selectedGPU === index && <CircleDot className="w-4 h-4 text-accent" />}
              </div>
              <div className="gpu-specs">
                <span className="gpu-spec">{gpu.memory}</span><span className="gpu-spec-divider">|</span>
                <span className="gpu-spec">{gpu.hashRate} p/s</span><span className="gpu-spec-divider">|</span>
                <span className="gpu-spec">{gpu.power}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Mining Log */}
      <div className="feature-card">
        <h2 className="section-title mb-4 flex items-center gap-2"><Activity className="w-5 h-5 text-accent" />Mining Log</h2>
        <div className="mining-log">
          {isMining ? (
            <div className="mining-log-entry">
              <span className="mining-log-time">Now</span>
              <span className="mining-log-status text-success">Mining on {gpuList[selectedGPU].name} — Proofs submitting to Verifier V2</span>
            </div>
          ) : (
            <div className="mining-log-entry">
              <span className="mining-log-time">--:--:--</span>
              <span className="mining-log-status text-muted">Start mining to submit proofs on-chain</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}