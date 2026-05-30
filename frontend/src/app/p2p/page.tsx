"use client";

import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useState, useEffect, useCallback } from "react";
import { ArrowUpDown, Plus, Shield, CheckCircle2, Loader2, X, RefreshCw, Eye, Phone, Upload, Copy, ExternalLink } from "lucide-react";
import { parseUnits, formatUnits } from "viem";
import { useTradeCounter, useCalculateStake } from "@/hooks/useAICOIN";
import { P2P_ESCROW, AICOIN } from "@/lib/contracts";
import styles from "./page.module.css";

const PAYMENT_METHODS = ["MTN_Money", "Orange_Money", "UPI", "Pix", "MPesa", "GCash", "Bank_Transfer"];
const RPC = "https://sepolia.gateway.tenderly.co";
const TRADE_TOPIC = "0x548f81df6995b690c3866ac84e679bfea78b9aec5627be564551780298ed34d6";

export default function P2PPage() {
  const { address, isConnected } = useAccount();
  const { data: tradeCount, refetch: refetchTradeCount } = useTradeCounter();
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const [mounted, setMounted] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
  const [sellAmount, setSellAmount] = useState("");
  const [sellMethod, setSellMethod] = useState("MTN_Money");
  const [sellContact, setSellContact] = useState("");
  const [offers, setOffers] = useState<any[]>([]);
  const [step, setStep] = useState<"approve" | "create" | "done">("approve");
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);
  const [debugInfo, setDebugInfo] = useState("");

  // BUY FLOW STATE
  const [selectedOffer, setSelectedOffer] = useState<any>(null);
  const [buyStep, setBuyStep] = useState<"review" | "contact" | "pay" | "proof" | "done">("review");
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [proofText, setProofText] = useState("");
  const [buyTxHash, setBuyTxHash] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: stake } = useCalculateStake(sellAmount ? Number(sellAmount) : undefined);
  const stakeAmount = stake ? Number(stake) / 1e9 : 0;

  const fetchAllTrades = useCallback(async () => {
    setIsLoadingOffers(true);
    const allOffers: any[] = [];
    try {
      const blockRes = await fetch(RPC, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method: "eth_blockNumber", params: [], id: 1 })
      });
      const blockData = await blockRes.json();
      const currentBlock = parseInt(blockData.result, 16);
      const startBlock = 10953100;

      for (let from = startBlock; from < currentBlock; from += 10) {
        const to = Math.min(from + 9, currentBlock);
        const res = await fetch(RPC, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0", method: "eth_getLogs", params: [{
              address: P2P_ESCROW,
              fromBlock: "0x" + from.toString(16),
              toBlock: "0x" + to.toString(16),
              topics: [TRADE_TOPIC]
            }], id: 1
          })
        });
        const data = await res.json();
        if (data.result) {
          data.result.forEach((log: any) => {
            const tradeId = parseInt(log.topics[1], 16);
            const seller = "0x" + log.topics[2].slice(26);
            const dataHex = log.data.startsWith("0x") ? log.data.slice(2) : log.data;
            const amount = parseInt(dataHex.slice(0, 64), 16);
            if (!allOffers.find(o => o.id === tradeId)) {
              allOffers.push({ id: tradeId, seller, amount });
            }
          });
        }
      }
      setOffers(allOffers);
      setDebugInfo(allOffers.length > 0 ? `Found ${allOffers.length} offer(s)` : "No offers yet");
    } catch (error: any) {
      setDebugInfo(`Error: ${error.message}`);
    } finally {
      setIsLoadingOffers(false);
    }
  }, []);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (mounted) fetchAllTrades(); }, [mounted, fetchAllTrades]);

  useEffect(() => {
    if (isSuccess && txHash) {
      if (step === "approve") setStep("create");
      if (step === "create") {
        setStep("done");
        setTimeout(() => { refetchTradeCount(); fetchAllTrades(); }, 2000);
      }
    }
  }, [isSuccess, txHash, step, refetchTradeCount, fetchAllTrades]);

  const handleApprove = () => {
    if (!sellAmount || !sellContact) return;
    writeContract({
      address: AICOIN as `0x${string}`,
      abi: [{ name: "approve", type: "function", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] }],
      functionName: "approve",
      args: [P2P_ESCROW as `0x${string}`, parseUnits((Number(sellAmount) + stakeAmount).toString(), 9)],
    });
  };

  const handleCreateTrade = () => {
    if (!sellAmount || !sellContact) return;
    writeContract({
      address: P2P_ESCROW as `0x${string}`,
      abi: [{ name: "createTrade", type: "function", stateMutability: "nonpayable", inputs: [{ name: "_amount", type: "uint256" }, { name: "_method", type: "string" }, { name: "_contact", type: "string" }], outputs: [] }],
      functionName: "createTrade",
      args: [parseUnits(sellAmount, 9), sellMethod, sellContact],
    });
  };

  const handleCloseModal = () => {
    setShowCreate(false);
    setSellAmount("");
    setSellMethod("MTN_Money");
    setSellContact("");
    setStep("approve");
    setDebugInfo("");
    setTimeout(() => { refetchTradeCount(); fetchAllTrades(); }, 300);
  };

  const handleRefreshOffers = () => {
    refetchTradeCount();
    fetchAllTrades();
  };

  // ============ BUY FLOW FUNCTIONS ============

  const openBuyModal = (offer: any) => {
    setSelectedOffer(offer);
    setBuyStep("review");
    setShowBuyModal(true);
    setProofText("");
    setCopied(false);
  };

  const handleTakeTrade = () => {
    if (!selectedOffer) return;
    writeContract({
      address: P2P_ESCROW as `0x${string}`,
      abi: [{ name: "takeTrade", type: "function", stateMutability: "nonpayable", inputs: [{ name: "_tradeId", type: "uint256" }], outputs: [] }],
      functionName: "takeTrade",
      args: [BigInt(selectedOffer.id)],
    });
    setBuyStep("contact");
  };

  const handleShowContact = () => {
    setBuyStep("pay");
  };

  const handleSubmitProof = () => {
    if (!proofText.trim() || !selectedOffer) return;
    writeContract({
      address: P2P_ESCROW as `0x${string}`,
      abi: [{ name: "submitPaymentProof", type: "function", stateMutability: "nonpayable", inputs: [{ name: "_tradeId", type: "uint256" }, { name: "_proofData", type: "string" }], outputs: [] }],
      functionName: "submitPaymentProof",
      args: [BigInt(selectedOffer.id), proofText],
    });
    setBuyStep("done");
  };

  const handleCopyContact = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!mounted) return <div className={styles.container}><h1 className={styles.pageTitle}>P2P Exchange</h1></div>;
  if (!isConnected) {
    return (
      <div className={styles.connectWrap}>
        <div className={styles.connectBox}>
          <ArrowUpDown size={48} className={styles.connectIcon} />
          <h2 className={styles.connectTitle}>Connect Your Wallet</h2>
          <p className={styles.connectText}>Connect to trade AIC.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <h1 className={styles.pageTitle}>P2P Exchange</h1>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={handleRefreshOffers} className={styles.refreshBtn} disabled={isLoadingOffers}>
            {isLoadingOffers ? <Loader2 size={18} className={styles.spinner} /> : <RefreshCw size={18} />}
          </button>
          <button onClick={() => { setShowCreate(true); setStep("approve"); }} className={styles.createBtn}>
            <Plus size={18} /> Create Offer
          </button>
        </div>
      </div>

      {debugInfo && (
        <div className={styles.debugBar}>{debugInfo}</div>
      )}

      <div className={styles.infoBanner}>
        <Shield size={16} style={{ color: "#00D278" }} />
        <span>All trades protected by escrow. Your AIC is safe.</span>
      </div>

      {/* ============ SELL FORM ============ */}
      {showCreate && (
        <div className={styles.card}>
          <div className={styles.formHeader}>
            <h2 className={styles.sectionTitle}><Plus size={18} style={{ color: "#FFB800" }} />Sell AIC</h2>
            <button onClick={handleCloseModal} className={styles.closeBtn}><X size={18} /></button>
          </div>

          {step === "done" ? (
            <div style={{ textAlign: "center", padding: "20px" }}>
              <CheckCircle2 size={48} style={{ color: "#00D278", marginBottom: "12px" }} />
              <div className={styles.sectionTitle} style={{ justifyContent: "center" }}>Offer Created!</div>
              <button onClick={() => { handleCloseModal(); setActiveTab("buy"); }} className={styles.submitBtn} style={{ marginTop: "16px" }}>View Offers</button>
            </div>
          ) : (
            <>
              <div className={styles.field}><label className={styles.label}>Amount (AIC)</label><input type="number" value={sellAmount} onChange={(e) => setSellAmount(e.target.value)} placeholder="1000" className={styles.input} /></div>
              <div className={styles.field}><label className={styles.label}>Payment Method</label><select value={sellMethod} onChange={(e) => setSellMethod(e.target.value)} className={styles.select}>{PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replace("_", " ")}</option>)}</select></div>
              <div className={styles.field}><label className={styles.label}>Your Contact</label><input type="text" value={sellContact} onChange={(e) => setSellContact(e.target.value)} placeholder="2376XXXXXXX" className={styles.input} /></div>
              {stakeAmount > 0 && (
                <div className={styles.stakeInfo}><Shield size={14} style={{ color: "#FFB800" }} /><span>Stake: {stakeAmount.toFixed(2)} AIC (5% of trade)</span></div>
              )}
              {step === "approve" ? (
                <button onClick={handleApprove} disabled={!sellAmount || !sellContact || isPending} className={styles.submitBtn}>
                  {isPending ? <><Loader2 size={16} className={styles.spinner} /> Confirm...</> : <>Step 1: Approve Spending</>}
                </button>
              ) : (
                <button onClick={handleCreateTrade} disabled={isPending || isConfirming || !sellAmount || !sellContact} className={styles.submitBtn} style={{ background: "linear-gradient(135deg, #00D278, #00B866)" }}>
                  {isPending || isConfirming ? <><Loader2 size={16} className={styles.spinner} /> Creating...</> : <>Step 2: Create Offer</>}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* ============ BUY MODAL ============ */}
      {showBuyModal && selectedOffer && (
        <div className={styles.modalOverlay} onClick={() => setShowBuyModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.formHeader}>
              <h2 className={styles.sectionTitle}><ArrowUpDown size={18} style={{ color: "#FFB800" }} />Buy AIC - Offer #{selectedOffer.id}</h2>
              <button onClick={() => setShowBuyModal(false)} className={styles.closeBtn}><X size={18} /></button>
            </div>

            <div className={styles.buySummary}>
              <div className={styles.buyRow}><span>Amount</span><span className={styles.buyValue}>{selectedOffer.amount?.toLocaleString()} AIC</span></div>
              <div className={styles.buyRow}><span>Seller</span><span className={styles.buyValue}>{selectedOffer.seller?.slice(0, 10)}...</span></div>
              <div className={styles.buyRow}><span>Method</span><span className={styles.buyValue}>MTN Money</span></div>
              <div className={styles.buyRow}><span>Protection</span><span className={styles.buyValue} style={{ color: "#00D278" }}>Escrow Secured</span></div>
            </div>

            {buyStep === "review" && (
              <div>
                <p className={styles.buyNote}>Click "Take Trade" to lock in this offer. The seller's contact will be revealed after.</p>
                <button onClick={handleTakeTrade} disabled={isPending || isConfirming} className={styles.submitBtn}>
                  {isPending || isConfirming ? <><Loader2 size={16} className={styles.spinner} /> Processing...</> : <><ArrowUpDown size={16} /> Take Trade - Lock In</>}
                </button>
              </div>
            )}

            {buyStep === "contact" && (
              <div>
                <div className={styles.successBanner}>
                  <CheckCircle2 size={16} style={{ color: "#00D278" }} />
                  <span>Trade locked! Reveal seller contact to proceed.</span>
                </div>
                <button onClick={handleShowContact} className={styles.submitBtn} style={{ marginTop: "12px", background: "linear-gradient(135deg, #6C5CE1, #4A9DFF)" }}>
                  <Eye size={16} /> Reveal Seller Contact
                </button>
              </div>
            )}

            {buyStep === "pay" && (
              <div>
                <div className={styles.contactCard}>
                  <Phone size={16} style={{ color: "#FFB800" }} />
                  <div>
                    <div className={styles.contactLabel}>Seller Contact</div>
                    <div className={styles.contactNumber}>2376XXXXXXX</div>
                  </div>
                  <button onClick={() => handleCopyContact("2376XXXXXXX")} className={styles.copyBtn}>
                    {copied ? <CheckCircle2 size={14} style={{ color: "#00D278" }} /> : <Copy size={14} />}
                  </button>
                </div>
                <p className={styles.buyNote}>Send {selectedOffer.amount?.toLocaleString()} AIC worth via MTN Money to the number above. Then paste the SMS confirmation below.</p>
                <button onClick={() => setBuyStep("proof")} className={styles.submitBtn} style={{ background: "linear-gradient(135deg, #00D278, #00B866)" }}>
                  <Upload size={16} /> I've Paid - Submit Proof
                </button>
              </div>
            )}

            {buyStep === "proof" && (
              <div>
                <div className={styles.field}>
                  <label className={styles.label}>Paste MTN SMS Confirmation</label>
                  <textarea
                    value={proofText}
                    onChange={(e) => setProofText(e.target.value)}
                    placeholder="You have sent X CFA to 2376XXXXXXX. ID: MTN20260530..."
                    className={styles.textarea}
                    rows={4}
                  />
                </div>
                <p className={styles.buyNote}>
                  The system extracts: amount, receiver number, and transaction ID. Your balance is never shown or stored.
                </p>
                <button onClick={handleSubmitProof} disabled={!proofText.trim() || isPending} className={styles.submitBtn}>
                  {isPending ? <><Loader2 size={16} className={styles.spinner} /> Submitting...</> : <><Upload size={16} /> Submit Proof</>}
                </button>
              </div>
            )}

            {buyStep === "done" && (
              <div style={{ textAlign: "center", padding: "20px" }}>
                <CheckCircle2 size={48} style={{ color: "#00D278", marginBottom: "12px" }} />
                <div className={styles.sectionTitle} style={{ justifyContent: "center" }}>Proof Submitted!</div>
                <p className={styles.buyNote}>The seller will confirm receipt. AIC will be released to your wallet.</p>
                <button onClick={() => { setShowBuyModal(false); fetchAllTrades(); }} className={styles.submitBtn} style={{ marginTop: "16px" }}>Done</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ TABS ============ */}
      <div className={styles.tabs}>
        {(["buy", "sell"] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={`${styles.tab} ${activeTab === t ? styles.tabActive : ""}`}>
            {t === "buy" ? "Buy AIC" : "My Offers"}
          </button>
        ))}
      </div>

      {activeTab === "buy" && (
        <div className={styles.offerList}>
          {isLoadingOffers ? (
            <div className={styles.card}><div className={styles.emptyState}><Loader2 size={40} className={styles.spinner} /><div className={styles.emptyTitle}>Loading offers...</div></div></div>
          ) : offers.length === 0 ? (
            <div className={styles.card}><div className={styles.emptyState}><ArrowUpDown size={40} className={styles.emptyIcon} /><div className={styles.emptyTitle}>No offers yet</div></div></div>
          ) : (
            offers.map((o) => (
              <div key={`offer-${o.id}`} className={styles.offerCard}>
                <div className={styles.offerHeader}>
                  <div><div className={styles.offerAmount}>{o.amount?.toLocaleString()} AIC</div><div className={styles.offerPrice}>Seller: {o.seller?.slice(0, 10)}...</div></div>
                  <div className={styles.offerMethod}>MTN Money</div>
                </div>
                <div className={styles.offerDetails}>
                  <div className={styles.offerDetail}><Shield size={12} style={{ color: "#00D278" }} /><span>Escrow Protected</span></div>
                </div>
                <button className={styles.buyBtn} onClick={() => openBuyModal(o)}>Buy AIC</button>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "sell" && (
        <div className={styles.card}><div className={styles.emptyState}><ArrowUpDown size={40} className={styles.emptyIcon} /><div className={styles.emptyTitle}>My Offers</div></div></div>
      )}
    </div>
  );
}