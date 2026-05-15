"use client";

import { useAccount } from "wagmi";
import { useState } from "react";
import { 
  Cpu, 
  HardDrive, 
  Zap, 
  Timer,
  TrendingUp,
  Activity,
  CircleDot,
  Play,
  Square,
  RefreshCw
} from "lucide-react";

export default function MinePage() {
  const { isConnected } = useAccount();
  const [isMining, setIsMining] = useState(false);
  const [selectedGPU, setSelectedGPU] = useState(0);
  const [hashRate, setHashRate] = useState(0);
  const [totalMined, setTotalMined] = useState(0);
  const [uptime, setUptime] = useState(0);

  if (!isConnected) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="flex justify-center mb-6">
            <div className="auth-icon-circle">
              <Cpu className="auth-icon" />
            </div>
          </div>
          <h2 className="auth-title">Connect Your Wallet</h2>
          <p className="text-center mb-6 text-muted">
            Connect your wallet to start mining AICOIN with your hardware.
          </p>
          <div className="flex justify-center">
            <div className="auth-connect-hint">
              <span>Use the Connect button in the navigation bar</span>
            </div>
          </div>
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
      setUptime(0);
    }
  };

  return (
    <div className="page-container max-w-5xl mx-auto px-4">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Mining Dashboard</h1>
          <p className="page-subtitle">Monitor and control your AI mining operations</p>
        </div>
        <button className="refresh-btn">
          <RefreshCw className="w-4 h-4 text-muted" />
        </button>
      </div>

      {/* Mining Stats */}
      <div className="mining-stats-grid">
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-3">
            <Activity className="w-5 h-5" style={{ color: "var(--color-node-teal)" }} />
            <span className="stat-label">Hash Rate</span>
          </div>
          <div className="stat-value" style={{ color: "var(--color-node-teal)" }}>
            {hashRate.toFixed(1)}
          </div>
          <div className="stat-unit">proofs/sec</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3 mb-3">
            <TrendingUp className="w-5 h-5 text-success" />
            <span className="stat-label">Total Mined</span>
          </div>
          <div className="stat-value text-success">
            {totalMined.toLocaleString()}
          </div>
          <div className="stat-unit">AIC</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3 mb-3">
            <Timer className="w-5 h-5" style={{ color: "var(--color-synapse-blue)" }} />
            <span className="stat-label">Uptime</span>
          </div>
          <div className="stat-value" style={{ color: "var(--color-synapse-blue)" }}>
            {uptime}
          </div>
          <div className="stat-unit">minutes</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3 mb-3">
            <Zap className="w-5 h-5" style={{ color: "var(--color-hash-amber)" }} />
            <span className="stat-label">Est. Daily</span>
          </div>
          <div className="stat-value" style={{ color: "var(--color-hash-amber)" }}>
            {(hashRate * 86400 * 100).toLocaleString()}
          </div>
          <div className="stat-unit">AIC/day</div>
        </div>
      </div>

      {/* Mining Control */}
      <div className="feature-card mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full ${isMining ? 'pulse-dot-active' : 'pulse-dot-inactive'}`} />
            <div>
              <h2 className="text-lg font-semibold text-white">
                {isMining ? "Mining Active" : "Mining Stopped"}
              </h2>
              <p className="text-sm text-muted">
                {isMining ? "Running AI inference on your hardware" : "Start mining to earn AICOIN"}
              </p>
            </div>
          </div>
          <button 
            onClick={handleToggleMining}
            className={isMining ? "mining-stop-btn" : "mining-start-btn"}
          >
            {isMining ? (
              <>
                <Square className="w-4 h-4" />
                <span>Stop Mining</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Start Mining</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* GPU Selection */}
      <div className="feature-card mb-6">
        <h2 className="section-title mb-4 flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-accent" />
          Hardware Selection
        </h2>
        <div className="gpu-grid">
          {gpuList.map((gpu, index) => (
            <button
              key={gpu.name}
              onClick={() => !isMining && setSelectedGPU(index)}
              className={`gpu-card ${selectedGPU === index ? 'gpu-card-active' : ''}`}
              disabled={isMining}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="gpu-name">{gpu.name}</span>
                {selectedGPU === index && (
                  <CircleDot className="w-4 h-4 text-accent" />
                )}
              </div>
              <div className="gpu-specs">
                <span className="gpu-spec">{gpu.memory}</span>
                <span className="gpu-spec-divider">|</span>
                <span className="gpu-spec">{gpu.hashRate} p/s</span>
                <span className="gpu-spec-divider">|</span>
                <span className="gpu-spec">{gpu.power}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Mining Log */}
      <div className="feature-card">
        <h2 className="section-title mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-accent" />
          Mining Log
        </h2>
        <div className="mining-log">
          <div className="mining-log-entry">
            <span className="mining-log-time">--:--:--</span>
            <span className="mining-log-status text-muted">Waiting to start mining...</span>
          </div>
        </div>
      </div>
    </div>
  );
}