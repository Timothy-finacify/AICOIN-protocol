"use client";

import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useState, useEffect } from "react";
import { Coins, TrendingUp, ArrowRight, Clock, Shield, Wallet, Loader2, CheckCircle2, History } from "lucide-react";
import { formatUnits, parseUnits } from "viem";
import { useBalance, useTotalWithdrawn, usePendingWithdrawals } from "@/hooks/useAICOIN";
import { TREASURY, AICOIN } from "@/lib/contracts";
import styles from "./page.module.css";

export default function TreasuryPage() {
  const { address, isConnected } = useAccount();
  const { data: treasuryBalance } = useBalance(TREASURY);
  const { data: totalWithdrawn } = useTotalWithdrawn();
  const { data: pending } = usePendingWithdrawals(address);
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  const [mounted, setMounted] = useState(false);
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return <div className={styles.container}><h1 className={styles.pageTitle}>Treasury</h1></div>;
  if (!isConnected) {
    return (
      <div className={styles.connectWrap}>
        <div className={styles.connectBox}>
          <Wallet size={48} className={styles.connectIcon} />
          <h2 className={styles.connectTitle}>Connect Your Wallet</h2>
          <p className={styles.connectText}>Connect to view the protocol treasury.</p>
        </div>
      </div>
    );
  }

  const bal = treasuryBalance ? Number(formatUnits(treasuryBalance as bigint, 9)) : 0;
  const withdrawn = totalWithdrawn ? Number(formatUnits(totalWithdrawn as bigint, 9)) : 0;
  const pendingAmt = pending ? Number(formatUnits(pending as bigint, 9)) : 0;

  const handleWithdraw = () => {
    if (!amount || !recipient) return;
    writeContract({
      address: TREASURY as `0x${string}`,
      abi: [{
        name: "withdraw", type: "function", stateMutability: "nonpayable",
        inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }, { name: "reason", type: "string" }],
        outputs: [],
      }],
      functionName: "withdraw",
      args: [recipient as `0x${string}`, parseUnits(amount, 9), reason || "Treasury withdrawal"],
    });
  };

  const recentWithdrawals = [
    { date: "2026-05-28", amount: "500", to: "0x7A92...e577", reason: "Development funding" },
    { date: "2026-05-20", amount: "200", to: "0x1234...5678", reason: "Marketing" },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <h1 className={styles.pageTitle}>Protocol Treasury</h1>
        <div className={styles.badge}><div className={styles.badgeDot} /> Sepolia</div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}><Coins size={14} style={{ color: "#FFB800" }} />Treasury Balance</div>
          <div className={styles.statValue} style={{ color: "#FFB800" }}>{bal.toLocaleString()}</div>
          <div className={styles.statSub}>AIC</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}><TrendingUp size={14} style={{ color: "#00D278" }} />Total Collected</div>
          <div className={styles.statValue} style={{ color: "#00D278" }}>{(bal + withdrawn).toLocaleString()}</div>
          <div className={styles.statSub}>AIC Lifetime</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}><ArrowRight size={14} style={{ color: "#5BAAFF" }} />Total Withdrawn</div>
          <div className={styles.statValue} style={{ color: "#5BAAFF" }}>{withdrawn.toLocaleString()}</div>
          <div className={styles.statSub}>AIC</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}><Clock size={14} style={{ color: "#F0A030" }} />Fee Rate</div>
          <div className={styles.statValue} style={{ color: "#F0A030" }}>1.10%</div>
          <div className={styles.statSub}>Halves every 4 years</div>
        </div>
      </div>

      <div className={styles.card}>
        <h2 className={styles.sectionTitle}><Shield size={18} style={{ color: "#FFB800" }} />Treasury Withdrawal</h2>
        <p className={styles.description}>
          Only governance can withdraw treasury funds. All withdrawals are public and transparent.
        </p>

        <div className={styles.field}>
          <label className={styles.label}>Amount (AIC)</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className={styles.input} />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Recipient Address</label>
          <input type="text" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="0x..." className={styles.input} />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Reason (Public)</label>
          <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Development, Marketing, Operations..." className={styles.input} />
        </div>

        <button onClick={handleWithdraw} disabled={!amount || !recipient || isPending || isConfirming} className={styles.submitBtn}>
          {isPending || isConfirming ? <><Loader2 size={16} className={styles.spinner} /> Processing...</> : <><ArrowRight size={16} /> Withdraw from Treasury</>}
        </button>

        {isSuccess && (
          <div className={styles.successBox}>
            <CheckCircle2 size={20} style={{ color: "#00D278" }} />
            <div>
              <div className={styles.successTitle}>Withdrawal Executed!</div>
              <div className={styles.successHash}>TX: {txHash?.slice(0, 10)}...{txHash?.slice(-8)}</div>
            </div>
          </div>
        )}
      </div>

      <div className={styles.card}>
        <h2 className={styles.sectionTitle}><History size={18} style={{ color: "#5BAAFF" }} />Recent Withdrawals</h2>
        <div className={styles.tableHeader}>
          <span>Date</span><span>Amount</span><span>Recipient</span><span>Reason</span>
        </div>
        {recentWithdrawals.map((w, i) => (
          <div key={i} className={styles.tableRow}>
            <span className={styles.mono}>{w.date}</span>
            <span className={styles.amount}>{w.amount} AIC</span>
            <span className={styles.mono}>{w.to}</span>
            <span className={styles.reason}>{w.reason}</span>
          </div>
        ))}
      </div>

      <div className={styles.card}>
        <h2 className={styles.sectionTitle}><Shield size={18} style={{ color: "#6C5CE1" }} />Treasury Rules</h2>
        <div className={styles.rulesGrid}>
          {[
            "1.10% of every payment goes to Treasury",
            "Fee halves every 4 years (Bitcoin-style)",
            "Only governance can withdraw funds",
            "All withdrawals are public on-chain",
            "Funds used for protocol development",
          ].map((rule, i) => (
            <div key={i} className={styles.rule}>
              <CheckCircle2 size={14} style={{ color: "#00D278" }} />
              <span>{rule}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}