// src/app/explorer/page.tsx
"use client";

import { Search, Shield, Radio, Flame, Coins, Pickaxe, Building2, Bot, Wallet, Skull } from "lucide-react";
import { useTotalSupply, useTotalBurned, useHalvingStats, useValidatorCount, useTotalStaked, useReserveStats } from "@/hooks/useAICOIN";
import styles from "./page.module.css";

export default function ExplorerPage() {
  const { data: supply } = useTotalSupply();
  const { data: burned } = useTotalBurned();
  const halving = useHalvingStats();
  const { data: validatorCount } = useValidatorCount();
  const { data: totalStaked } = useTotalStaked();
  const reserve = useReserveStats();

  const formatAIC = (val: unknown) => val ? Number(val) / 1e9 : 0;

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <h1 className={styles.pageTitle}>Block Explorer</h1>
        <div className={styles.liveBadge}><div className={styles.liveDot} /> Sepolia Live</div>
      </div>

      <div className={styles.searchWrap}>
        <Search size={18} className={styles.searchIcon} />
        <input type="text" placeholder="Search by address, transaction hash, device ID, or block number..." className={styles.searchInput} />
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}><Coins size={14} style={{ color: "#C5941A" }} /> Total Supply</div>
          <div className={styles.statValue} style={{ color: "#C5941A" }}>{formatAIC(supply).toLocaleString()}</div>
          <div className={styles.statSub}>AIC</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}><Flame size={14} style={{ color: "#D4645C" }} /> Total Burned</div>
          <div className={styles.statValue} style={{ color: "#D4645C" }}>{formatAIC(burned).toLocaleString()}</div>
          <div className={styles.statSub}>AIC Destroyed</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}><Pickaxe size={14} style={{ color: "#00D278" }} /> Block Reward</div>
          <div className={styles.statValue} style={{ color: "#00D278" }}>{halving?.reward?.toFixed(1) ?? "10.0"}</div>
          <div className={styles.statSub}>AIC — Halving #{halving?.currentHalving ?? 0}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}><Wallet size={14} style={{ color: "#5BAAFF" }} /> Total Staked</div>
          <div className={styles.statValue} style={{ color: "#5BAAFF" }}>{totalStaked ? (Number(totalStaked) / 1e9).toLocaleString() : "0"}</div>
          <div className={styles.statSub}>AIC</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}><Shield size={14} style={{ color: "#6C5CE1" }} /> Validators</div>
          <div className={styles.statValue} style={{ color: "#6C5CE1" }}>{validatorCount ? Number(validatorCount) : 0}</div>
          <div className={styles.statSub}>Active Miners</div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.lostPoolBanner}>
          <div className={styles.lostPoolIcon}><Skull size={28} style={{ color: "#D4645C" }} /></div>
          <div className={styles.lostPoolInfo}>
            <div className={styles.lostPoolTitle}>Lost Pool — Device Prison Active</div>
            <div className={styles.lostPoolText}>Malicious devices are trapped permanently in a pool of 2^64 positions. Stake burned. Re-entry impossible. Each trapped device is publicly recorded with offense details, IP range, and geographic region.</div>
          </div>
        </div>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}><Skull size={18} style={{ color: "#D4645C" }} /> Recently Trapped Devices</h2>
          <span className={styles.sectionCount}>0 Devices</span>
        </div>
        <div className={styles.emptyState}>
          <Shield size={36} className={styles.emptyIcon} />
          <div className={styles.emptyTitle}>No devices trapped yet</div>
          <div className={styles.emptyText}>The Lost Pool is empty. All devices are behaving honestly.</div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}><Radio size={18} style={{ color: "#00D278" }} /> Recognized Devices</h2>
          <span className={styles.sectionCount}>Loading...</span>
        </div>
        <div className={styles.tableHeader + " " + styles.cols4}>
          <span>Device ID</span><span>Owner</span><span>Tier</span><span>Status</span>
        </div>
        <div className={styles.emptyState}>
          <Radio size={36} className={styles.emptyIcon} />
          <div className={styles.emptyTitle}>Device data loading</div>
          <div className={styles.emptyText}>Connect to DeviceRegistry to view recognized devices</div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}><Bot size={18} style={{ color: "#6C5CE1" }} /> Registered AI Models</h2>
          <span className={styles.sectionCount}>Loading...</span>
        </div>
        <div className={styles.tableHeader + " " + styles.cols5}>
          <span>Model Name</span><span>Company</span><span>Category</span><span>Price/1M</span><span>Status</span>
        </div>
        <div className={styles.emptyState}>
          <Bot size={36} className={styles.emptyIcon} />
          <div className={styles.emptyTitle}>Model data loading</div>
          <div className={styles.emptyText}>Connect to ModelRegistry to view registered models</div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}><Building2 size={18} style={{ color: "#C5941A" }} /> Registered Companies</h2>
          <span className={styles.sectionCount}>Loading...</span>
        </div>
        <div className={styles.tableHeader + " " + styles.cols5}>
          <span>Company</span><span>Trust</span><span>Staked</span><span>Earned</span><span>Status</span>
        </div>
        <div className={styles.emptyState}>
          <Building2 size={36} className={styles.emptyIcon} />
          <div className={styles.emptyTitle}>Company data loading</div>
          <div className={styles.emptyText}>Connect to CompanyRegistry to view registered companies</div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}><Wallet size={18} style={{ color: "#00D278" }} /> Protocol Treasury</h2>
        </div>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Mining Reserve</div>
            <div className={styles.statValue} style={{ color: "#C5941A" }}>{reserve?.reserved?.toLocaleString() ?? "0"}</div>
            <div className={styles.statSub}>AIC Locked</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Monthly Release</div>
            <div className={styles.statValue} style={{ color: "#5BAAFF" }}>{reserve?.monthlyRelease?.toLocaleString() ?? "0"}</div>
            <div className={styles.statSub}>After Mining Ends</div>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recent Transactions</h2>
        </div>
        <div className={styles.emptyState}>
          <Search size={36} className={styles.emptyIcon} />
          <div className={styles.emptyTitle}>Transaction history loading</div>
          <div className={styles.emptyText}>Connect to The Graph subgraph for full transaction history</div>
        </div>
      </div>
    </div>
  );
} 