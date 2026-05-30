"use client";

import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useState, useEffect } from "react";
import { Building2, Shield, Zap, Globe, Hash, Coins, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { parseUnits, formatUnits } from "viem";
import { useBalance } from "@/hooks/useAICOIN";
import { COMPANY_REGISTRY, AICOIN } from "@/lib/contracts";
import styles from "./page.module.css";

export default function RegisterCompanyPage() {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance(address);
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  const { writeContract: approve, data: approveHash, isPending: isApproving } = useWriteContract();
  const { isLoading: isApprovingConfirming, isSuccess: isApproved } = useWaitForTransactionReceipt({ hash: approveHash });

  const [name, setName] = useState("");
  const [endpointURI, setEndpointURI] = useState("");
  const [tokensPerSecond, setTokensPerSecond] = useState("1000");
  const [jurisdictionDoc, setJurisdictionDoc] = useState("");
  const [stakeAmount, setStakeAmount] = useState("10000");
  const [mounted, setMounted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => { setMounted(true); }, []);

  const userBalance = balance ? Number(formatUnits(balance as bigint, 9)) : 0;
  const minStake = 10000;
  const registrationFee = 100;
  const totalRequired = Number(stakeAmount) + registrationFee;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim() || name.length < 3) errs.name = "Name must be at least 3 characters";
    if (name.length > 40) errs.name = "Name must be under 40 characters";
    if (!endpointURI.trim()) errs.endpointURI = "API endpoint is required";
    if (!tokensPerSecond || Number(tokensPerSecond) < 1) errs.tokensPerSecond = "Must be at least 1";
    if (!stakeAmount || Number(stakeAmount) < minStake) errs.stakeAmount = `Minimum stake is ${minStake.toLocaleString()} AIC`;
    if (totalRequired > userBalance) errs.stakeAmount = `Insufficient balance. Need ${totalRequired.toLocaleString()} AIC`;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleApprove = () => {
    approve({
      address: AICOIN as `0x${string}`,
      abi: [{
        name: "approve", type: "function", stateMutability: "nonpayable",
        inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
        outputs: [{ type: "bool" }],
      }],
      functionName: "approve",
      args: [COMPANY_REGISTRY as `0x${string}`, parseUnits(totalRequired.toString(), 9)],
    });
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const publicKey = address as `0x${string}`;
    const jurisdictionHash = jurisdictionDoc
      ? (`0x${jurisdictionDoc.padEnd(64, "0").slice(0, 64)}` as `0x${string}`)
      : ("0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`);

    writeContract({
      address: COMPANY_REGISTRY as `0x${string}`,
      abi: [{
        name: "register", type: "function", stateMutability: "nonpayable",
        inputs: [
          { name: "name", type: "string" },
          { name: "publicKey", type: "bytes32" },
          { name: "modelRegistryPointer", type: "address" },
          { name: "endpointURI", type: "string" },
          { name: "jurisdictionHash", type: "bytes32" },
          { name: "supportedTokensPerSecond", type: "uint256" },
          { name: "stakeAmount", type: "uint256" },
        ],
        outputs: [{ type: "bool" }],
      }],
      functionName: "register",
      args: [
        name,
        publicKey,
        "0x0000000000000000000000000000000000000000" as `0x${string}`,
        endpointURI,
        jurisdictionHash,
        BigInt(tokensPerSecond),
        parseUnits(stakeAmount, 9),
      ],
    });
  };

  if (!mounted) return <div className={styles.container}><div className={styles.topBar}><h1 className={styles.pageTitle}>Register Company</h1></div></div>;
  if (!isConnected) {
    return (
      <div className={styles.connectWrap}>
        <div className={styles.connectBox}>
          <Building2 size={48} className={styles.connectIcon} />
          <h2 className={styles.connectTitle}>Connect Your Wallet</h2>
          <p className={styles.connectText}>Connect to register your AI company on AICOIN.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <h1 className={styles.pageTitle}>Register AI Company</h1>
        <div className={styles.badge}><div className={styles.badgeDot} /> Sepolia</div>
      </div>

      <div className={styles.formCard}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}><Building2 size={18} style={{ color: "#FFB800" }} />Company Information</h2>

          <div className={styles.field}>
            <label className={styles.label}>Company Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="OpenAI, DeepSeek, Anthropic..." className={`${styles.input} ${errors.name ? styles.inputError : ""}`} />
            {errors.name && <span className={styles.errorText}>{errors.name}</span>}
            <span className={styles.helpText}>3-40 characters. Must be unique on-chain.</span>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Public Key</label>
            <div className={styles.readonlyField}>
              <Shield size={14} style={{ color: "#00D278" }} />
              <span className={styles.readonlyText}>{address?.slice(0, 10)}...{address?.slice(-8)}</span>
            </div>
            <span className={styles.helpText}>Auto-generated from your connected wallet.</span>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>API Endpoint URI *</label>
            <div className={styles.inputWithIcon}>
              <Globe size={16} className={styles.inputIcon} />
              <input type="text" value={endpointURI} onChange={(e) => setEndpointURI(e.target.value)} placeholder="https://api.groq.com/openai/v1" className={`${styles.input} ${styles.iconInput} ${errors.endpointURI ? styles.inputError : ""}`} />
            </div>
            {errors.endpointURI && <span className={styles.errorText}>{errors.endpointURI}</span>}
            <span className={styles.helpText}>Where validators can ping your AI service. Can use Groq, OpenAI, or any API.</span>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Processing Speed (tokens/second) *</label>
            <div className={styles.inputWithIcon}>
              <Zap size={16} className={styles.inputIcon} />
              <input type="number" value={tokensPerSecond} onChange={(e) => setTokensPerSecond(e.target.value)} placeholder="1000" className={`${styles.input} ${styles.iconInput} ${errors.tokensPerSecond ? styles.inputError : ""}`} />
            </div>
            {errors.tokensPerSecond && <span className={styles.errorText}>{errors.tokensPerSecond}</span>}
            <span className={styles.helpText}>Your claimed processing speed. Verified by validators.</span>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Jurisdiction Document Hash (Optional)</label>
            <div className={styles.inputWithIcon}>
              <Hash size={16} className={styles.inputIcon} />
              <input type="text" value={jurisdictionDoc} onChange={(e) => setJurisdictionDoc(e.target.value)} placeholder="IPFS hash or keccak256 of legal document" className={`${styles.input} ${styles.iconInput}`} />
            </div>
            <span className={styles.helpText}>For regulatory compliance. Can be left empty.</span>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}><Coins size={18} style={{ color: "#FFB800" }} />Stake & Fees</h2>

          <div className={styles.field}>
            <label className={styles.label}>Stake Amount (AIC) *</label>
            <div className={styles.inputWithIcon}>
              <Coins size={16} className={styles.inputIcon} />
              <input type="number" value={stakeAmount} onChange={(e) => setStakeAmount(e.target.value)} placeholder="10000" className={`${styles.input} ${styles.iconInput} ${errors.stakeAmount ? styles.inputError : ""}`} />
            </div>
            {errors.stakeAmount && <span className={styles.errorText}>{errors.stakeAmount}</span>}
            <span className={styles.helpText}>Minimum {minStake.toLocaleString()} AIC. Locked as collateral. Returnable on deregistration.</span>
          </div>

          <div className={styles.feeSummary}>
            <div className={styles.feeRow}>
              <span className={styles.feeLabel}>Registration Fee (Burned)</span>
              <span className={styles.feeValue}>{registrationFee} AIC</span>
            </div>
            <div className={styles.feeRow}>
              <span className={styles.feeLabel}>Stake (Locked, Returnable)</span>
              <span className={styles.feeValue} style={{ color: "#FFB800" }}>{Number(stakeAmount).toLocaleString()} AIC</span>
            </div>
            <div className={styles.feeDivider} />
            <div className={styles.feeRow}>
              <span className={styles.feeLabel}>Total Required</span>
              <span className={styles.feeTotal}>{totalRequired.toLocaleString()} AIC</span>
            </div>
            <div className={styles.feeRow}>
              <span className={styles.feeLabel}>Your Balance</span>
              <span className={styles.feeValue} style={{ color: userBalance >= totalRequired ? "#00D278" : "#D4645C" }}>{userBalance.toLocaleString()} AIC</span>
            </div>
          </div>
        </div>

        <div className={styles.infoBox}>
          <div className={styles.infoRow}><CheckCircle2 size={16} style={{ color: "#00D278" }} /><span>Trust score starts at 0. Auto-verified at score 60.</span></div>
          <div className={styles.infoRow}><CheckCircle2 size={16} style={{ color: "#00D278" }} /><span>Earn 70.5% per token from every AI request.</span></div>
          <div className={styles.infoRow}><CheckCircle2 size={16} style={{ color: "#00D278" }} /><span>Stake is returnable when you deregister.</span></div>
        </div>

        {isApproved && (
          <div className={styles.successBox} style={{ marginBottom: "20px" }}>
            <CheckCircle2 size={20} style={{ color: "#00D278" }} />
            <div>
              <div className={styles.successTitle}>Spending Approved!</div>
              <div className={styles.successHash}>{totalRequired.toLocaleString()} AIC approved for CompanyRegistry</div>
            </div>
          </div>
        )}

        {!isApproved ? (
          <button onClick={handleApprove} disabled={isApproving || isApprovingConfirming} className={styles.submitBtn}>
            {isApproving || isApprovingConfirming ? <><Loader2 size={18} className={styles.spinner} /> Approving...</> : <><Shield size={18} /> Approve {totalRequired.toLocaleString()} AIC Spending</>}
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={isPending || isConfirming} className={styles.submitBtn}>
            {isPending || isConfirming ? <><Loader2 size={18} className={styles.spinner} /> Registering...</> : <>Register Company <ArrowRight size={18} /></>}
          </button>
        )}

        {isSuccess && (
          <div className={styles.successBox}>
            <CheckCircle2 size={20} style={{ color: "#00D278" }} />
            <div>
              <div className={styles.successTitle}>Company Registered!</div>
              <div className={styles.successHash}>TX: {txHash?.slice(0, 10)}...{txHash?.slice(-8)}</div>
            </div>
          </div>
        )}

        {!isSuccess && txHash && (
          <div className={styles.successBox} style={{ borderColor: "rgba(245,166,35,0.3)", background: "rgba(245,166,35,0.06)" }}>
            <Loader2 size={20} className={styles.spinner} style={{ color: "#FFB800" }} />
            <div>
              <div className={styles.successTitle}>Confirming transaction...</div>
              <div className={styles.successHash}>TX: {txHash?.slice(0, 10)}...{txHash?.slice(-8)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}