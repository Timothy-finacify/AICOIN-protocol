"use client";

import { useAccount } from "wagmi";
import { useState } from "react";
import { 
  Building2, CheckCircle2, Shield, Globe, Upload, 
  AlertCircle, X, Loader2, Tag, Users, MessageSquare 
} from "lucide-react";
import { addCompany } from "@/lib/companyStore";

const CATEGORIES = ["Medical", "Education", "Legal", "Agriculture", "Finance", "General"];
const LANGUAGES = ["English", "Swahili", "French", "Hindi", "Arabic", "Bengali", "Tamil", "Telugu", "Spanish", "Portuguese"];

export default function RegisterPage() {
  const { address, isConnected } = useAccount();
  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [pricePerRequest, setPricePerRequest] = useState("");
  const [category, setCategory] = useState("General");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(["English"]);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  if (!isConnected) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="flex justify-center mb-6">
            <div className="auth-icon-circle"><Building2 className="auth-icon" /></div>
          </div>
          <h2 className="auth-title">Connect Your Wallet</h2>
          <p className="text-center mb-6 text-muted">Connect your wallet to register your AI company on AICOIN.</p>
        </div>
      </div>
    );
  }

  const toggleLanguage = (lang: string) => {
    if (selectedLanguages.includes(lang)) {
      if (selectedLanguages.length > 1) {
        setSelectedLanguages(selectedLanguages.filter(l => l !== lang));
      }
    } else {
      setSelectedLanguages([...selectedLanguages, lang]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!address || !companyName || !description || !pricePerRequest) {
      setError("All fields are required.");
      return;
    }
    
    const result = addCompany({
      name: companyName,
      description,
      price: Number(pricePerRequest),
      category,
      languages: selectedLanguages,
      walletAddress: address,
    });
    
    if (result.success) {
      setSubmitted(true);
    } else {
      setError(result.error || "Registration failed.");
    }
  };

  if (submitted) {
    return (
      <div className="page-container max-w-2xl mx-auto px-4">
        <div className="feature-card text-center py-12">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(0, 255, 136, 0.1)" }}>
              <CheckCircle2 className="w-10 h-10 text-success" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Company Registered</h2>
          <p className="text-muted mb-1">{companyName}</p>
          <p className="text-xs text-accent mb-2">{category} • {selectedLanguages.join(", ")}</p>
          <p className="text-sm text-muted mb-2">Price: {pricePerRequest} AIC per request</p>
          <p className="text-xs text-muted mb-6">Wallet: {address?.slice(0, 6)}...{address?.slice(-4)}</p>
          <button onClick={() => { setSubmitted(false); setCompanyName(""); setDescription(""); setPricePerRequest(""); setCategory("General"); setSelectedLanguages(["English"]); }} className="btn-secondary">
            Register Another Company
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container max-w-2xl mx-auto px-4">
      <div className="page-header">
        <div>
          <h1 className="page-title">Register AI Company</h1>
          <p className="page-subtitle">List your AI services on the AICOIN marketplace</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <div className="error-banner">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError("")} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Company Information */}
        <div className="feature-card mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Building2 className="w-5 h-5 text-accent" />
            <h2 className="section-title">Company Information</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="form-label">Company Name</label>
              <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} 
                placeholder="e.g., SwahiliMed AI, FarmSense Africa" 
                className="send-input" maxLength={40} required />
              <p className="text-xs text-muted mt-1">Unique name. Impersonation of established brands is blocked.</p>
            </div>

            <div>
              <label className="form-label">Wallet Address (Your Identity)</label>
              <div className="send-input opacity-75 cursor-not-allowed text-sm font-mono truncate">{address}</div>
              <p className="text-xs text-muted mt-1">This wallet signs your AI outputs. No separate key needed.</p>
            </div>

            <div>
              <label className="form-label">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} 
                placeholder="Describe your AI model, its capabilities, accuracy, and what problems it solves..." 
                className="send-input" rows={4} maxLength={500} required />
              <p className="text-xs text-muted mt-1">{description.length}/500 characters</p>
            </div>
          </div>
        </div>

        {/* Category */}
        <div className="feature-card mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Tag className="w-5 h-5 text-accent" />
            <h2 className="section-title">Category</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button key={cat} type="button"
                onClick={() => setCategory(cat)}
                className={category === cat ? "filter-tag filter-tag-active" : "filter-tag"}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Languages */}
        <div className="feature-card mb-6">
          <div className="flex items-center gap-3 mb-4">
            <MessageSquare className="w-5 h-5 text-accent" />
            <h2 className="section-title">Supported Languages</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((lang) => (
              <button key={lang} type="button"
                onClick={() => toggleLanguage(lang)}
                className={selectedLanguages.includes(lang) ? "filter-tag filter-tag-active" : "filter-tag"}>
                {lang}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted mt-2">Select all languages your AI model supports</p>
        </div>

        {/* Pricing */}
        <div className="feature-card mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-5 h-5 text-accent" />
            <h2 className="section-title">Pricing</h2>
          </div>
          <div>
            <label className="form-label">Price per Request (AIC)</label>
            <input type="number" value={pricePerRequest} onChange={(e) => setPricePerRequest(e.target.value)} 
              placeholder="0.01" step="0.001" min="0.001" max="100" className="send-input" required />
            <p className="text-xs text-muted mt-1">Min: 0.001 AIC • Max: 100 AIC • You earn 78.5% per request</p>
            {pricePerRequest && Number(pricePerRequest) >= 0.001 && (
              <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: "rgba(0, 212, 170, 0.05)", border: "1px solid rgba(0, 212, 170, 0.15)" }}>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div><span className="text-success font-semibold">78.5% You</span><div className="text-white font-mono mt-0.5">{(Number(pricePerRequest) * 0.785).toFixed(4)} AIC</div></div>
                  <div><span className="text-danger font-semibold">20% Burned</span><div className="text-white font-mono mt-0.5">{(Number(pricePerRequest) * 0.2).toFixed(4)} AIC</div></div>
                  <div><span className="text-blue font-semibold">0.34% Treasury</span><div className="text-white font-mono mt-0.5">{(Number(pricePerRequest) * 0.0034).toFixed(4)} AIC</div></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Anti-Impersonation */}
        <div className="p-4 rounded-xl mb-6 flex items-start gap-3"
             style={{ backgroundColor: "rgba(108, 92, 231, 0.08)", border: "1px solid rgba(108, 92, 231, 0.2)" }}>
          <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "var(--color-neural-purple)" }} />
          <div>
            <p className="text-sm font-medium text-white mb-1">Registration Policy</p>
            <p className="text-xs text-muted">
              Unique names only. Impersonating established brands is blocked. Your wallet proves your identity.
              All registrations are public on the AICOIN marketplace.
            </p>
          </div>
        </div>

        <button type="submit" className="btn-primary flex items-center justify-center gap-2">
          <Upload className="w-4 h-4" />
          <span>Register Company</span>
        </button>
      </form>
    </div>
  );
}