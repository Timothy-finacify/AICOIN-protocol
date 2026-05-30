"use client";

import { useAccount } from "wagmi";
import { useState, useEffect, useCallback } from "react";
import { Pickaxe, Coins, Clock, Radio, Shield, TrendingUp, Star, AlertTriangle, Smartphone } from "lucide-react";
import { useMinerStatus, useHalvingStats, useValidatorInfo, useValidatorCount, useTotalStaked, useReserveStats } from "@/hooks/useAICOIN";
import styles from "./page.module.css";

export default function MiningPage() {
  const [mounted, setMounted] = useState(false);
  const { address, isConnected } = useAccount();
  const minerStatus = useMinerStatus(address);
  const halving = useHalvingStats();
  const validator = useValidatorInfo(address);
  const { data: validatorCount } = useValidatorCount();
  const { data: totalStaked } = useTotalStaked();
  const reserve = useReserveStats();
  const [minerApi, setMinerApi] = useState<any>(null);
  const [recentBlocks, setRecentBlocks] = useState<Array<{ block: number; time: string; reward: number }>>([]);

  const fetchMinerStatus = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:5000/status");
      const data = await res.json();
      setMinerApi(data);
    } catch {}
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    fetchMinerStatus();
    const interval = setInterval(fetchMinerStatus, 5000);
    return () => clearInterval(interval);
  }, [mounted, fetchMinerStatus]);

  const handleStartMining = async () => {
    try {
      await fetch("http://localhost:5000/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: address }),
      });
      fetchMinerStatus();
    } catch {}
  };

  const handleStopMining = async () => {
    try {
      await fetch("http://localhost:5000/stop", { method: "POST" });
      fetchMinerStatus();
    } catch {}
  };

  if (!mounted) {
    return (
      <div className={styles.container}>
        <div className={styles.topBar}>
          <h1 className={styles.pageTitle}>Mining Dashboard</h1>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className={styles.connectWrap}>
        <div className={styles.connectBox}>
          <Pickaxe size={48} className={styles.connectIcon} />
          <h2 className={styles.connectTitle}>Connect Your Wallet</h2>
          <p className={styles.connectText}>Connect to view your mining dashboard.</p>
        </div>
      </div>
    );
  }

  const chainEarned = validator?.earned ?? 0;
  const chainStaked = validator?.staked ?? 0;
  const yearsUntilHalving = ((halving?.blocksUntilHalving ?? 10511756) * 12 / 86400 / 365).toFixed(1);
  const isMining = minerApi?.mining_active;

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <h1 className={styles.pageTitle}>Mining Dashboard</h1>
        <div className={styles.badge}><div className={styles.badgeDot} /> Sepolia</div>
      </div>

      <div className={styles.earningsCard}>
        <div className={styles.earningsLabel}>Total Earned (On-Chain)</div>
        <div className={styles.earningsValue}>{chainEarned.toFixed(2)}</div>
        <div className={styles.earningsUnit}>AIC</div>
        <div className={styles.earningsBar}>
          <div className={styles.earningsBarFill} style={{ width: `${Math.min((chainEarned / 10000) * 100, 100)}%` }} />
        </div>
        <div className={styles.earningsMeta}>
          <span>Staked: {chainStaked.toLocaleString()} AIC</span>
          <span>Mined: {minerApi?.blocks_mined ?? 0} blocks</span>
          <span>Global: {halving?.totalMined?.toLocaleString() ?? "0"} AIC</span>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}><Pickaxe size={14} style={{ color: "#00D4AA" }} />Block Reward</div>
          <div className={styles.statValue}>{halving?.reward?.toFixed(1) ?? "10.0"}</div>
          <div className={styles.statSub}>AIC — Halving #{halving?.currentHalving ?? 0}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}><Coins size={14} style={{ color: "#FFB800" }} />Blocks Mined</div>
          <div className={styles.statValue}>{minerApi?.blocks_mined ?? "0"}</div>
          <div className={styles.statSub}>{isMining ? "Mining..." : "Idle"}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}><Clock size={14} style={{ color: "#5BAAFF" }} />Next Halving</div>
          <div className={styles.statValue}>{halving?.blocksUntilHalving?.toLocaleString() ?? "10.5M"}</div>
          <div className={styles.statSub}><span className={styles.halvingTag}>{yearsUntilHalving} years</span></div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}><Radio size={14} style={{ color: "#00D278" }} />Status</div>
          <div className={styles.statValue}>{halving?.miningActive ? "Active" : "Ended"}</div>
          <div className={styles.statSub}>{halving?.miningActive ? "136 years left" : "Complete"}</div>
        </div>
      </div>

      <div className={`${styles.section} ${styles.deviceCard}`}>
        <h2 className={styles.sectionTitle}><Smartphone size={18} style={{ color: "#6C5CE1" }} />Your Device</h2>
        <div className={styles.deviceGrid}>
          <div className={styles.deviceStat}>
            <div className={styles.deviceLabel}>Status</div>
            <div className={styles.deviceValue} style={{ color: minerApi?.is_registered ? "#00D278" : "#F0A030" }}>
              {minerApi?.is_registered ? "Recognized" : "Not Registered"}
            </div>
          </div>
          <div className={styles.deviceStat}>
            <div className={styles.deviceLabel}>Tier</div>
            <div className={styles.deviceValue} style={{ color: "#FFB800" }}>{minerApi?.hardware_tier ?? "..."}</div>
          </div>
          <div className={styles.deviceStat}>
            <div className={styles.deviceLabel}>Staked</div>
            <div className={styles.deviceValue} style={{ color: "#FFB800" }}>{minerApi?.staked_amount ?? chainStaked} AIC</div>
          </div>
          <div className={styles.deviceStat}>
            <div className={styles.deviceLabel}>Reputation</div>
            <div className={styles.deviceValue} style={{ color: (minerStatus?.reputation ?? 0) < 0 ? "#D4645C" : "#5BAAFF" }}>
              {minerStatus?.reputation ?? 0}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}><Shield size={18} style={{ color: "#6C5CE1" }} />Validator Status</h2>
        {validator ? (
          <>
            <div className={styles.validatorGrid}>
              <div className={styles.validatorStat}>
                <div className={styles.validatorLabel}>Staked</div>
                <div className={styles.validatorValue}>{chainStaked.toLocaleString()}</div>
                <div className={styles.validatorSub}>AIC</div>
              </div>
              <div className={styles.validatorStat}>
                <div className={styles.validatorLabel}>Earned</div>
                <div className={styles.validatorValue}>{chainEarned.toFixed(2)}</div>
                <div className={styles.validatorSub}>AIC Total</div>
              </div>
              <div className={styles.validatorStat}>
                <div className={styles.validatorLabel}>Active</div>
                <div className={styles.validatorValue} style={{ color: validator.active ? "#00D278" : "#D4645C" }}>
                  {validator.active ? "YES" : "NO"}
                </div>
                <div className={styles.validatorSub}>{validator.active ? "Eligible" : "Stake needed"}</div>
              </div>
            </div>
            {minerStatus?.offenseCount && minerStatus.offenseCount > 0 ? (
              <div className={styles.offenseCard}>
                <div className={styles.offenseHeader}><AlertTriangle size={16} style={{ color: "#D4645C" }} /><span className={styles.offenseTitle}>Offense Record</span></div>
                <div className={styles.offenseGrid}>
                  <div><div className={styles.offenseLabel}>Offenses</div><div className={styles.offenseValue}>{minerStatus.offenseCount}</div></div>
                  <div><div className={styles.offenseLabel}>Honest Days</div><div className={styles.offenseValue} style={{ color: "#00D278" }}>{minerStatus.honestDays}</div></div>
                  <div><div className={styles.offenseLabel}>Restoration</div><div className={styles.offenseValue} style={{ color: "#5BAAFF" }}>{minerStatus.daysUntilRestoration > 0 ? `${minerStatus.daysUntilRestoration}d` : "Active"}</div></div>
                </div>
              </div>
            ) : (
              <div className={styles.cleanBadge}><Star size={16} />Clean record. Keep mining honestly.</div>
            )}
          </>
        ) : (
          <div className={styles.emptyState}><p className={styles.emptyText}>Stake AIC in ValidatorPool to activate.</p></div>
        )}
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}><TrendingUp size={18} style={{ color: "#FFB800" }} />Network Overview</h2>
        <div className={styles.networkGrid}>
          <div className={styles.networkStat}>
            <div className={styles.networkLabel}>Validators</div>
            <div className={styles.networkValue}>{validatorCount ? Number(validatorCount) : 0}</div>
            <div className={styles.networkSub}>Active</div>
          </div>
          <div className={styles.networkStat}>
            <div className={styles.networkLabel}>Total Staked</div>
            <div className={styles.networkValue}>{totalStaked ? (Number(totalStaked) / 1e9).toLocaleString() : "0"}</div>
            <div className={styles.networkSub}>AIC</div>
          </div>
          <div className={styles.networkStat}>
            <div className={styles.networkLabel}>Mining Reserve</div>
            <div className={styles.networkValue}>{reserve?.reserved?.toLocaleString() ?? "0"}</div>
            <div className={styles.networkSub}>AIC Locked</div>
          </div>
          <div className={styles.networkStat}>
            <div className={styles.networkLabel}>Monthly Release</div>
            <div className={styles.networkValue}>{reserve?.monthlyRelease?.toLocaleString() ?? "0"}</div>
            <div className={styles.networkSub}>Post-mining</div>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.controlCard}>
          <div className={styles.controlInfo}>
            <div className={`${styles.pulseDot} ${!isMining ? styles.pulseInactive : ""}`} />
            <div>
              <div className={styles.controlStatus}>{isMining ? "Miner Running" : "Miner Stopped"}</div>
              <div className={styles.controlNote}>
                {isMining
                  ? `Blocks: ${minerApi?.blocks_mined || 0} · Mined: ${minerApi?.total_mined_aic?.toFixed(2) || "0"} AIC`
                  : "Start the Python miner to earn block rewards"}
              </div>
            </div>
          </div>
          <button onClick={isMining ? handleStopMining : handleStartMining} className={isMining ? styles.stopBtn : styles.startBtn}>
            {isMining ? "Stop Mining" : "Start Mining"}
          </button>
        </div>
        <div className={styles.controlWallet} style={{ marginTop: "12px" }}>
          <div>Wallet: {address?.slice(0, 6)}...{address?.slice(-4)}</div>
        </div>
      </div>
    </div>
  );
}