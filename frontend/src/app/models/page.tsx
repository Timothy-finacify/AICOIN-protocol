// src/app/models/page.tsx

"use client";

import { useAccount } from "wagmi";
import { useState, useEffect } from "react";
import { Bot, Search, Zap, Star, TrendingUp, ArrowRight, Globe, Play, Image, Music, Video, Code, MessageSquare } from "lucide-react";
import { useModelCount } from "@/hooks/useAICOIN";
import styles from "./page.module.css";

const CATEGORIES = [
  { name: "All", icon: Bot },
  { name: "Text", icon: MessageSquare },
  { name: "Code", icon: Code },
  { name: "Image", icon: Image },
  { name: "Audio", icon: Music },
  { name: "Video", icon: Video },
  { name: "Multimodal", icon: Play },
  { name: "Reasoning", icon: Zap },
  { name: "Agentic", icon: Globe },
];

const CATEGORY_NAMES = ["Text", "Code", "Image", "Audio", "Video", "Multimodal", "Reasoning", "Agentic"];
const CATEGORY_ICONS: Record<string, any> = {
  Text: MessageSquare, Code: Code, Image: Image, Audio: Music,
  Video: Video, Multimodal: Play, Reasoning: Zap, Agentic: Globe,
};

const SEED_MODELS = [
  { id: "meta-llama/llama-4-scout-17b-16e-instruct", name: "Llama 4 Scout", version: "17B", category: "Text", company: "Meta", inputPrice: "$0.10", outputPrice: "$0.20", requests: 5000, uptime: "99.9%", verified: true, description: "Fast general-purpose language model" },
  { id: "qwen/qwen3-32b", name: "Qwen 3", version: "32B", category: "Reasoning", company: "Alibaba", inputPrice: "$0.30", outputPrice: "$0.60", requests: 3200, uptime: "99.7%", verified: true, description: "Advanced reasoning and logic" },
  { id: "openai/gpt-oss-120b", name: "GPT-OSS", version: "120B", category: "Text", company: "OpenAI", inputPrice: "$0.70", outputPrice: "$1.40", requests: 12000, uptime: "99.9%", verified: true, description: "Massive general-purpose model" },
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3", version: "70B", category: "Multimodal", company: "Meta", inputPrice: "$0.59", outputPrice: "$1.18", requests: 8000, uptime: "99.8%", verified: true, description: "Text, image, and audio understanding" },
  { id: "stable-diffusion-xl", name: "Stable Diffusion XL", version: "1.0", category: "Image", company: "Stability AI", inputPrice: "$5.00", outputPrice: "$10.00", requests: 800, uptime: "99.5%", verified: true, description: "High-quality image generation" },
  { id: "whisper-large-v3", name: "Whisper Large", version: "v3", category: "Audio", company: "OpenAI", inputPrice: "$0.10", outputPrice: "$0.40", requests: 2400, uptime: "99.8%", verified: true, description: "Speech-to-text transcription" },
  { id: "runway-gen3", name: "Runway Gen-3", version: "1.0", category: "Video", company: "Runway", inputPrice: "$20.00", outputPrice: "$50.00", requests: 300, uptime: "99.2%", verified: true, description: "AI video generation from text" },
  { id: "codellama-70b", name: "CodeLlama", version: "70B", category: "Code", company: "Meta", inputPrice: "$0.25", outputPrice: "$0.50", requests: 1800, uptime: "99.6%", verified: true, description: "Code generation and debugging" },
];

interface ModelData {
  id: string;
  name: string;
  version: string;
  category: string;
  company: string;
  inputPrice: string;
  outputPrice: string;
  requests: number;
  uptime: string;
  verified: boolean;
  description: string;
  onChain: boolean;
}

