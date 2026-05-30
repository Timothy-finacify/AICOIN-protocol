"use client";

import { useAccount } from "wagmi";
import { useState, useEffect } from "react";
import { 
  Building2, TrendingUp, Bot, Activity, AlertTriangle, Star, 
  Wallet, ArrowRight, Coins, BarChart3, Shield 
} from "lucide-react";
import { formatUnits } from "viem";
import { useBalance, useValidatorInfo } from "@/hooks/useAICOIN";
import { COMPANY_REGISTRY, MODEL_REGISTRY } from "@/lib/contracts";
import styles from "./page.module.css";

export default function CompanyDashboard() {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance(address);
  const validator = useValidatorInfo(address);
  const [mounted, setMounted] = useState(false);
  const [companyData, setCompanyData] = useState<any>(null);
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!address || !mounted) return;
    const fetchCompanyData = async () => {
      try {
        const res = await fetch("https://eth-sepolia.g.alchemy.com/v2/z0OM_42vihFYL5R31VT9m", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0", method: "eth_call", params: [{
              to: COMPANY_REGISTRY,
              data: "0xf85b0a92" + address.slice(2).padStart(64, "0")
            }, "latest"], id: 1
          })
        });
        const data = await res.json();
        if (data.result && data.result !== "0x" && data.result.length > 2) {
          const hex = data.result.slice(2);
          const nameLen = parseInt(hex.slice(128, 192), 16);
          let name = "";
          for (let i = 0; i < nameLen * 2; i += 2) name += String.fromCharCode(parseInt(hex.slice(192 + i, 194 + i), 16));
          const staked = parseInt(hex.slice(1024, 1088), 16);
          const totalEarned = parseInt(hex.slice(1152, 1216), 16);
          const totalRequests = parseInt(hex.slice(1216, 1280), 16);
          const trustScore = parseInt(hex.slice(1536, 1600), 16);
          const verified = parseInt(hex.slice(1600, 1664), 16) === 1;
          setCompanyData({ name, staked: Number(formatUnits(BigInt(staked), 9)), totalEarned: Number(formatUnits(BigInt(totalEarned), 9)), totalRequests, trustScore, verified });
        }
      } catch {}
      setLoading(false);
    };
    fetchCompanyData();
  }, [address, mounted]);

  useEffect(() => {
    if (!address || !mounted) return;
    const fetchModels = async () => {
      try {
        const res = await fetch("https://eth-sepolia.g.alchemy.com/v2/z0OM_42vihFYL5R31VT9m", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0", method: "eth_call", params: [{
              to: MODEL_REGISTRY,
              data: "0xec40cd2b" + address.slice(2).padStart(64, "0")
            }, "latest"], id: 1
          })
        });
        const data = await res.json();
        if (data.result) {
          const count = parseInt(data.result.slice(130, 194), 16) || 0;
          const fetchedModels: any[] = [];
          for (let i = 0; i < Math.min(count, 10); i++) {
            fetchedModels.push({
              name: `Model #${i + 1}`,
              category: "Text",
              requests: 0,
              earned: "0",
              uptime: "100%",
              status: "Active",
            });
          }
          setModels(fetchedModels);
        }
      } catch {}
    };
    fetchModels();
  }, [address, mounted]);

  if (!mounted) return <div className={styles.container}><h1 className={styles.pageTitle}>Company Dashboard</h1></div>;
  if (!isConnected) {
    return (
      <div className={styles.connectWrap}>
        <div className={styles.connectBox}>
          <Building2 size={48} className={styles.connectIcon} />
          <h2 className={styles.connectTitle}>Connect Your Wallet</h2>
          <p className={styles.connectText}>Connect to view your AI company dashboard.</p>
        </div>
      </div>
    );
  }

  const userBalance = balance ? Number(formatUnits(balance as bigint, 9)) : 0;
  const comp = companyData || { name: "Not Registered", staked: 0, totalEarned: 0, totalRequests: 0, trustScore: 0, verified: false };

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <div>
          <h1 className={styles.pageTitle}>{comp.name}</h1>
          <p className={styles.subtitle}>
            {comp.verified ? "✅ Verified" : "⚠️ Unverified"} · Trust Score: {comp.trustScore}/100
          </p>
        </div>
        <div className={styles.badge}><div className={styles.badgeDot} /> Sepolia</div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}><Coins size={14} style={{ color: "#FFB800" }} />Total Earned</div>
          <div className={styles.statValue} style={{ color: "#FFB800" }}>{comp.totalEarned.toFixed(6)}</div>
          <div className={styles.statSub}>AIC</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}><TrendingUp size={14} style={{ color: "#00D278" }} />Requests</div>
          <div className={styles.statValue} style={{ color: "#00D278" }}>{comp.totalRequests}</div>
          <div className={styles.statSub}>Total Served</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}><Shield size={14} style={{ color: "#5BAAFF" }} />Staked</div>
          <div className={styles.statValue} style={{ color: "#5BAAFF" }}>{comp.staked.toLocaleString()}</div>
          <div className={styles.statSub}>AIC</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}><Wallet size={14} style={{ color: "#6C5CE1" }} />Balance</div>
          <div className={styles.statValue} style={{ color: "#6C5CE1" }}>{userBalance.toLocaleString()}</div>
          <div className={styles.statSub}>AIC</div>
        </div>
      </div>

      <div className={styles.card}>
        <h2 className={styles.sectionTitle}><BarChart3 size={18} style={{ color: "#FFB800" }} />Revenue Overview</h2>
        <p style={{ color: "#7A7A99", fontSize: "13px" }}>
          {comp.totalEarned > 0 
            ? `Your company has earned ${comp.totalEarned.toFixed(6)} AIC from ${comp.totalRequests} requests. Revenue auto-settles on-chain.`
            : "No revenue yet. Register models and start earning when users pay per token."}
        </p>
      </div>

      <div className={styles.card}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}><Bot size={18} style={{ color: "#6C5CE1" }} />Your Models ({models.length})</h2>
          <a href="/register/model" className={styles.addBtn}>+ Register Model</a>
        </div>
        {models.length > 0 ? models.map((model, i) => (
          <div key={i} className={styles.modelRow}>
            <div className={styles.modelInfo}>
              <div className={styles.modelName}>{model.name}</div>
              <div className={styles.modelMeta}>{model.category}</div>
            </div>
            <div className={styles.modelStats}>
              <div className={styles.modelStat}>
                <div className={styles.modelStatValue}>{model.requests}</div>
                <div className={styles.modelStatLabel}>Requests</div>
              </div>
              <div className={styles.modelStat}>
                <div className={styles.modelStatValue} style={{ color: "#FFB800" }}>{model.earned}</div>
                <div className={styles.modelStatLabel}>Earned</div>
              </div>
              <div className={styles.modelStatus} style={{ color: "#00D278" }}>{model.status}</div>
            </div>
          </div>
        )) : (
          <div className={styles.emptyState}>
            <Bot size={40} className={styles.emptyIcon} />
            <div className={styles.emptyTitle}>No models registered</div>
            <div className={styles.emptyText}><a href="/register/model" style={{ color: "#FFB800" }}>Register your first AI model</a> to start earning.</div>
          </div>
        )}
      </div>

      <div className={styles.card}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}><Activity size={18} style={{ color: "#00D278" }} />Agent Wallets</h2>
          <a href="/agents" className={styles.addBtn}>+ Create Agent</a>
        </div>
        <div className={styles.emptyState}>
          <Bot size={40} className={styles.emptyIcon} />
          <div className={styles.emptyTitle}>No agents created</div>
          <div className={styles.emptyText}><a href="/agents" style={{ color: "#FFB800" }}>Create agent wallets</a> for autonomous AI payments.</div>
        </div>
      </div>

      <div className={styles.card}>
        <h2 className={styles.sectionTitle}><AlertTriangle size={18} style={{ color: "#F0A030" }} />Disputes</h2>
        <div className={styles.emptyState}>
          <Star size={40} className={styles.emptyIcon} style={{ color: "#00D278" }} />
          <div className={styles.emptyTitle}>No disputes</div>
          <div className={styles.emptyText}>Clean record. Keep providing quality AI service.</div>
        </div>
      </div>
    </div>
  );
}