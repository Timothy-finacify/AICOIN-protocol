"use client";

import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useState, useEffect } from "react";
import { Bot, Plus, Activity, Zap, Wallet, ArrowRight, Loader2, CheckCircle2, X, Globe, Code, Server, Shield, Layers } from "lucide-react";
import { parseUnits, formatUnits } from "viem";
import { useBalance } from "@/hooks/useAICOIN";
import { AGENT_WALLET, PAYMENT_ROUTER, SESSION, AICOIN } from "@/lib/contracts";
import styles from "./page.module.css";

export default function AgentsPage() {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance(address);
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  const [mounted, setMounted] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showBatch, setShowBatch] = useState(false);
  const [showIntegration, setShowIntegration] = useState(false);
  const [agentAddress, setAgentAddress] = useState("");
  const [minBalance, setMinBalance] = useState("50");
  const [refillAmount, setRefillAmount] = useState("200");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositTarget, setDepositTarget] = useState("");
  const [activeTab, setActiveTab] = useState<"agents" | "batch" | "integration">("agents");
  const [copied, setCopied] = useState<string | null>(null);
  const [batchCount, setBatchCount] = useState("10");
  const [batchMinBalance, setBatchMinBalance] = useState("10");
  const [batchRefillAmount, setBatchRefillAmount] = useState("50");
  const [batchBaseName, setBatchBaseName] = useState("Farm-Phone");
  const [generatedAgents, setGeneratedAgents] = useState<string[]>([]);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return <div className={styles.container}><h1 className={styles.pageTitle}>AI Agents</h1></div>;
  if (!isConnected) {
    return (
      <div className={styles.connectWrap}>
        <div className={styles.connectBox}>
          <Bot size={48} className={styles.connectIcon} />
          <h2 className={styles.connectTitle}>Connect Your Wallet</h2>
          <p className={styles.connectText}>Connect to manage your AI agent wallets and farms.</p>
        </div>
      </div>
    );
  }

  const userBalance = balance ? Number(formatUnits(balance as bigint, 9)) : 0;

  const handleCreateAgent = () => {
    if (!agentAddress) return;
    writeContract({
      address: AGENT_WALLET as `0x${string}`,
      abi: [{
        name: "createAgent", type: "function", stateMutability: "nonpayable",
        inputs: [{ name: "agentWallet", type: "address" }, { name: "minBalance", type: "uint256" }, { name: "refillAmount", type: "uint256" }],
        outputs: [],
      }],
      functionName: "createAgent",
      args: [agentAddress as `0x${string}`, parseUnits(minBalance, 9), parseUnits(refillAmount, 9)],
    });
  };

  const handleDeposit = () => {
    if (!depositTarget || !depositAmount) return;
    writeContract({
      address: AICOIN as `0x${string}`,
      abi: [{ name: "transfer", type: "function", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] }],
      functionName: "transfer",
      args: [depositTarget as `0x${string}`, parseUnits(depositAmount, 9)],
    });
  };

  const generateBatchAddresses = () => {
    const count = Number(batchCount) || 10;
    const addresses: string[] = [];
    for (let i = 0; i < count; i++) {
      const randomHex = Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
      addresses.push(`0x${randomHex}`);
    }
    setGeneratedAgents(addresses);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const integrationCode = `// ============================================================
// AICOIN Off-Chain Integration Guide
// Any website can accept AI payments using AICOIN
// ============================================================

import { ethers } from "ethers";

const CONTRACTS = {
  PAYMENT_ROUTER: "${PAYMENT_ROUTER}",
  SESSION: "${SESSION}",
  AICOIN: "${AICOIN}",
};

// Step 1: User approves session (one-time)
async function approveSession(signer, aiProvider, dailyLimit) {
  const session = new ethers.Contract(CONTRACTS.SESSION, [
    "function approveSession(address dapp, uint256 allowance, uint256 duration)"
  ], signer);
  await session.approveSession(aiProvider, ethers.parseUnits(dailyLimit.toString(), 9), 86400);
}

// Step 2: Call AI off-chain (normal HTTP)
async function callAI(apiKey, model, prompt) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": \`Bearer \${apiKey}\`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await res.json();
  return { result: data.choices[0].message.content, inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens };
}

// Step 3: Settle payment on-chain
async function settlePayment(signer, company, modelId, inputTokens, outputTokens) {
  const router = new ethers.Contract(CONTRACTS.PAYMENT_ROUTER, [
    "function routePayment(address,bytes32,uint256,uint256,address) returns (bool)"
  ], signer);
  await router.routePayment(company, modelId, inputTokens, outputTokens, await signer.getAddress());
}`;

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <div>
          <h1 className={styles.pageTitle}>AI Agents & Farms</h1>
          <p className={styles.subtitle}>Create agent wallets. Build mining farms. One wallet controls everything.</p>
        </div>
      </div>

      <div className={styles.tabs}>
        {(["agents", "batch", "integration"] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={`${styles.tab} ${activeTab === t ? styles.tabActive : ""}`}>
            {t === "agents" ? "Single Agent" : t === "batch" ? "Batch Farm" : "Integration"}
          </button>
        ))}
      </div>

      {/* SINGLE AGENT */}
      {activeTab === "agents" && (
        <>
          <div className={styles.card}>
            <div className={styles.formHeader}>
              <h2 className={styles.sectionTitle}><Bot size={18} style={{ color: "#6C5CE1" }} />Create Agent Wallet</h2>
              <button onClick={() => setShowCreate(!showCreate)} className={styles.toggleBtn}>{showCreate ? <X size={18} /> : <Plus size={18} />}</button>
            </div>
            {showCreate && (
              <>
                <div className={styles.field}><label className={styles.label}>Agent Wallet Address</label><input type="text" value={agentAddress} onChange={(e) => setAgentAddress(e.target.value)} placeholder="0x..." className={styles.input} /></div>
                <div className={styles.fieldRow}>
                  <div className={styles.field}><label className={styles.label}>Min Balance (AIC)</label><input type="number" value={minBalance} onChange={(e) => setMinBalance(e.target.value)} className={styles.input} /></div>
                  <div className={styles.field}><label className={styles.label}>Refill Amount (AIC)</label><input type="number" value={refillAmount} onChange={(e) => setRefillAmount(e.target.value)} className={styles.input} /></div>
                </div>
                <button onClick={handleCreateAgent} disabled={!agentAddress || isPending} className={styles.submitBtn}>
                  {isPending ? <><Loader2 size={16} className={styles.spinner} /> Creating...</> : <><Bot size={16} /> Create Agent</>}
                </button>
              </>
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}><Wallet size={18} style={{ color: "#FFB800" }} />Fund Agent</h2>
            <div className={styles.fieldRow}>
              <div className={styles.field}><label className={styles.label}>Agent Address</label><input type="text" value={depositTarget} onChange={(e) => setDepositTarget(e.target.value)} placeholder="0x..." className={styles.input} /></div>
              <div className={styles.field}><label className={styles.label}>Amount (AIC)</label><input type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} className={styles.input} /></div>
            </div>
            <button onClick={handleDeposit} disabled={!depositTarget || !depositAmount || isPending} className={styles.submitBtn}><ArrowRight size={16} /> Send AIC to Agent</button>
            <div className={styles.balanceInfo}>Your Balance: <span style={{ color: "#FFB800", fontWeight: 600 }}>{userBalance.toLocaleString()} AIC</span></div>
          </div>
        </>
      )}

      {/* BATCH FARM */}
      {activeTab === "batch" && (
        <>
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}><Server size={18} style={{ color: "#FFB800" }} />Batch Farm Setup</h2>
            <p className={styles.sectionDesc}>Generate multiple agent wallets for your mining farm. Each device gets its own agent wallet. All rewards flow to your master wallet.</p>
            
            <div className={styles.fieldRow}>
              <div className={styles.field}><label className={styles.label}>Number of Agents</label><input type="number" value={batchCount} onChange={(e) => setBatchCount(e.target.value)} className={styles.input} /></div>
              <div className={styles.field}><label className={styles.label}>Base Name</label><input type="text" value={batchBaseName} onChange={(e) => setBatchBaseName(e.target.value)} className={styles.input} /></div>
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.field}><label className={styles.label}>Min Balance (AIC)</label><input type="number" value={batchMinBalance} onChange={(e) => setBatchMinBalance(e.target.value)} className={styles.input} /></div>
              <div className={styles.field}><label className={styles.label}>Refill Amount (AIC)</label><input type="number" value={batchRefillAmount} onChange={(e) => setBatchRefillAmount(e.target.value)} className={styles.input} /></div>
            </div>

            <button onClick={generateBatchAddresses} className={styles.submitBtn} style={{ background: "linear-gradient(135deg, #6C5CE1, #4A9DFF)" }}>
              <Layers size={16} /> Generate {batchCount} Agent Addresses
            </button>

            {generatedAgents.length > 0 && (
              <div className={styles.batchList}>
                <div className={styles.batchHeader}>
                  <span>{generatedAgents.length} agents generated</span>
                  <button onClick={() => copyToClipboard(JSON.stringify(generatedAgents, null, 2), "batch")} className={styles.copyCodeBtn}>
                    {copied === "batch" ? <CheckCircle2 size={14} style={{ color: "#00D278" }} /> : <Code size={14} />}
                    {copied === "batch" ? "Copied!" : "Copy All"}
                  </button>
                </div>
                <div className={styles.batchGrid}>
                  {generatedAgents.slice(0, 20).map((addr, i) => (
                    <div key={i} className={styles.batchItem}>
                      <span className={styles.batchNum}>{batchBaseName}-{i + 1}</span>
                      <span className={styles.batchAddr}>{addr.slice(0, 10)}...{addr.slice(-6)}</span>
                    </div>
                  ))}
                  {generatedAgents.length > 20 && <div className={styles.batchItem}>... and {generatedAgents.length - 20} more</div>}
                </div>
                <p className={styles.batchNote}>
                  These are generated addresses. Register each on-chain using the Single Agent tab, or use the API for bulk registration.
                </p>
              </div>
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}><Shield size={18} style={{ color: "#00D278" }} />Farm Owner Flow</h2>
            <div className={styles.stepGrid}>
              {[
                { step: "01", icon: Layers, title: "Generate Agents", text: "Create agent wallets for each device in your farm.", color: "#FFB800" },
                { step: "02", icon: Server, title: "Register Devices", text: "Each device registers on DeviceRegistry with unique fingerprint.", color: "#5BAAFF" },
                { step: "03", icon: Zap, title: "Start Mining", text: "All devices mine AIC. Rewards go to their agent wallets.", color: "#00D278" },
                { step: "04", icon: Wallet, title: "One Dashboard", text: "Your master wallet sees all agent balances and total earnings.", color: "#6C5CE1" },
              ].map(({ step, icon: Icon, title, text, color }) => (
                <div key={step} className={styles.stepCard}>
                  <div className={styles.stepNumber} style={{ color }}>{step}</div>
                  <Icon size={24} style={{ color, marginBottom: "8px" }} />
                  <div className={styles.stepTitle}>{title}</div>
                  <div className={styles.stepText}>{text}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* INTEGRATION */}
      {activeTab === "integration" && (
        <div className={styles.card}>
          <div className={styles.formHeader}>
            <h2 className={styles.sectionTitle}><Code size={18} style={{ color: "#00D278" }} />Integration Code</h2>
            <button onClick={() => copyToClipboard(integrationCode, "integration")} className={styles.copyCodeBtn}>
              {copied === "integration" ? <CheckCircle2 size={16} style={{ color: "#00D278" }} /> : <Code size={16} />}
              {copied === "integration" ? "Copied!" : "Copy"}
            </button>
          </div>
          <div className={styles.codeBlock}><pre className={styles.code}>{integrationCode}</pre></div>
        </div>
      )}

      {isSuccess && (
        <div className={styles.successBanner}>
          <CheckCircle2 size={20} style={{ color: "#00D278" }} />
          <span>Transaction confirmed! TX: {txHash?.slice(0, 10)}...{txHash?.slice(-8)}</span>
        </div>
      )}
    </div>
  );
}