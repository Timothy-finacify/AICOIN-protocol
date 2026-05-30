"use client";

import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useState, useEffect } from "react";
import { Bot, Loader2, CheckCircle2, ArrowRight, Zap, Globe, Cpu } from "lucide-react";
import { parseUnits } from "viem";
import { MODEL_REGISTRY, AICOIN } from "@/lib/contracts";
import styles from "./page.module.css";

const CATEGORIES = [
  { value: "0", label: "Text" }, { value: "1", label: "Code" }, { value: "2", label: "Image" },
  { value: "3", label: "Audio" }, { value: "4", label: "Video" }, { value: "5", label: "Multimodal" },
  { value: "6", label: "Reasoning" }, { value: "7", label: "Agentic" },
];

const HARDWARE_TIERS = [
  { value: "0", label: "Mobile / CPU" }, { value: "1", label: "Consumer GPU" },
  { value: "2", label: "Data Center" }, { value: "3", label: "Supercomputer" },
];

export default function RegisterModelPage() {
  const { address, isConnected } = useAccount();
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<"form" | "approving" | "registering" | "done">("form");
  const [error, setError] = useState("");

  const [modelName, setModelName] = useState("");
  const [version, setVersion] = useState("1.0.0");
  const [ipfsMetadata, setIpfsMetadata] = useState("");
  const [category, setCategory] = useState("0");
  const [inputPrice, setInputPrice] = useState("");
  const [outputPrice, setOutputPrice] = useState("");
  const [useAutoPricing, setUseAutoPricing] = useState(true);
  const [hardwareTier, setHardwareTier] = useState("2");
  const [minMemory, setMinMemory] = useState("80000");
  const [maxTokens, setMaxTokens] = useState("32000");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [approveHash, setApproveHash] = useState<`0x${string}` | undefined>();

  useEffect(() => { setMounted(true); }, []);

  const registrationFee = 100;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!modelName.trim() || modelName.length < 2) errs.modelName = "Model name is required";
    if (!version.trim()) errs.version = "Version is required";
    if (!inputPrice || Number(inputPrice) <= 0) errs.inputPrice = "Input price is required";
    if (!outputPrice || Number(outputPrice) <= 0) errs.outputPrice = "Output price is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const registerModel = () => {
    const zkKey = `0x${"0".repeat(64)}` as `0x${string}`;
    const zkCircuit = `0x${"0".repeat(64)}` as `0x${string}`;

    writeContract({
      address: MODEL_REGISTRY as `0x${string}`,
      abi: [{
        name: "registerModel", type: "function", stateMutability: "nonpayable",
        inputs: [
          { name: "name", type: "string" }, { name: "version", type: "string" },
          { name: "ipfsMetadata", type: "string" }, { name: "zkVerificationKey", type: "bytes32" },
          { name: "zkCircuitHash", type: "bytes32" }, { name: "category", type: "uint8" },
          { name: "inputPricePer1MTokens", type: "uint256" }, { name: "outputPricePer1MTokens", type: "uint256" },
          { name: "useAutoPricing", type: "bool" }, { name: "minHardwareTier", type: "uint8" },
          { name: "minMemoryMB", type: "uint256" }, { name: "maxTokensPerRequest", type: "uint256" },
        ],
        outputs: [{ type: "bytes32" }],
      }],
      functionName: "registerModel",
      args: [
        modelName, version, ipfsMetadata || "ipfs://metadata", zkKey, zkCircuit,
        Number(category), BigInt(Math.floor(Number(inputPrice || "0") * 1e6)),
        BigInt(Math.floor(Number(outputPrice || "0") * 1e6)), useAutoPricing,
        Number(hardwareTier), BigInt(minMemory), BigInt(maxTokens),
      ],
    });
    setStep("registering");
  };

  const handleOneClick = async () => {
    if (!validate()) return;
    setStep("approving");
    setError("");

    try {
      writeContract({
        address: AICOIN as `0x${string}`,
        abi: [{
          name: "approve", type: "function", stateMutability: "nonpayable",
          inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
          outputs: [{ type: "bool" }],
        }],
        functionName: "approve",
        args: [MODEL_REGISTRY as `0x${string}`, parseUnits(registrationFee.toString(), 9)],
      });
    } catch {
      setStep("form");
      setError("Approval failed. Try again.");
    }
  };

  const { isSuccess: approveSuccess, isLoading: approveLoading } = useWaitForTransactionReceipt({ hash: approveHash });

  useEffect(() => {
    if (approveSuccess && step === "approving") {
      registerModel();
    }
  }, [approveSuccess]);

  if (!mounted) return <div className={styles.container}><div className={styles.topBar}><h1 className={styles.pageTitle}>Register Model</h1></div></div>;
  if (!isConnected) {
    return (
      <div className={styles.connectWrap}>
        <div className={styles.connectBox}>
          <Bot size={48} className={styles.connectIcon} />
          <h2 className={styles.connectTitle}>Connect Your Wallet</h2>
          <p className={styles.connectText}>Connect to register your AI model on AICOIN.</p>
        </div>
      </div>
    );
  }

  const isLoading = step === "approving" || step === "registering" || isPending || isConfirming || approveLoading;

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <h1 className={styles.pageTitle}>Register AI Model</h1>
        <div className={styles.badge}><div className={styles.badgeDot} /> Sepolia</div>
      </div>

      <div className={styles.formCard}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}><Bot size={18} style={{ color: "#FFB800" }} />Model Information</h2>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>Model Name *</label>
              <input type="text" value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder="DeepSeek, Llama, GPT-4..." className={`${styles.input} ${errors.modelName ? styles.inputError : ""}`} />
              {errors.modelName && <span className={styles.errorText}>{errors.modelName}</span>}
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Version *</label>
              <input type="text" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0.0" className={`${styles.input} ${errors.version ? styles.inputError : ""}`} />
              {errors.version && <span className={styles.errorText}>{errors.version}</span>}
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Category *</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={styles.select}>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>IPFS Metadata URI</label>
            <div className={styles.inputWithIcon}>
              <Globe size={16} className={styles.inputIcon} />
              <input type="text" value={ipfsMetadata} onChange={(e) => setIpfsMetadata(e.target.value)} placeholder="ipfs://your-model-metadata" className={`${styles.input} ${styles.iconInput}`} />
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}><Zap size={18} style={{ color: "#FFB800" }} />Pricing (USD per 1M Tokens)</h2>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>Input Price ($) *</label>
              <div className={styles.inputWithIcon}><span className={styles.inputPrefix}>$</span>
                <input type="number" value={inputPrice} onChange={(e) => setInputPrice(e.target.value)} placeholder="0.50" step="0.01" className={`${styles.input} ${styles.prefixInput} ${errors.inputPrice ? styles.inputError : ""}`} />
              </div>
              {errors.inputPrice && <span className={styles.errorText}>{errors.inputPrice}</span>}
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Output Price ($) *</label>
              <div className={styles.inputWithIcon}><span className={styles.inputPrefix}>$</span>
                <input type="number" value={outputPrice} onChange={(e) => setOutputPrice(e.target.value)} placeholder="2.00" step="0.01" className={`${styles.input} ${styles.prefixInput} ${errors.outputPrice ? styles.inputError : ""}`} />
              </div>
              {errors.outputPrice && <span className={styles.errorText}>{errors.outputPrice}</span>}
            </div>
          </div>
          <label className={styles.checkbox}><input type="checkbox" checked={useAutoPricing} onChange={(e) => setUseAutoPricing(e.target.checked)} /><span>Auto-adjust price with AIC market rate (recommended)</span></label>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}><Cpu size={18} style={{ color: "#FFB800" }} />Hardware Requirements</h2>
          <div className={styles.fieldRow}>
            <div className={styles.field}><label className={styles.label}>Minimum Hardware *</label>
              <select value={hardwareTier} onChange={(e) => setHardwareTier(e.target.value)} className={styles.select}>
                {HARDWARE_TIERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className={styles.field}><label className={styles.label}>Min Memory (MB) *</label>
              <input type="number" value={minMemory} onChange={(e) => setMinMemory(e.target.value)} className={styles.input} />
            </div>
          </div>
          <div className={styles.field}><label className={styles.label}>Max Tokens Per Request *</label>
            <input type="number" value={maxTokens} onChange={(e) => setMaxTokens(e.target.value)} className={styles.input} />
          </div>
        </div>

        <div className={styles.feeBox}><div className={styles.feeRow}><span className={styles.feeLabel}>Registration Fee (Burned)</span><span className={styles.feeValue}>100 AIC</span></div></div>
        <div className={styles.infoBox}>
          <div className={styles.infoRow}><CheckCircle2 size={14} style={{ color: "#00D278" }} /><span>Permanent on-chain model ID. Immutable. Verifiable.</span></div>
          <div className={styles.infoRow}><CheckCircle2 size={14} style={{ color: "#00D278" }} /><span>ZK proofs verify model execution without revealing data.</span></div>
        </div>

        {error && <div className={styles.errorBox}>{error}</div>}

        <button onClick={handleOneClick} disabled={isLoading || !modelName || !version} className={styles.submitBtn}>
          {isLoading ? <><Loader2 size={18} className={styles.spinner} /> {step === "approving" ? "Confirm in MetaMask..." : "Registering..."}</> : <>Register Model <ArrowRight size={18} /></>}
        </button>
        <p className={styles.oneClickNote}>One click. MetaMask opens twice automatically — approve then register.</p>

        {isSuccess && (
          <div className={styles.successBox}>
            <CheckCircle2 size={20} style={{ color: "#00D278" }} />
            <div><div className={styles.successTitle}>Model Registered!</div><div className={styles.successHash}>TX: {txHash?.slice(0, 10)}...{txHash?.slice(-8)}</div></div>
          </div>
        )}
      </div>
    </div>
  );
}