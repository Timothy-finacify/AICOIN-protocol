"use client";

import { useAccount } from "wagmi";
import { useState } from "react";
import { 
  Building2, 
  Upload, 
  CheckCircle2, 
  Shield,
  Key,
  Globe
} from "lucide-react";

export default function RegisterPage() {
  const { isConnected } = useAccount();
  const [companyName, setCompanyName] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [description, setDescription] = useState("");
  const [pricePerRequest, setPricePerRequest] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!isConnected) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="flex justify-center mb-6">
            <div className="auth-icon-circle">
              <Building2 className="auth-icon" />
            </div>
          </div>
          <h2 className="auth-title">Connect Your Wallet</h2>
          <p className="text-center mb-6 text-muted">
            Connect your wallet to register your AI company on AICOIN.
          </p>
          <div className="flex justify-center">
            <div className="auth-connect-hint">
              <span>Use the Connect button in the navigation bar</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="page-container max-w-2xl mx-auto px-4">
        <div className="feature-card text-center py-12">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full flex items-center justify-center"
                 style={{ backgroundColor: "rgba(0, 255, 136, 0.1)" }}>
              <CheckCircle2 className="w-10 h-10 text-success" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Registration Submitted</h2>
          <p className="text-muted mb-6">
            Your AI company has been registered on AICOIN. Verification may take 24-48 hours.
          </p>
          <button onClick={() => setSubmitted(false)} className="btn-secondary">
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
        {/* Company Name */}
        <div className="feature-card mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Building2 className="w-5 h-5 text-accent" />
            <h2 className="section-title">Company Information</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="form-label">Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g., OpenAI, Google DeepMind, SwahiliMed AI"
                className="send-input"
                required
              />
            </div>
            <div>
              <label className="form-label">Public Key</label>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-4 top-1/2 transform -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  value={publicKey}
                  onChange={(e) => setPublicKey(e.target.value)}
                  placeholder="0x..."
                  className="send-input pl-11"
                  required
                />
              </div>
              <p className="text-xs text-muted mt-1">
                Your cryptographic public key for signing AI outputs
              </p>
            </div>
            <div>
              <label className="form-label">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your AI model, its capabilities, and supported languages..."
                className="send-input"
                rows={4}
                required
              />
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="feature-card mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-5 h-5 text-accent" />
            <h2 className="section-title">Pricing & Availability</h2>
          </div>
          
          <div>
            <label className="form-label">Price per Request (AIC)</label>
            <input
              type="number"
              value={pricePerRequest}
              onChange={(e) => setPricePerRequest(e.target.value)}
              placeholder="0.01"
              step="0.001"
              className="send-input"
              required
            />
            <p className="text-xs text-muted mt-1">
              You earn 78.5% of this amount per request. 20% is burned. 1.5% goes to protocol treasury.
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div className="p-4 rounded-xl mb-6 flex items-start gap-3"
             style={{ backgroundColor: "rgba(108, 92, 231, 0.08)", border: "1px solid rgba(108, 92, 231, 0.2)" }}>
          <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "var(--color-neural-purple)" }} />
          <div>
            <p className="text-sm font-medium text-white mb-1">Verification Required</p>
            <p className="text-xs text-muted">
              All AI companies undergo verification to ensure output authenticity. 
              Your public key will be used to cryptographically sign all AI responses.
            </p>
          </div>
        </div>

        {/* Submit */}
        <button type="submit" className="btn-primary">
          <Upload className="w-4 h-4" />
          <span>Register Company</span>
        </button>
      </form>
    </div>
  );
}