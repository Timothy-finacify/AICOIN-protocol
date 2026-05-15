"use client";

import { useAccount } from "wagmi";
import { useState } from "react";
import { 
  Search, 
  Shield, 
  Star,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Globe,
  Zap
} from "lucide-react";

interface AICompany {
  id: string;
  name: string;
  description: string;
  price: number;
  verified: boolean;
  reputation: number;
  totalEarned: number;
  category: string;
  languages: string[];
  requestsServed: number;
}

const mockCompanies: AICompany[] = [
  {
    id: "1",
    name: "SwahiliMed AI",
    description: "Medical diagnosis assistant trained on East African health data. Supports Swahili and English.",
    price: 0.01,
    verified: true,
    reputation: 142,
    totalEarned: 1250000,
    category: "Medical",
    languages: ["Swahili", "English"],
    requestsServed: 125000,
  },
  {
    id: "2",
    name: "Google DeepMind",
    description: "Advanced reasoning and problem-solving AI. State-of-the-art performance on complex tasks.",
    price: 0.05,
    verified: true,
    reputation: 890,
    totalEarned: 50000000,
    category: "General",
    languages: ["English", "Spanish", "French", "German", "Chinese", "Japanese"],
    requestsServed: 1000000,
  },
  {
    id: "3",
    name: "BengaliTutor AI",
    description: "Personalized education assistant for Bengali-speaking students. Covers math, science, and language arts.",
    price: 0.008,
    verified: true,
    reputation: 67,
    totalEarned: 320000,
    category: "Education",
    languages: ["Bengali", "English"],
    requestsServed: 40000,
  },
  {
    id: "4",
    name: "AgriSense Africa",
    description: "Crop disease detection and farming optimization for African agriculture. Works offline.",
    price: 0.005,
    verified: false,
    reputation: 28,
    totalEarned: 85000,
    category: "Agriculture",
    languages: ["Swahili", "English", "French"],
    requestsServed: 17000,
  },
  {
    id: "5",
    name: "LegalMind India",
    description: "Indian legal document analyzer and case law researcher. Covers IPC, CrPC, and constitutional law.",
    price: 0.015,
    verified: true,
    reputation: 95,
    totalEarned: 780000,
    category: "Legal",
    languages: ["Hindi", "English", "Tamil", "Telugu"],
    requestsServed: 52000,
  },
  {
    id: "6",
    name: "QuickChat AI",
    description: "Fast, lightweight chatbot for casual conversation and simple queries. Optimized for low-resource devices.",
    price: 0.001,
    verified: false,
    reputation: 12,
    totalEarned: 12000,
    category: "General",
    languages: ["English"],
    requestsServed: 12000,
  },
];

const categories = ["All", "Medical", "Education", "Agriculture", "Legal", "General"];

export default function MarketplacePage() {
  const { isConnected } = useAccount();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState<"reputation" | "price" | "requests">("reputation");

  const filteredCompanies = mockCompanies
    .filter((company) => {
      const matchesSearch = company.name.toLowerCase().includes(search.toLowerCase()) ||
        company.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === "All" || company.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === "reputation") return b.reputation - a.reputation;
      if (sortBy === "price") return a.price - b.price;
      if (sortBy === "requests") return b.requestsServed - a.requestsServed;
      return 0;
    });

  return (
    <div className="page-container max-w-6xl mx-auto px-4">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Marketplace</h1>
          <p className="page-subtitle">Browse and use AI services from registered companies worldwide</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="marketplace-controls">
        <div className="search-wrapper">
          <Search className="w-4 h-4 search-icon" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search AI companies..."
            className="search-input-full"
          />
        </div>

        <div className="filter-bar">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={selectedCategory === category ? "filter-tag filter-tag-active" : "filter-tag"}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="sort-bar">
          <span className="text-xs text-muted">Sort by:</span>
          <button
            onClick={() => setSortBy("reputation")}
            className={sortBy === "reputation" ? "sort-btn sort-btn-active" : "sort-btn"}
          >
            <Star className="w-3 h-3" />
            Reputation
          </button>
          <button
            onClick={() => setSortBy("price")}
            className={sortBy === "price" ? "sort-btn sort-btn-active" : "sort-btn"}
          >
            Price
          </button>
          <button
            onClick={() => setSortBy("requests")}
            className={sortBy === "requests" ? "sort-btn sort-btn-active" : "sort-btn"}
          >
            <TrendingUp className="w-3 h-3" />
            Most Used
          </button>
        </div>
      </div>

      {/* Company Grid */}
      <div className="company-grid">
        {filteredCompanies.map((company) => (
          <div key={company.id} className="company-card">
            {/* Header */}
            <div className="company-card-header">
              <div>
                <h3 className="company-name">{company.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  {company.verified ? (
                    <span className="company-badge-verified">
                      <CheckCircle2 className="w-3 h-3" />
                      Verified
                    </span>
                  ) : (
                    <span className="company-badge-unverified">
                      <AlertCircle className="w-3 h-3" />
                      Unverified
                    </span>
                  )}
                </div>
              </div>
              <div className="company-reputation-badge">
                <Star className="w-3 h-3" />
                <span>{company.reputation}</span>
              </div>
            </div>

            {/* Description */}
            <p className="company-description">{company.description}</p>

            {/* Languages */}
            <div className="company-languages">
              <Globe className="w-3 h-3" />
              {company.languages.map((lang) => (
                <span key={lang} className="language-tag">{lang}</span>
              ))}
            </div>

            {/* Stats */}
            <div className="company-stats">
              <div className="company-stat">
                <span className="company-stat-label">Price</span>
                <span className="company-stat-value price">{company.price} AIC</span>
              </div>
              <div className="company-stat">
                <span className="company-stat-label">Served</span>
                <span className="company-stat-value">{company.requestsServed.toLocaleString()}</span>
              </div>
              <div className="company-stat">
                <span className="company-stat-label">Earned</span>
                <span className="company-stat-value earned">{company.totalEarned.toLocaleString()} AIC</span>
              </div>
            </div>

            {/* Action Button */}
            <button className="company-use-btn">
              <Zap className="w-4 h-4" />
              <span>Use This AI</span>
            </button>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredCompanies.length === 0 && (
        <div className="feature-card text-center py-16">
          <Search className="w-12 h-12 mx-auto mb-4 text-muted" />
          <h3 className="text-lg font-semibold text-white mb-2">No companies found</h3>
          <p className="text-muted">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}