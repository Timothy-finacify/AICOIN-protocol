"use client";

import { useAccount } from "wagmi";
import { useState } from "react";
import { 
  Cpu, HardDrive, Zap, Timer, TrendingUp, Activity, CircleDot, Play, Square, RefreshCw, Shield, Star
} from "lucide-react";
import { useMinerStats } from "@/hooks/useAICOIN";

export default function MinePage() {
  const { address, isConnected } = useAccount();
  const { stake, reputation, isStaked } = useMinerStats(address);
  const [isMining, setIsMining] = useState(false);
  const [selectedGPU, setSelectedGPU] = useState(0);
  const [hashRate, setHashRate] = useState(0);

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

  const handleToggleMining = () => {
    if (isMining) {
      setIsMining(false);
      setHashRate(0);
    } else {
      setIsMining(true);
      setHashRate(gpuList[selectedGPU].hashRate);
    }
  };

  return (
    <div className="page-container max-w-5xl mx-auto px-4">
      <div className="page-header">
        <div>
          <h1 className="page-title">Mining Dashboard</h1>
          <p className="page-subtitle">Real on-chain mining data from Sepolia testnet</p>
        </div>
        <button className="refresh-btn"><RefreshCw className="w-4 h-4 text-muted" /></button>
      </div>

      {/* On-Chain Miner Status */}
      <div className="feature-card mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-accent" />
          <h2 className="section-title">Your On-Chain Miner Status</h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="stat-card">
            <span className="stat-label">Staked AIC</span>
            <div className="stat-value text-accent">{stake.toLocaleString()}</div>
            <div className="stat-unit">{isStaked ? "Ready to mine" : "Stake more to mine"}</div>
          </div>
          <div className="stat-card">
            <span className="stat-label">Reputation</span>
            <div className="stat-value" style={{ color: "var(--color-synapse-blue)" }}>{reputation}</div>
            <div className="stat-unit">On-chain score</div>
          </div>
          <div className="stat-card">
            <span className="stat-label">Status</span>
            <div className="stat-value text-success">{isStaked ? "Active" : "Insufficient Stake"}</div>
            <div className="stat-unit">Verifier: 0xFd1E...7240</div>
          </div>
        </div>
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
            <TrendingUp className="w-5 h-5 text-success" />
            <span className="stat-label">Staked Balance</span>
          </div>
          <div className="stat-value text-success">{stake.toLocaleString()}</div>
          <div className="stat-unit">AIC</div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-3">
            <Star className="w-5 h-5" style={{ color: "var(--color-synapse-blue)" }} />
            <span className="stat-label">Reputation</span>
          </div>
          <div className="stat-value" style={{ color: "var(--color-synapse-blue)" }}>{reputation}</div>
          <div className="stat-unit">points</div>
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
              <p className="text-sm text-muted">{isMining ? "Running AI inference on your hardware" : "Start mining to earn AICOIN"}</p>
            </div>
          </div>
          <button onClick={handleToggleMining} disabled={!isStaked} className={isMining ? "mining-stop-btn" : "mining-start-btn"}>
            {isMining ? (<><Square className="w-4 h-4" /><span>Stop Mining</span></>) : (<><Play className="w-4 h-4" /><span>Start Mining</span></>)}
          </button>
        </div>
        {!isStaked && <p className="text-sm text-danger mt-3">You need at least 1000 AIC staked to mine. Stake via terminal: cast send 0xFd1E...7240 "stake()" --value 1000000000000</p>}
      </div>

      {/* GPU Selection */}
      <div className="feature-card mb-6">
        <h2 className="section-title mb-4 flex items-center gap-2"><HardDrive className="w-5 h-5 text-accent" />Hardware Selection</h2>
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
              <span className="mining-log-status text-success">Mining active on {gpuList[selectedGPU].name} — Run miner.py to submit proofs on-chain</span>
            </div>
          ) : (
            <div className="mining-log-entry">
              <span className="mining-log-time">--:--:--</span>
              <span className="mining-log-status text-muted">Start mining to see real-time proof submissions</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 