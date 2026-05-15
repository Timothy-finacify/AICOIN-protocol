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
  MessageSquare
} from "lucide-react";
import { getCompanies, getCategories, AICompany } from "@/lib/companyStore";
import { useRoutePayment } from "@/hooks/useContracts";
import { parseUnits } from "viem";

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
    const amountInNano = parseUnits(selectedCompany.price.toString(), 9);
    pay(selectedCompany.walletAddress, amountInNano);
    setTimeout(() => {
      const mockResponses: Record<string, string> = {
        "SwahiliMed AI": "Based on the symptoms described, the likely diagnosis is seasonal malaria. Recommended treatment: Artemether-Lumefantrine.",
        "FarmSense Africa": "The leaf pattern indicates early-stage maize rust. Apply fungicide within 48 hours.",
        "LegalMind India": "Under Section 420 of the IPC, this constitutes cheating. Limitation period: 3 years.",
        "EduTutor AI": "Let me break this down step by step. First, isolate the variable. The answer is x = 4.",
      };
      setAiResponse(mockResponses[selectedCompany.name] || "Your request has been processed and paid via AICOIN PaymentRouter.");
      setIsProcessing(false);
    }, 2000);
  };

  return (
    <div className="page-container max-w-6xl mx-auto px-4">
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Marketplace</h1>
          <p className="page-subtitle">Browse and use AI services from registered companies worldwide</p>
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
                <span className="company-stat-label">Price per Request</span>
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
                <p className="text-xs text-muted">{selectedCompany.price} AIC per request • {selectedCompany.verified ? "Verified" : "Unverified"}</p>
              </div>
              <button onClick={() => setSelectedCompany(null)} className="wallet-dropdown-close"><X className="w-4 h-4" /></button>
            </div>
            <div className="modal-body">
              <label className="form-label">Your AI Request</label>
              <textarea value={userPrompt} onChange={(e) => setUserPrompt(e.target.value)} placeholder="Type your question or prompt here..." className="send-input" rows={4} disabled={isProcessing || isPaying} />
              {userPrompt && (
                <div className="cost-display">
                  <div className="cost-row"><span className="text-muted text-sm">Cost:</span><span className="text-white font-mono text-sm">{selectedCompany.price} AIC</span></div>
                  <div className="cost-row"><span className="text-muted text-sm">Burned (20%):</span><span className="text-danger font-mono text-sm">{(selectedCompany.price * 0.2).toFixed(4)} AIC</span></div>
                  <div className="cost-row"><span className="text-muted text-sm">Treasury (0.34%):</span><span className="text-blue font-mono text-sm">{(selectedCompany.price * 0.0034).toFixed(4)} AIC</span></div>
                </div>
              )}
              {aiResponse && (
                <div className="ai-response">
                  <div className="flex items-center gap-2 mb-2"><MessageSquare className="w-4 h-4 text-accent" /><span className="text-sm font-semibold text-white">Response from {selectedCompany.name}</span></div>
                  <p className="text-sm text-white leading-relaxed">{aiResponse}</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              {!aiResponse ? (
                <button onClick={handleSubmitRequest} disabled={!userPrompt.trim() || isProcessing || isPaying} className="send-btn flex items-center justify-center gap-2">
                  {isPaying ? (<><Loader2 className="w-4 h-4 animate-spin" /><span>Confirm in MetaMask...</span></>) :
                   isProcessing ? (<><Loader2 className="w-4 h-4 animate-spin" /><span>Processing...</span></>) :
                   (<><Send className="w-4 h-4" /><span>Pay {selectedCompany.price} AIC & Send</span></>)}
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