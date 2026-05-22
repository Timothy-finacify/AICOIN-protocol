"use client";

import { useAccount } from "wagmi";
import { useState } from "react";
import { 
  Search, 
  Star,
  CheckCircle2,
  AlertCircle,
  Globe,
  Zap,
  Send,
  X,
  Loader2,
  MessageSquare,
  Hash
} from "lucide-react";
import { getCompanies, getCategories, AICompany } from "@/lib/companyStore";
import { useRoutePayment } from "@/hooks/useContracts";

// Token counter helper
const countTokens = (text: string): number => {
  if (!text.trim()) return 0;
  return text.split(/\s+/).filter(w => w.length > 0).length;
};

export default function MarketplacePage() {
  const { isConnected } = useAccount();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState<"reputation" | "price">("reputation");
  const { pay, hash: payHash, isPending: isPaying, isSuccess: paySuccess } = useRoutePayment();
  const [selectedCompany, setSelectedCompany] = useState<AICompany | null>(null);
  const [userPrompt, setUserPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiResponse, setAiResponse] = useState("");

  const companies = getCompanies();
  const categories = getCategories();

  const filteredCompanies = companies
    .filter((company) => {
      const matchesSearch = company.name.toLowerCase().includes(search.toLowerCase()) ||
        company.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === "All" || company.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === "reputation") return b.reputation - a.reputation;
      if (sortBy === "price") return a.price - b.price;
      return 0;
    });

  const handleUseAI = (company: AICompany) => {
    setSelectedCompany(company);
    setUserPrompt("");
    setAiResponse("");
  };

  const handleSubmitRequest = async () => {
    if (!userPrompt.trim() || !selectedCompany) return;
    setIsProcessing(true);
    
    const tokens = countTokens(userPrompt);
    const totalCost = tokens * selectedCompany.price;
    const burnAmount = totalCost * 0.2;
    const treasuryAmount = totalCost * 0.011;
    const validatorAmount = totalCost * 0.004;
    const companyAmount = totalCost * 0.785;
    
    setAiResponse(
      `Request sent to AICOIN network.\n\n` +
      `Tokens: ${tokens}\n` +
      `Total cost: ${totalCost.toFixed(4)} AIC\n` +
      `Company earns: ${companyAmount.toFixed(4)} AIC (78.5%)\n` +
      `Burned forever: ${burnAmount.toFixed(4)} AIC (20%)\n` +
      `Treasury: ${treasuryAmount.toFixed(4)} AIC (1.1%)\n` +
      `Validator: ${validatorAmount.toFixed(4)} AIC (0.4%)\n\n` +
      `Waiting for miner to process...`
    );
    setIsProcessing(false);
  };

  return (
    <div className="page-container max-w-6xl mx-auto px-4">
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Marketplace</h1>
          <p className="page-subtitle">Browse and use AI services — pay per token, not per request</p>
        </div>
      </div>

      <div className="marketplace-controls">
        <div className="search-wrapper">
          <Search className="w-4 h-4 search-icon" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search AI companies..." className="search-input-full" />
        </div>
        <div className="filter-bar">
          {categories.map((category) => (
            <button key={category} onClick={() => setSelectedCategory(category)} className={selectedCategory === category ? "filter-tag filter-tag-active" : "filter-tag"}>{category}</button>
          ))}
        </div>
        <div className="sort-bar">
          <span className="text-xs text-muted">Sort by:</span>
          <button onClick={() => setSortBy("reputation")} className={sortBy === "reputation" ? "sort-btn sort-btn-active" : "sort-btn"}><Star className="w-3 h-3" />Reputation</button>
          <button onClick={() => setSortBy("price")} className={sortBy === "price" ? "sort-btn sort-btn-active" : "sort-btn"}>Price</button>
        </div>
      </div>

      <div className="company-grid">
        {filteredCompanies.map((company) => (
          <div key={company.id} className="company-card">
            <div className="company-card-header">
              <div>
                <h3 className="company-name">{company.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  {company.verified ? (
                    <span className="company-badge-verified"><CheckCircle2 className="w-3 h-3" />Verified</span>
                  ) : (
                    <span className="company-badge-unverified"><AlertCircle className="w-3 h-3" />Unverified</span>
                  )}
                </div>
              </div>
              <div className="company-reputation-badge"><Star className="w-3 h-3" /><span>{company.reputation}</span></div>
            </div>
            <p className="company-description">{company.description}</p>
            <div className="company-languages">
              <Globe className="w-3 h-3" />
              {company.languages.map((lang) => (<span key={lang} className="language-tag">{lang}</span>))}
            </div>
            <div className="company-stats-single">
              <div className="company-stat">
                <span className="company-stat-label">Price per Token</span>
                <span className="company-stat-value price">{company.price} AIC</span>
              </div>
            </div>
            <button className="company-use-btn" onClick={() => handleUseAI(company)}>
              <Zap className="w-4 h-4" /><span>Use This AI</span>
            </button>
          </div>
        ))}
      </div>

      {filteredCompanies.length === 0 && (
        <div className="feature-card text-center py-16">
          <Search className="w-12 h-12 mx-auto mb-4 text-muted" />
          <h3 className="text-lg font-semibold text-white mb-2">No companies found</h3>
          <p className="text-muted">Try adjusting your search or filters</p>
        </div>
      )}

      {selectedCompany && (
        <div className="modal-overlay" onClick={() => setSelectedCompany(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">{selectedCompany.name}</h2>
                <p className="text-xs text-muted">
                  {selectedCompany.price} AIC per token • {selectedCompany.verified ? "Verified" : "Unverified"}
                </p>
              </div>
              <button onClick={() => setSelectedCompany(null)} className="wallet-dropdown-close"><X className="w-4 h-4" /></button>
            </div>
            <div className="modal-body">
              <label className="form-label">Your AI Request</label>
              <textarea 
                value={userPrompt} 
                onChange={(e) => setUserPrompt(e.target.value)} 
                placeholder="Type your question or prompt here... cost updates in real-time as you type" 
                className="send-input" 
                rows={4} 
                disabled={isProcessing || isPaying} 
              />
              
              {/* Real-time Token Counter */}
              {userPrompt && (
                <div className="mt-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Hash className="w-3 h-3 text-accent" />
                    <span className="text-muted">
                      Tokens: <span className="text-white font-mono">{countTokens(userPrompt)}</span>
                    </span>
                  </div>
                  <span className="text-accent font-mono font-semibold">
                    Cost: {(countTokens(userPrompt) * selectedCompany.price).toFixed(4)} AIC
                  </span>
                </div>
              )}

              {/* Cost Breakdown */}
              {userPrompt && (
                <div className="cost-display mt-3">
                  <div className="cost-row">
                    <span className="text-muted text-sm">Tokens detected</span>
                    <span className="text-white font-mono text-sm">{countTokens(userPrompt)}</span>
                  </div>
                  <div className="cost-row">
                    <span className="text-muted text-sm">Price per token</span>
                    <span className="text-white font-mono text-sm">{selectedCompany.price} AIC</span>
                  </div>
                  <div className="cost-row">
                    <span className="text-muted text-sm">Total cost</span>
                    <span className="text-accent font-mono text-sm font-semibold">
                      {(countTokens(userPrompt) * selectedCompany.price).toFixed(4)} AIC
                    </span>
                  </div>
                  <div className="cost-row">
                    <span className="text-muted text-sm">Company earns (78.5%)</span>
                    <span className="text-success font-mono text-sm">
                      {(countTokens(userPrompt) * selectedCompany.price * 0.785).toFixed(4)} AIC
                    </span>
                  </div>
                  <div className="cost-row">
                    <span className="text-muted text-sm">Burned forever (20%)</span>
                    <span className="text-danger font-mono text-sm">
                      {(countTokens(userPrompt) * selectedCompany.price * 0.2).toFixed(4)} AIC
                    </span>
                  </div>
                  <div className="cost-row">
                    <span className="text-muted text-sm">Treasury (1.1%)</span>
                    <span className="text-blue font-mono text-sm">
                      {(countTokens(userPrompt) * selectedCompany.price * 0.011).toFixed(6)} AIC
                    </span>
                  </div>
                  <div className="cost-row">
                    <span className="text-muted text-sm">Validator (0.4%)</span>
                    <span className="text-purple font-mono text-sm">
                      {(countTokens(userPrompt) * selectedCompany.price * 0.004).toFixed(6)} AIC
                    </span>
                  </div>
                </div>
              )}

              {/* AI Response */}
              {aiResponse && (
                <div className="ai-response mt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-accent" />
                    <span className="text-sm font-semibold text-white">Request Summary</span>
                  </div>
                  <pre className="text-sm text-white leading-relaxed whitespace-pre-wrap font-sans">{aiResponse}</pre>
                </div>
              )}
            </div>
            <div className="modal-footer">
              {!aiResponse ? (
                <button 
                  onClick={handleSubmitRequest} 
                  disabled={!userPrompt.trim() || isProcessing || isPaying} 
                  className="send-btn flex items-center justify-center gap-2"
                >
                  {isPaying ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /><span>Confirm in MetaMask...</span></>
                  ) : isProcessing ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /><span>Processing...</span></>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>
                        Pay {(countTokens(userPrompt) * selectedCompany.price).toFixed(4)} AIC & Send
                      </span>
                    </>
                  )}
                </button>
              ) : (
                <button onClick={() => { setSelectedCompany(null); setAiResponse(""); setUserPrompt(""); }} className="send-btn">Done</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 