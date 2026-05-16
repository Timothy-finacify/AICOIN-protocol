 "use client";

import { useAccount, useTransactionCount, useChainId } from "wagmi";
import { useState } from "react";
import { 
  Wallet, ArrowDownLeft, ArrowUpRight, Flame, Clock, Copy, 
  CheckCircle2, ExternalLink, RefreshCw, Send, Loader2, Zap
} from "lucide-react";
import { formatUnits, parseUnits } from "viem";
import { sepolia } from "wagmi/chains";
import { useAICoinBalance } from "@/hooks/useAICOIN";
import { useTransferAIC, useSessionApproval } from "@/hooks/useContracts";
import { QRCodeSVG } from "qrcode.react";

export default function WalletPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: balance, refetch: refetchBalance } = useAICoinBalance(address);
  const { data: txCount } = useTransactionCount({ address });
  const { transfer, hash: txHash, isPending, isSuccess } = useTransferAIC();
  const { approveSession, isPending: isApproving } = useSessionApproval();
  const SESSION_ADDRESS = "0x0a977Bb368b66dC8B5b35D2db560071f753803e5";

  const [sendAddress, setSendAddress] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [activeTab, setActiveTab] = useState<"balance" | "send" | "receive">("balance");
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    if (address) { navigator.clipboard.writeText(address); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const shortenAddress = (addr: string) => addr.slice(0, 6) + "..." + addr.slice(-4);

  const formattedBalance = balance
    ? Number(formatUnits(balance as bigint, 9)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })
    : "0.00";

  const handleSend = () => {
    if (!sendAddress || !sendAmount) return;
    const amountInNano = parseUnits(sendAmount, 9);
    transfer(sendAddress, amountInNano);
  };

  if (!isConnected) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="flex justify-center mb-6">
            <div className="auth-icon-circle"><Wallet className="auth-icon" /></div>
          </div>
          <h2 className="auth-title">Connect Your Wallet</h2>
          <p className="text-center mb-6 text-muted">Connect your wallet to view your AICOIN balance.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4">
      <div className="flex items-center justify-between mb-8">
        <div><h1 className="page-title">Wallet</h1><p className="page-subtitle">Manage your AICOIN tokens</p></div>
        <button onClick={() => refetchBalance()} className="refresh-btn"><RefreshCw className="w-4 h-4 text-muted" /></button>
      </div>

      <div className="network-badge">
        <div className="network-dot" />
        <span className="network-text">{chainId === sepolia.id ? "Sepolia Testnet" : "Connected"}</span>
        <span className="tx-count-badge">TXs: {txCount?.toString() || "0"}</span>
      </div>

      <div className="balance-card">
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs uppercase tracking-wider text-muted">Total Balance</span>
          <span className="text-xs px-3 py-1 rounded-full" style={{ backgroundColor: "rgba(0, 212, 170, 0.1)", color: "var(--color-node-teal)" }}>AICOIN</span>
        </div>
        <div className="flex items-center gap-3 mb-2">
          <img src="/images/aic-symbol.svg" alt="AIC" className="h-10 w-auto" />
          <span className="balance-amount">{formattedBalance}</span>
        </div>
        <div className="balance-symbol">AIC</div>
        <div className="address-bar mt-6">
          <span className="address-text">{address ? shortenAddress(address) : ""}</span>
          <button onClick={copyAddress} className="address-copy-btn">
            {copied ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4 text-muted" />}
          </button>
        </div>
      </div>

      <div className="feature-card mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-5 h-5 text-accent" />
          <h3 className="section-title">Instant Payments</h3>
        </div>
        <p className="text-sm text-muted mb-3">Approve once. All AI requests auto-process without MetaMask popups.</p>
        <button onClick={() => approveSession(SESSION_ADDRESS, parseUnits("100", 9))} disabled={isApproving} className="send-btn">
          {isApproving ? "Approving..." : "Enable Instant AI Payments (100 AIC/day)"}
        </button>
      </div>

      <div className="tab-container">
        {(["balance", "send", "receive"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={activeTab === tab ? "tab-btn tab-btn-active" : "tab-btn"}>{tab}</button>
        ))}
      </div>

      {activeTab === "send" && (
        <div className="feature-card">
          <h2 className="section-title mb-4">Send AICOIN</h2>
          <div className="space-y-4">
            <div><label className="form-label">Recipient Address</label><input type="text" value={sendAddress} onChange={(e) => setSendAddress(e.target.value)} placeholder="0x..." className="send-input" /></div>
            <div><label className="form-label">Amount (AIC)</label><input type="number" value={sendAmount} onChange={(e) => setSendAmount(e.target.value)} placeholder="0.00" className="send-input" />
              <p className="burn-info">20% will be burned: {sendAmount ? (Number(sendAmount) * 0.2).toFixed(2) : "0.00"} AIC</p></div>
            <button onClick={handleSend} disabled={!sendAddress || !sendAmount || isPending} className="send-btn flex items-center justify-center gap-2">
              {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Send className="w-4 h-4" /> Send AIC</>}
            </button>
            {txHash && (<div className="success-badge"><span className="success-badge-text">TX: {shortenAddress(txHash)}</span><ExternalLink className="w-4 h-4 text-success" /></div>)}
            {isSuccess && <p className="text-success text-sm">Transaction successful!</p>}
          </div>
        </div>
      )}

      {activeTab === "receive" && (
        <div className="feature-card text-center">
          <h2 className="section-title mb-6">Receive AICOIN</h2>
          <div className="flex justify-center mb-6">
            <div className="bg-white p-4 rounded-xl">
              <QRCodeSVG value={address || ""} size={180} />
            </div>
          </div>
          <div className="address-bar inline-flex"><span className="address-text">{address || "0x..."}</span></div>
          <button onClick={copyAddress} className="send-btn mt-4 w-auto px-6 inline-block">{copied ? "Copied!" : "Copy Address"}</button>
        </div>
      )}

      {activeTab === "balance" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => setActiveTab("send")} className="feature-card cursor-pointer"><ArrowUpRight className="feature-card-icon text-success" /><h3 className="feature-card-title">Send AIC</h3><p className="feature-card-text">Transfer tokens</p></button>
            <button onClick={() => setActiveTab("receive")} className="feature-card cursor-pointer"><ArrowDownLeft className="feature-card-icon text-blue" /><h3 className="feature-card-title">Receive AIC</h3><p className="feature-card-text">Share your address</p></button>
          </div>
        </div>
      )}
            <div className="feature-card mt-8">
        <div className="flex items-center gap-2 mb-4"><Clock className="w-4 h-4 text-muted" /><h2 className="section-title">Transaction History</h2></div>
        <div className="tx-empty"><p className="tx-empty-title">No transactions yet</p></div>
      </div>
    </div>
  );
}