"use client";

import { useAccount, useWriteContract } from "wagmi";
import { useState } from "react";
import { 
  Building2, CheckCircle2, Shield, Globe, Upload, AlertCircle, X,
  Cpu, Key, Zap, FileText, ChevronLeft, ChevronRight, Check, Server,
  HardDrive, Layers
} from "lucide-react";
import { addCompany } from "@/lib/companyStore";
import { COMPANY_REGISTRY_ADDRESS, MODEL_REGISTRY_ADDRESS } from "@/lib/contracts";
import { sepolia } from "wagmi/chains";
import { parseUnits } from "viem";

const STEPS = ["Identity", "Wallet", "Model Specs", "Capabilities", "Pricing", "Review"];

const MODEL_REGISTRY_ABI = [
  {
    name: "registerModel",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name", type: "string" },
      { name: "ipfsHash", type: "string" },
      { name: "minTier", type: "uint8" },
      { name: "minMemoryMB", type: "uint256" },
      { name: "pricePerRequest", type: "uint256" },
    ],
    outputs: [{ type: "bytes32" }],
  },
] as const;

export default function RegisterPage() {
  const { address, isConnected } = useAccount();
  const { writeContract, isPending: isRegistering } = useWriteContract();
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Identity
  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState("");
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState("");
  const [yearFounded, setYearFounded] = useState("");

  // Step 3: Model Specs
  const [modelName, setModelName] = useState("");
  const [modelArchitecture, setModelArchitecture] = useState("");
  const [modelParameters, setModelParameters] = useState("");
  const [ipfsHash, setIpfsHash] = useState("");
  const [minTier, setMinTier] = useState(1);
  const [minMemoryMB, setMinMemoryMB] = useState("");
  const [inferenceSpeedMs, setInferenceSpeedMs] = useState("");
  const [inputFormats, setInputFormats] = useState<string[]>([]);
  const [outputFormats, setOutputFormats] = useState<string[]>([]);

  // Step 4: Capabilities
  const [description, setDescription] = useState("");
  const [useCases, setUseCases] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);

  // Step 5: Pricing
  const [pricePerRequest, setPricePerRequest] = useState("");
  const [agentCompatible, setAgentCompatible] = useState(false);
  const [maxAgents, setMaxAgents] = useState("");

  if (!isConnected) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="flex justify-center mb-6">
            <div className="auth-icon-circle"><Building2 className="auth-icon" /></div>
          </div>
          <h2 className="auth-title">Connect Your Wallet</h2>
          <p className="text-center mb-6 text-muted">Connect your wallet to register your AI company and models.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="page-container max-w-2xl mx-auto px-4">
        <div className="feature-card text-center py-12">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(0, 255, 136, 0.1)" }}>
              <CheckCircle2 className="w-10 h-10 text-success" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Registration Complete</h2>
          <p className="text-muted mb-2">{companyName} has been registered with model {modelName}.</p>
          <p className="text-sm text-muted mb-6">Wallet: {address?.slice(0, 6)}...{address?.slice(-4)}</p>
          <button onClick={() => { setSubmitted(false); setStep(0); }} className="btn-secondary">Register Another</button>
        </div>
      </div>
    );
  }

  const handleSubmit = () => {
    setError("");
    if (!companyName) { setError("Company name is required."); return; }
    if (!modelName) { setError("Model name is required."); return; }

    // Submit model to ModelRegistry on-chain
    writeContract({
      address: MODEL_REGISTRY_ADDRESS as `0x${string}`,
      abi: MODEL_REGISTRY_ABI,
      functionName: "registerModel",
      args: [
        modelName,
        ipfsHash || `ipfs://placeholder-${Date.now()}`,
        minTier,
        BigInt(minMemoryMB || "1024"),
        parseUnits(pricePerRequest || "0.01", 9),
      ],
      chain: sepolia,
      account: address,
    });

    // Also save locally
    addCompany({
      name: companyName,
      description: description || `${modelName} — ${modelArchitecture} model`,
      price: Number(pricePerRequest) || 0.01,
      category: useCases.length > 0 ? useCases[0] : "General",
      languages: languages.length > 0 ? languages : ["English"],
      walletAddress: address || "",
    });

    setSubmitted(true);
  };

  const toggleArrayItem = (arr: string[], setter: (a: string[]) => void, item: string) => {
    if (arr.includes(item)) setter(arr.filter(i => i !== item));
    else setter([...arr, item]);
  };

  const formatOptions = ["Text", "Image", "Audio", "Video", "JSON"];
  const useCaseOptions = ["Medical", "Legal", "Education", "Finance", "Agriculture", "Customer Support", "Code Generation", "Translation", "General"];
  const languageOptions = ["English", "Swahili", "Hindi", "French", "Arabic", "Bengali", "Tamil", "Telugu", "Spanish", "Chinese"];
  const regionOptions = ["Africa", "South Asia", "Southeast Asia", "Middle East", "Europe", "North America", "Latin America", "Global"];
  const tierOptions = [
    { value: 0, label: "Mobile / CPU", desc: "Phones, basic laptops" },
    { value: 1, label: "Consumer GPU", desc: "RTX 3060+, RX 6800+" },
    { value: 2, label: "Data Center", desc: "H100, A100, Servers" },
  ];
  const architectureOptions = ["Transformer", "CNN", "RNN/LSTM", "Hybrid", "Diffusion", "Other"];

  return (
    <div className="page-container max-w-3xl mx-auto px-4">
      <div className="page-header">
        <div>
          <h1 className="page-title">Register AI Company & Model</h1>
          <p className="page-subtitle">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress-bar mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className={`progress-step ${i <= step ? 'progress-step-done' : ''}`}>
            <div className="progress-dot">{i < step ? <Check className="w-3 h-3" /> : i + 1}</div>
            <span className="progress-label">{s}</span>
          </div>
        ))}
      </div>

      {error && (
        <div className="error-banner">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /><span>{error}</span>
          <button onClick={() => setError("")} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* STEP 1: IDENTITY */}
      {step === 0 && (
        <div className="feature-card mb-6">
          <div className="flex items-center gap-3 mb-4"><Building2 className="w-5 h-5 text-accent" /><h2 className="section-title">Company Identity</h2></div>
          <div className="space-y-4">
            <div><label className="form-label">Company Name *</label><input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g., SwahiliMed AI" className="send-input" maxLength={40} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="form-label">Country</label><input type="text" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g., Kenya" className="send-input" /></div>
              <div><label className="form-label">Year Founded</label><input type="text" value={yearFounded} onChange={(e) => setYearFounded(e.target.value)} placeholder="e.g., 2025" className="send-input" /></div>
            </div>
            <div><label className="form-label">Website</label><input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="e.g., https://swahilimed.ai" className="send-input" /></div>
            <div><label className="form-label">Contact Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@company.com" className="send-input" /></div>
          </div>
        </div>
      )}

      {/* STEP 2: WALLET */}
      {step === 1 && (
        <div className="feature-card mb-6">
          <div className="flex items-center gap-3 mb-4"><Key className="w-5 h-5 text-accent" /><h2 className="section-title">Wallet & Identity</h2></div>
          <div className="space-y-4">
            <div>
              <label className="form-label">Primary Wallet Address</label>
              <div className="send-input opacity-75 cursor-not-allowed text-sm font-mono">{address}</div>
              <p className="text-xs text-muted mt-1">Auto-detected. This is your permanent on-chain identity.</p>
            </div>
            <div className="p-4 rounded-xl" style={{ backgroundColor: "rgba(108, 92, 231, 0.08)", border: "1px solid rgba(108, 92, 231, 0.2)" }}>
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "var(--color-neural-purple)" }} />
                <div>
                  <p className="text-sm font-medium text-white mb-1">How Identity Works</p>
                  <p className="text-xs text-muted">Your wallet address IS your identity. AI outputs are signed with your wallet's private key. Users verify the signature against this address. No passwords. No databases.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: MODEL SPECS */}
      {step === 2 && (
        <div className="feature-card mb-6">
          <div className="flex items-center gap-3 mb-4"><Layers className="w-5 h-5 text-accent" /><h2 className="section-title">Model Specifications</h2></div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="form-label">Model Name *</label><input type="text" value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder="e.g., SwahiliMed-v2" className="send-input" /></div>
              <div><label className="form-label">Architecture</label><select value={modelArchitecture} onChange={(e) => setModelArchitecture(e.target.value)} className="send-input"><option value="">Select...</option>{architectureOptions.map(a => <option key={a}>{a}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><label className="form-label">Parameters</label><input type="text" value={modelParameters} onChange={(e) => setModelParameters(e.target.value)} placeholder="e.g., 7B" className="send-input" /></div>
              <div><label className="form-label">VRAM Required (MB)</label><input type="number" value={minMemoryMB} onChange={(e) => setMinMemoryMB(e.target.value)} placeholder="1024" className="send-input" /></div>
              <div><label className="form-label">Speed (ms)</label><input type="text" value={inferenceSpeedMs} onChange={(e) => setInferenceSpeedMs(e.target.value)} placeholder="e.g., 200" className="send-input" /></div>
            </div>
            <div><label className="form-label">IPFS Hash (Model File)</label><input type="text" value={ipfsHash} onChange={(e) => setIpfsHash(e.target.value)} placeholder="Qm..." className="send-input font-mono text-xs" /><p className="text-xs text-muted mt-1">Upload model to IPFS and paste the content hash here.</p></div>
            
            {/* Hardware Tier Selection */}
            <div>
              <label className="form-label">Minimum Hardware Tier</label>
              <div className="grid grid-cols-3 gap-3 mt-2">
                {tierOptions.map((tier) => (
                  <button key={tier.value} onClick={() => setMinTier(tier.value)} className={`p-3 rounded-xl text-center transition-all ${
                    minTier === tier.value ? "border-2" : "border border-gray-700"
                  }`} style={{
                    backgroundColor: minTier === tier.value ? "rgba(0,212,170,0.08)" : "var(--color-tensor-dark)",
                    borderColor: minTier === tier.value ? "var(--color-node-teal)" : "var(--color-stable-gray)"
                  }}>
                    <HardDrive className="w-6 h-6 mx-auto mb-1 text-accent" />
                    <div className="text-xs font-semibold text-white">{tier.label}</div>
                    <div className="text-xs text-muted mt-0.5">{tier.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div><label className="form-label">Input Formats</label><div className="flex flex-wrap gap-2 mt-2">{formatOptions.map(f => (<button key={f} onClick={() => toggleArrayItem(inputFormats, setInputFormats, f)} className={inputFormats.includes(f) ? "filter-tag filter-tag-active" : "filter-tag"}>{f}</button>))}</div></div>
            <div><label className="form-label">Output Formats</label><div className="flex flex-wrap gap-2 mt-2">{formatOptions.map(f => (<button key={f} onClick={() => toggleArrayItem(outputFormats, setOutputFormats, f)} className={outputFormats.includes(f) ? "filter-tag filter-tag-active" : "filter-tag"}>{f}</button>))}</div></div>
          </div>
        </div>
      )}

      {/* STEP 4: CAPABILITIES */}
      {step === 3 && (
        <div className="feature-card mb-6">
          <div className="flex items-center gap-3 mb-4"><Globe className="w-5 h-5 text-accent" /><h2 className="section-title">Capabilities & Languages</h2></div>
          <div className="space-y-4">
            <div><label className="form-label">Description *</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your AI model in detail..." className="send-input" rows={3} maxLength={500} required /></div>
            <div><label className="form-label">Use Cases</label><div className="flex flex-wrap gap-2 mt-2">{useCaseOptions.map(u => (<button key={u} onClick={() => toggleArrayItem(useCases, setUseCases, u)} className={useCases.includes(u) ? "filter-tag filter-tag-active" : "filter-tag"}>{u}</button>))}</div></div>
            <div><label className="form-label">Supported Languages</label><div className="flex flex-wrap gap-2 mt-2">{languageOptions.map(l => (<button key={l} onClick={() => toggleArrayItem(languages, setLanguages, l)} className={languages.includes(l) ? "filter-tag filter-tag-active" : "filter-tag"}>{l}</button>))}</div></div>
            <div><label className="form-label">Available Regions</label><div className="flex flex-wrap gap-2 mt-2">{regionOptions.map(r => (<button key={r} onClick={() => toggleArrayItem(regions, setRegions, r)} className={regions.includes(r) ? "filter-tag filter-tag-active" : "filter-tag"}>{r}</button>))}</div></div>
          </div>
        </div>
      )}

      {/* STEP 5: PRICING */}
      {step === 4 && (
        <div className="feature-card mb-6">
          <div className="flex items-center gap-3 mb-4"><Zap className="w-5 h-5 text-accent" /><h2 className="section-title">Pricing & Agent Configuration</h2></div>
          <div className="space-y-4">
            <div><label className="form-label">Price per Request (AIC) *</label><input type="number" value={pricePerRequest} onChange={(e) => setPricePerRequest(e.target.value)} placeholder="0.01" step="0.001" min="0.001" max="100" className="send-input" required /></div>
            {pricePerRequest && Number(pricePerRequest) >= 0.001 && (
              <div className="p-3 rounded-lg" style={{ backgroundColor: "rgba(0, 212, 170, 0.05)", border: "1px solid rgba(0, 212, 170, 0.15)" }}>
                <p className="text-sm text-accent font-medium mb-1">Revenue per Request: {(Number(pricePerRequest) * 0.785).toFixed(4)} AIC (78.5%)</p>
                <p className="text-xs text-muted">Burned: {(Number(pricePerRequest) * 0.2).toFixed(4)} AIC (20%) | Treasury: {(Number(pricePerRequest) * 0.0034).toFixed(4)} AIC (0.34%)</p>
              </div>
            )}
            <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "var(--color-tensor-dark)" }}>
              <span className="text-white text-sm">Agent Compatible</span>
              <button onClick={() => setAgentCompatible(!agentCompatible)} className={agentCompatible ? "mining-toggle-on" : "mining-toggle-off"}><div className={`mining-toggle-dot ${agentCompatible ? 'mining-toggle-dot-on' : 'mining-toggle-dot-off'}`} /></button>
            </div>
            {agentCompatible && <div><label className="form-label">Max Concurrent Agents</label><input type="number" value={maxAgents} onChange={(e) => setMaxAgents(e.target.value)} placeholder="100" className="send-input" /></div>}
          </div>
        </div>
      )}

      {/* STEP 6: REVIEW */}
      {step === 5 && (
        <div className="feature-card mb-6">
          <div className="flex items-center gap-3 mb-4"><FileText className="w-5 h-5 text-accent" /><h2 className="section-title">Review Your Registration</h2></div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted">Company</span><span className="text-white font-medium">{companyName || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted">Country</span><span className="text-white">{country || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted">Wallet</span><span className="text-white font-mono">{address?.slice(0, 10)}...{address?.slice(-6)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Model</span><span className="text-white">{modelName || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted">Architecture</span><span className="text-white">{modelArchitecture || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted">Min Hardware</span><span className="text-accent">{tierOptions[minTier].label}</span></div>
            <div className="flex justify-between"><span className="text-muted">VRAM Required</span><span className="text-white">{minMemoryMB ? `${minMemoryMB} MB` : "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted">Use Cases</span><span className="text-white">{useCases.length > 0 ? useCases.join(", ") : "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted">Languages</span><span className="text-white">{languages.length > 0 ? languages.join(", ") : "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted">Price</span><span className="text-accent font-mono">{pricePerRequest || "—"} AIC</span></div>
            <div className="flex justify-between"><span className="text-muted">Agent</span><span className="text-white">{agentCompatible ? `Yes (max ${maxAgents || "unlimited"})` : "No"}</span></div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between gap-4">
        <button onClick={() => setStep(step - 1)} disabled={step === 0} className="btn-secondary flex items-center gap-2"><ChevronLeft className="w-4 h-4" /> Previous</button>
        {step < 5 ? (
          <button onClick={() => setStep(step + 1)} className="btn-primary flex items-center gap-2" style={{ width: "auto" }}>Next <ChevronRight className="w-4 h-4" /></button>
        ) : (
          <button onClick={handleSubmit} disabled={isRegistering} className="btn-primary flex items-center gap-2" style={{ width: "auto" }}>
            {isRegistering ? "Registering..." : <><Upload className="w-4 h-4" /> Submit Registration</>}
          </button>
        )}
      </div>
    </div>
  );
} 