"use client";

import { useAccount, useWriteContract } from "wagmi";
import { useState } from "react";
import { 
  Bot, Plus, Power, PowerOff, Activity, TrendingUp, Clock, Shield, Zap, 
  RefreshCw, Wallet, Loader2, CheckCircle2, X, Send, AlertTriangle,
  ArrowUpRight, ArrowDownLeft, Filter, Download, Search, BarChart3,
  DollarSign, Radio, Wifi, WifiOff, History, Eye, Settings
} from "lucide-react";
import { useBusinessAgents, useAgentConfig, formatAgentData } from "@/hooks/useAgents";
import { AGENT_WALLET_ADDRESS } from "@/lib/contracts";
import { parseUnits } from "viem";
import { sepolia } from "wagmi/chains";

export default function AgentsPage() {
  const { address, isConnected } = useAccount();
  const { data: agentAddresses, refetch: refetchAgents } = useBusinessAgents();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
 const AGENT_ABI = [
  { name: "deactivateAgent", type: "function", stateMutability: "nonpayable", inputs: [{ name: "agentWallet", type: "address" }], outputs: [] },
  { name: "activateAgent", type: "function", stateMutability: "nonpayable", inputs: [{ name: "agentWallet", type: "address" }], outputs: [] },
] as const;

  if (!isConnected) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="flex justify-center mb-6">
            <div className="auth-icon-circle"><Bot className="auth-icon" /></div>
          </div>
          <h2 className="auth-title">Connect Your Wallet</h2>
          <p className="text-center mb-6 text-muted">Connect to manage your AI agents.</p>
        </div>
      </div>
    );
  }

  const agents = (agentAddresses as string[]) || [];

  // Calculate totals
  let totalBalance = 0;
  let totalSpent = 0;
  let totalTransactions = 0;
  let activeCount = 0;

  return (
    <div className="page-container max-w-7xl mx-auto px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Agent Command Center</h1>
          <p className="page-subtitle">Deploy, monitor, and manage autonomous AI agents</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setRefreshKey(k => k + 1)} className="refresh-btn">
            <RefreshCw className="w-4 h-4 text-muted" />
          </button>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center gap-2" style={{ width: "auto" }}>
            <Plus className="w-4 h-4" />
            <span>Deploy Agent</span>
          </button>
        </div>
      </div>

      {/* Top Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="w-4 h-4 text-accent" />
            <span className="stat-label">Total Agents</span>
          </div>
          <div className="stat-value text-accent">{agents.length}</div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-success" />
            <span className="stat-label">Active</span>
          </div>
          <div className="stat-value text-success">{activeCount}</div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-blue" />
            <span className="stat-label">Total Balance</span>
          </div>
          <div className="stat-value text-blue">{totalBalance.toLocaleString()}</div>
          <div className="stat-unit">AIC</div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4" style={{ color: "var(--color-hash-amber)" }} />
            <span className="stat-label">Total Spent</span>
          </div>
          <div className="stat-value" style={{ color: "var(--color-hash-amber)" }}>{totalSpent.toLocaleString()}</div>
          <div className="stat-unit">AIC</div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <History className="w-4 h-4 text-purple" />
            <span className="stat-label">Transactions</span>
          </div>
          <div className="stat-value text-purple">{totalTransactions.toLocaleString()}</div>
        </div>
      </div>

      {/* Agent List */}
      <div className="feature-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title flex items-center gap-2">
            <Bot className="w-5 h-5 text-accent" />
            Deployed Agents
          </h2>
          <div className="flex items-center gap-2">
            <button className="text-xs text-muted flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filter
            </button>
            <button className="text-xs text-muted flex items-center gap-1">
              <Download className="w-3 h-3" /> Export
            </button>
          </div>
        </div>

        {agents.length === 0 ? (
          <div className="text-center py-16">
            <Bot className="w-16 h-16 mx-auto mb-4 text-muted opacity-50" />
            <h3 className="text-lg font-semibold text-white mb-2">No Agents Deployed</h3>
            <p className="text-muted mb-6 max-w-md mx-auto">
              Deploy your first AI agent to automate payments for AI services. Agents can call multiple AIs simultaneously without human intervention.
            </p>
            <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center gap-2 mx-auto" style={{ width: "auto" }}>
              <Plus className="w-4 h-4" />
              <span>Deploy Your First Agent</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {agents.map((agentAddr) => (
              <AgentCardDetailed key={agentAddr} agentAddress={agentAddr} />
            ))}
          </div>
        )}
      </div>

      {/* Create Agent Modal */}
      {showCreateModal && (
        <CreateAgentModal 
          onClose={() => setShowCreateModal(false)} 
          onCreated={() => {
            setShowCreateModal(false);
            refetchAgents();
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// DETAILED AGENT CARD
// ============================================================

function AgentCardDetailed({ agentAddress }: { agentAddress: string }) {
  const { data: rawConfig } = useAgentConfig(agentAddress);
  const config = formatAgentData(rawConfig);
  const [expanded, setExpanded] = useState(false);

  if (!config) {
    return (
      <div className="p-4 rounded-lg" style={{ backgroundColor: "var(--color-tensor-dark)", border: "1px solid var(--color-stable-gray)" }}>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-gray-700 animate-pulse" />
          <span className="text-sm text-muted">Loading agent...</span>
        </div>
      </div>
    );
  }

  const statusColor = config.active ? "var(--color-bull-green)" : "var(--color-stable-gray)";
  const statusBg = config.active ? "rgba(0,255,136,0.1)" : "rgba(45,52,54,0.5)";

  return (
    <div className="rounded-xl overflow-hidden" style={{ 
      backgroundColor: "var(--color-tensor-dark)", 
      border: `1px solid ${config.active ? 'rgba(0,255,136,0.25)' : 'var(--color-stable-gray)'}` 
    }}>
      {/* Header */}
      <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusColor, boxShadow: config.active ? `0 0 8px ${statusColor}` : 'none' }} />
            <span className="text-white font-mono text-sm font-semibold">{agentAddress.slice(0, 8)}...{agentAddress.slice(-6)}</span>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: statusBg, color: statusColor }}>
            {config.active ? "ACTIVE" : "PAUSED"}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Eye className="w-4 h-4 text-muted" />
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: "var(--color-stable-gray)" }}>
          {/* Key Metrics */}
          <div className="grid grid-cols-4 gap-4 py-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white font-mono">{config.balance.toLocaleString()}</div>
              <div className="text-xs text-muted mt-1">Current Balance (AIC)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white font-mono">{config.minBalance.toLocaleString()}</div>
              <div className="text-xs text-muted mt-1">Min Balance (AIC)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent font-mono">{config.refillAmount.toLocaleString()}</div>
              <div className="text-xs text-muted mt-1">Auto-Refill Amount (AIC)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: "var(--color-hash-amber)", fontFamily: "monospace" }}>
                {config.totalSpent.toLocaleString()}
              </div>
              <div className="text-xs text-muted mt-1">Total Spent (AIC)</div>
            </div>
          </div>

          {/* Progress Bar: Balance vs Min Balance */}
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted">Balance Health</span>
              <span className="text-muted">{config.minBalance > 0 ? Math.round((config.balance / config.minBalance) * 100) : 100}%</span>
            </div>
            <div className="progress-bar-bg">
              <div 
                className="progress-bar-fill" 
                style={{ 
                  width: `${config.minBalance > 0 ? Math.min(100, (config.balance / config.minBalance) * 100) : 100}%`,
                  backgroundColor: config.balance < config.minBalance ? "var(--color-bear-red)" : "var(--color-bull-green)"
                }} 
              />
            </div>
            {config.balance < config.minBalance && (
              <div className="flex items-center gap-1 mt-1">
                <AlertTriangle className="w-3 h-3 text-danger" />
                <span className="text-xs text-danger">Below minimum balance. Auto-refill triggered.</span>
              </div>
            )}
          </div>

          {/* Transaction Summary */}
          <div className="grid grid-cols-2 gap-4 p-3 rounded-lg mb-3" style={{ backgroundColor: "rgba(0,0,0,0.2)" }}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">Total Transactions</span>
              <span className="text-sm text-white font-mono">{config.totalTransactions.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">Avg per Transaction</span>
              <span className="text-sm text-white font-mono">
                {config.totalTransactions > 0 ? (config.totalSpent / config.totalTransactions).toFixed(2) : "0.00"} AIC
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">Owner</span>
              <span className="text-sm text-white font-mono">{config.businessOwner.slice(0, 8)}...</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">Auto-Refill</span>
              <span className="text-sm text-success font-medium">Enabled</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ 
                backgroundColor: config.active ? "rgba(255,71,87,0.1)" : "rgba(0,255,136,0.1)",
                border: `1px solid ${config.active ? 'rgba(255,71,87,0.3)' : 'rgba(0,255,136,0.3)'}`,
                color: config.active ? "var(--color-bear-red)" : "var(--color-bull-green)"
              }}>
              {config.active ? <PowerOff className="w-4 h-4 inline mr-1" /> : <Power className="w-4 h-4 inline mr-1" />}
              {config.active ? "Pause Agent" : "Activate Agent"}
            </button>
            <button className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ backgroundColor: "rgba(74,157,255,0.1)", border: "1px solid rgba(74,157,255,0.3)", color: "var(--color-synapse-blue)" }}>
              <Settings className="w-4 h-4 inline mr-1" />
              Configure
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// CREATE AGENT MODAL
// ============================================================

function CreateAgentModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { address } = useAccount();
  const { writeContract, isPending } = useWriteContract();
  const [agentWallet, setAgentWallet] = useState("");
  const [minBalance, setMinBalance] = useState("500");
  const [refillAmount, setRefillAmount] = useState("5000");
  const [error, setError] = useState("");

  const handleCreate = () => {
    setError("");
    if (!agentWallet.startsWith("0x") || agentWallet.length !== 42) {
      setError("Invalid wallet address. Must be a valid Ethereum address.");
      return;
    }
    if (Number(minBalance) <= 0 || Number(refillAmount) <= Number(minBalance)) {
      setError("Refill amount must be greater than minimum balance.");
      return;
    }

    writeContract({
      address: AGENT_WALLET_ADDRESS as `0x${string}`,
      abi: [{
        name: "createAgent",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
          { name: "agentWallet", type: "address" },
          { name: "_minBalance", type: "uint256" },
          { name: "_refillAmount", type: "uint256" },
        ],
        outputs: [],
      }],
      functionName: "createAgent",
      args: [
        agentWallet as `0x${string}`,
        parseUnits(minBalance, 9),
        parseUnits(refillAmount, 9),
      ],
      chain: sepolia,
      account: address,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Deploy New Agent</h2>
            <p className="text-xs text-muted">Create an autonomous AI agent wallet</p>
          </div>
          <button onClick={onClose} className="wallet-dropdown-close"><X className="w-4 h-4" /></button>
        </div>

        <div className="modal-body space-y-4">
          {error && (
            <div className="error-banner">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div>
            <label className="form-label">Agent Wallet Address</label>
            <input 
              type="text" 
              value={agentWallet} 
              onChange={(e) => setAgentWallet(e.target.value)}
              placeholder="0x..."
              className="send-input font-mono"
            />
            <p className="text-xs text-muted mt-1">The wallet address that will act as the agent.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Minimum Balance (AIC)</label>
              <input 
                type="number" 
                value={minBalance} 
                onChange={(e) => setMinBalance(e.target.value)}
                className="send-input"
              />
              <p className="text-xs text-muted mt-1">Auto-refill triggers below this.</p>
            </div>
            <div>
              <label className="form-label">Refill Amount (AIC)</label>
              <input 
                type="number" 
                value={refillAmount} 
                onChange={(e) => setRefillAmount(e.target.value)}
                className="send-input"
              />
              <p className="text-xs text-muted mt-1">Amount to auto-refill.</p>
            </div>
          </div>

          <div className="p-3 rounded-lg" style={{ backgroundColor: "rgba(0,212,170,0.05)", border: "1px solid rgba(0,212,170,0.15)" }}>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-white">What happens next</span>
            </div>
            <ul className="text-xs text-muted space-y-1">
              <li>• Agent can call AI services instantly without MetaMask</li>
              <li>• Payments auto-process via your approved session</li>
              <li>• Wallet auto-refills when balance drops below {minBalance} AIC</li>
              <li>• You can pause or reconfigure anytime</li>
            </ul>
          </div>
        </div>

        <div className="modal-footer">
          <button 
            onClick={handleCreate} 
            disabled={isPending || !agentWallet}
            className="send-btn flex items-center justify-center gap-2"
          >
            {isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /><span>Deploying...</span></>
            ) : (
              <><Plus className="w-4 h-4" /><span>Deploy Agent</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 