export default function ModelsPage() {
  const { isConnected } = useAccount();
  const { data: modelCount } = useModelCount();
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState<"requests" | "price">("requests");
  const [allModels, setAllModels] = useState<ModelData[]>([]);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const fetchOnChain = async () => {
      const onChainModels: ModelData[] = [];
      const count = modelCount ? Number(modelCount) : 0;
      for (let i = 0; i < count; i++) {
        try {
          const res = await fetch("https://eth-sepolia.g.alchemy.com/v2/z0OM_42vihFYL5R31VT9m", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0", method: "eth_call", params: [{
                to: "0x021aa2761aD177b97e311775d219615F2A4aC3cc",
                data: "0x9e3ce413" + i.toString(16).padStart(64, "0")
              }, "latest"], id: i + 1
            })
          });
          const data = await res.json();
          if (data.result && data.result !== "0x") {
            const hex = data.result.slice(2);
            const nameLen = parseInt(hex.slice(128, 192), 16);
            const nameHex = hex.slice(192, 192 + nameLen * 2);
            let name = "";
            for (let j = 0; j < nameHex.length; j += 2) name += String.fromCharCode(parseInt(nameHex.slice(j, j + 2), 16));
            const cat = parseInt(hex.slice(640, 704), 16);
            const inputP = parseInt(hex.slice(768, 832), 16) / 1e6;
            const outputP = parseInt(hex.slice(832, 896), 16) / 1e6;
            const status = parseInt(hex.slice(1536, 1600), 16);
            onChainModels.push({
              id: "0x" + i.toString(16).padStart(64, "0"),
              name, version: "1.0.0",
              category: CATEGORY_NAMES[cat] || "Text",
              company: "On-Chain",
              inputPrice: `$${inputP.toFixed(2)}`,
              outputPrice: `$${outputP.toFixed(2)}`,
              requests: 0, uptime: "100%", verified: true,
              description: "On-chain registered model",
              onChain: true,
            });
          }
        } catch {}
      }
      setAllModels([...onChainModels, ...SEED_MODELS]);
    };
    if (mounted) fetchOnChain();
  }, [modelCount, mounted]);

  if (!mounted) return <div className={styles.container}><h1 className={styles.pageTitle}>AI Models</h1></div>;

  const onChainCount = modelCount ? Number(modelCount) : 0;

  const filtered = allModels
    .filter(m => {
      if (selectedCategory !== "All" && m.category !== selectedCategory) return false;
      if (search && !m.name.toLowerCase().includes(search.toLowerCase()) && !m.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => sortBy === "requests" ? b.requests - a.requests : a.inputPrice.localeCompare(b.inputPrice));

  const handleUseModel = (model: ModelData) => {
    const categoryMap: Record<string, string> = {
      Text: "text", Code: "code", Image: "image", Audio: "audio",
      Video: "video", Multimodal: "text", Reasoning: "text", Agentic: "text",
    };
    const tab = categoryMap[model.category] || "text";
    window.location.href = `/chat?model=${encodeURIComponent(model.id)}&tab=${tab}&name=${encodeURIComponent(model.name)}`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <div>
          <h1 className={styles.pageTitle}>AI Model Marketplace</h1>
          <p className={styles.subtitle}>
            {onChainCount} on-chain + {SEED_MODELS.length} available models. Pay per token. Zero gas.
          </p>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search models by name or description..." className={styles.searchInput} />
        </div>
        <div className={styles.sortBtns}>
          <button onClick={() => setSortBy("requests")} className={`${styles.sortBtn} ${sortBy === "requests" ? styles.sortActive : ""}`}>
            <TrendingUp size={14} /> Popular
          </button>
          <button onClick={() => setSortBy("price")} className={`${styles.sortBtn} ${sortBy === "price" ? styles.sortActive : ""}`}>
            <Zap size={14} /> Cheapest
          </button>
        </div>
      </div>

      <div className={styles.categoryBar}>
        {CATEGORIES.map(({ name, icon: Icon }) => (
          <button key={name} onClick={() => setSelectedCategory(name)} className={`${styles.catBtn} ${selectedCategory === name ? styles.catActive : ""}`}>
            <Icon size={14} /> {name}
          </button>
        ))}
      </div>

      <div className={styles.modelGrid}>
        {filtered.map((model, i) => {
          const CatIcon = CATEGORY_ICONS[model.category] || Bot;
          return (
            <div key={model.id + i} className={styles.modelCard}>
              <div className={styles.modelHeader}>
                <div className={styles.modelIcon}>
                  <CatIcon size={24} style={{ color: "#FFB800" }} />
                </div>
                <div className={styles.modelInfo}>
                  <div className={styles.modelName}>
                    {model.name}
                    {model.verified && <Star size={12} style={{ color: "#FFB800", marginLeft: "6px", fill: "#FFB800" }} />}
                    {model.onChain && <span className={styles.onChainBadge}>ON-CHAIN</span>}
                  </div>
                  <div className={styles.modelCompany}>{model.company} · v{model.version}</div>
                </div>
                <div className={styles.modelCategory}>{model.category}</div>
              </div>

              <p className={styles.modelDesc}>{model.description}</p>

              <div className={styles.modelPricing}>
                <div className={styles.priceRow}>
                  <span className={styles.priceLabel}>Input / 1M tokens</span>
                  <span className={styles.priceValue}>{model.inputPrice}</span>
                </div>
                <div className={styles.priceRow}>
                  <span className={styles.priceLabel}>Output / 1M tokens</span>
                  <span className={styles.priceValue}>{model.outputPrice}</span>
                </div>
              </div>

              <div className={styles.modelStats}>
                <div className={styles.modelStat}><TrendingUp size={12} /><span>{model.requests.toLocaleString()} requests</span></div>
                <div className={styles.modelStat}><Globe size={12} /><span>{model.uptime} uptime</span></div>
              </div>

              <button onClick={() => handleUseModel(model)} className={styles.useBtn}>
                <ArrowRight size={16} /> Use This Model
              </button>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className={styles.emptyCard}>
          <Bot size={48} className={styles.emptyIcon} />
          <div className={styles.emptyTitle}>No models found</div>
          <div className={styles.emptyText}>Try adjusting your search or category filter.</div>
        </div>
      )}
    </div>
  );
}