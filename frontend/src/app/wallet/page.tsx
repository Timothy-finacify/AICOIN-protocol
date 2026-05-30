"use client";

import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useState } from "react";
import { Wallet, Copy, CheckCircle2, Send, ArrowDownLeft, RefreshCw, Zap, Shield, ArrowUpRight, Clock } from "lucide-react";
import { formatUnits, parseUnits } from "viem";
import { useBalance } from "@/hooks/useAICOIN";
import { AICOIN } from "@/lib/contracts";
import { QRCodeSVG } from "qrcode.react";
import styles from "./page.module.css";

const ERC20_ABI = [
  { name: "transfer", type: "function", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
] as const;

export default function WalletPage() {
  const { address, isConnected } = useAccount();
  const { data: balance, refetch } = useBalance(address);
  const { writeContract, data: txHash, isPending: isSending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  const [sendTo, setSendTo] = useState("");
  const [sendVal, setSendVal] = useState("");
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"assets" | "send" | "receive" | "activity">("assets");
  const [limit, setLimit] = useState("500");

  if (!isConnected) {
    return (
      <div className={styles.connectWrap}>
        <div className={styles.connectBox}>
          <Wallet size={48} className={styles.connectIcon} />
          <h2 className={styles.connectTitle}>Connect Your Wallet</h2>
          <p className={styles.connectText}>View your AIC balance and manage tokens.</p>
        </div>
      </div>
    );
  }

  const bal = balance ? Number(formatUnits(balance as bigint, 9)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 }) : "0.00";
  const copy = () => { if (address) { navigator.clipboard.writeText(address); setCopied(true); setTimeout(() => setCopied(false), 2000); } };

  const doSend = () => {
    if (!sendTo || !sendVal) return;
    writeContract({ address: AICOIN as `0x${string}`, abi: ERC20_ABI, functionName: "transfer", args: [sendTo as `0x${string}`, parseUnits(sendVal, 9)] });
  };

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <h1 className={styles.pageTitle}>Wallet</h1>
        <div className={styles.badge}><div className={styles.badgeDot} /> Sepolia</div>
        <button onClick={() => refetch()} className={styles.refreshBtn}><RefreshCw size={14} /> Refresh</button>
      </div>

      <div className={styles.balanceCard}>
        <div className={styles.balanceLabel}>Total Balance</div>
        <div className={styles.balanceValue}>{bal}</div>
        <div className={styles.balanceUnit}>AIC</div>
        <div className={styles.addressRow}>
          <span className={styles.addressText}>{address}</span>
          <button onClick={copy} className={styles.copyBtn}>{copied ? <CheckCircle2 size={15} style={{ color: "#00D278" }} /> : <Copy size={15} />}</button>
        </div>
      </div>

      <div className={styles.tabs}>
        {(["assets","send","receive","activity"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`${styles.tab} ${tab === t ? styles.tabActive : ""}`}>
            {t === "assets" ? "Assets" : t === "send" ? "Send" : t === "receive" ? "Receive" : "Activity"}
          </button>
        ))}
      </div>

      {tab === "assets" && (
        <>
          <div className={styles.actions}>
            <button onClick={() => setTab("send")} className={styles.action}>
              <ArrowUpRight size={22} className={styles.actionIcon} style={{ color: "#00D278" }} />
              <div className={styles.actionTitle}>Send</div>
              <div className={styles.actionSub}>Transfer AIC</div>
            </button>
            <button onClick={() => setTab("receive")} className={styles.action}>
              <ArrowDownLeft size={22} className={styles.actionIcon} style={{ color: "#5BAAFF" }} />
              <div className={styles.actionTitle}>Receive</div>
              <div className={styles.actionSub}>Show QR code</div>
            </button>
          </div>

          <div className={`${styles.card} ${styles.sessionCard}`}>
            <div className={styles.sessionPill}><Zap size={10} /> Auto-Pay</div>
            <h2 className={styles.cardTitle}><Shield size={18} style={{ color: "#6C5CE1" }} />AI Session Approval</h2>
            <p style={{ fontSize: "12px", color: "#7A7A99", marginBottom: "16px", lineHeight: 1.6 }}>
              Approve once. All AI requests auto-process within your daily limit. No popups. No gas fees.
            </p>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Daily Limit (AIC)</label>
              <div className={styles.inputWrap}>
                <input type="number" value={limit} onChange={(e) => setLimit(e.target.value)} className={styles.fieldInput} />
                <button className={styles.maxBtn} onClick={() => setLimit(bal)}>MAX</button>
              </div>
            </div>
            <button className={styles.btn}><Zap size={15} /> Enable ({limit} AIC/day)</button>
          </div>
        </>
      )}

      {tab === "send" && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}><Send size={18} style={{ color: "#00D278" }} />Send AICOIN</h2>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Recipient Address</label>
            <input type="text" value={sendTo} onChange={(e) => setSendTo(e.target.value)} placeholder="0x..." className={styles.fieldInput} />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Amount (AIC)</label>
            <div className={styles.inputWrap}>
              <input type="number" value={sendVal} onChange={(e) => setSendVal(e.target.value)} placeholder="0.00" className={styles.fieldInput} />
              <button className={styles.maxBtn} onClick={() => setSendVal(bal)}>MAX</button>
            </div>
            {sendVal && <div className={styles.burnNote}>20% burned: {(Number(sendVal) * 0.2).toFixed(2)} AIC</div>}
          </div>
          <button disabled={!sendTo || !sendVal || isSending || isConfirming} onClick={doSend} className={styles.btn}>
            {isSending || isConfirming ? "Sending..." : <><Send size={15} /> Send AIC</>}
          </button>
          {isSuccess && <div className={styles.successMsg}>Sent! TX: {txHash}</div>}
        </div>
      )}

      {tab === "receive" && (
        <div className={`${styles.card} ${styles.receiveCenter}`}>
          <h2 className={styles.cardTitle} style={{ justifyContent: "center" }}><ArrowDownLeft size={18} style={{ color: "#5BAAFF" }} />Receive AICOIN</h2>
          <div className={styles.qrBox}>
            <QRCodeSVG value={address || ""} size={180} bgColor="#FAFAFA" fgColor="#0D0D1A" level="M" />
          </div>
          <div className={styles.addressRow} style={{ justifyContent: "center" }}><span className={styles.addressText}>{address}</span></div>
          <button onClick={copy} className={styles.btnOutline} style={{ marginTop: "16px" }}>{copied ? "Copied" : "Copy Address"}</button>
        </div>
      )}

      {tab === "activity" && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}><Clock size={18} style={{ color: "#7A7A99" }} />Recent Activity</h2>
          <div className={styles.emptyState}>
            <Clock size={36} className={styles.emptyIcon} />
            <div className={styles.emptyTitle}>No transactions yet</div>
            <div className={styles.emptyText}>Activity will appear here</div>
          </div>
        </div>
      )}
    </div>
  );
}