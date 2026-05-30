// src/app/chat/page.tsx — Complete Production Chat

"use client";

import { useAccount } from "wagmi";
import { useState, useEffect, useRef, useCallback } from "react";
import { Bot, Send, Loader2, Coins, Zap, Shield, Image, Music, Video, Code, MessageSquare, Trash2, Download, Copy, CheckCircle2 } from "lucide-react";
import { useBalance } from "@/hooks/useAICOIN";
import styles from "./page.module.css";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  tokens?: number;
  cost?: number;
  timestamp: number;
  modelName?: string;
}

const TABS = [
  { id: "text", label: "Text", icon: MessageSquare },
  { id: "image", label: "Image", icon: Image },
  { id: "audio", label: "Audio", icon: Music },
  { id: "video", label: "Video", icon: Video },
  { id: "code", label: "Code", icon: Code },
];

const MODELS_BY_TAB: Record<string, Array<{ id: string; name: string; price: number }>> = {
  text: [
    { id: "meta-llama/llama-4-scout-17b-16e-instruct", name: "Llama 4 Scout 17B", price: 0.0000001 },
    { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", price: 0.00000059 },
    { id: "openai/gpt-oss-120b", name: "GPT-OSS 120B", price: 0.0000007 },
    { id: "qwen/qwen3-32b", name: "Qwen 3 32B", price: 0.0000003 },
  ],
  image: [{ id: "stable-diffusion-xl", name: "Stable Diffusion XL", price: 0.000005 }],
  audio: [{ id: "whisper-large-v3", name: "Whisper Large v3", price: 0.0000001 }],
  video: [{ id: "runway-gen3", name: "Runway Gen-3", price: 0.00002 }],
  code: [{ id: "qwen/qwen3-32b", name: "Qwen 3 32B", price: 0.0000003 }],
};

const STORAGE_KEY = "aicoin_chat_sessions";
const API_KEY_STORAGE = "aicoin_api_key";

interface ChatSession {
  id: string;
  name: string;
  model: string;
  tab: string;
  messages: Message[];
  totalTokens: number;
  totalCost: number;
  createdAt: number;
  updatedAt: number;
}

export default function ChatPage() {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance(address);
  const [mounted, setMounted] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("meta-llama/llama-4-scout-17b-16e-instruct");
  const [activeTab, setActiveTab] = useState("text");
  const [apiKey, setApiKey] = useState("");
  const [showSidebar, setShowSidebar] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); });

  // Load sessions and API key from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(STORAGE_KEY);
    const savedKey = localStorage.getItem(API_KEY_STORAGE);
    if (savedKey) setApiKey(savedKey);
    if (saved) {
      try {
        const parsed: ChatSession[] = JSON.parse(saved);
        setSessions(parsed);
        if (parsed.length > 0 && !activeSessionId) {
          setActiveSessionId(parsed[0].id);
          const active = parsed[0];
          setSelectedModel(active.model);
          setActiveTab(active.tab);
        }
      } catch {}
    }
    if (!activeSessionId) createNewSession();
  }, []);

  // Read URL params for model pre-selection
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const modelParam = params.get("model");
    const tabParam = params.get("tab");
    if (tabParam && TABS.find(t => t.id === tabParam)) {
      setActiveTab(tabParam);
      const models = MODELS_BY_TAB[tabParam] || MODELS_BY_TAB.text;
      if (modelParam && models.find(m => m.id === modelParam)) {
        setSelectedModel(modelParam);
      } else if (models.length > 0) {
        setSelectedModel(models[0].id);
      }
    }
  }, []);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    if (sessions.length > 0 && typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    }
  }, [sessions]);

  // Save API key
  useEffect(() => {
    if (apiKey && typeof window !== "undefined") {
      localStorage.setItem(API_KEY_STORAGE, apiKey);
    }
  }, [apiKey]);

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const messages = activeSession?.messages || [];
  const totalTokens = activeSession?.totalTokens || 0;
  const totalCost = activeSession?.totalCost || 0;

  const createNewSession = useCallback(() => {
    const tabModels = MODELS_BY_TAB[activeTab] || MODELS_BY_TAB.text;
    const defaultModel = tabModels[0]?.id || selectedModel;
    const newSession: ChatSession = {
      id: Date.now().toString(),
      name: `Chat ${sessions.length + 1}`,
      model: defaultModel,
      tab: activeTab,
      messages: [],
      totalTokens: 0,
      totalCost: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setSelectedModel(defaultModel);
  }, [activeTab, selectedModel, sessions.length]);

  const updateSession = useCallback((updates: Partial<ChatSession>) => {
    setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, ...updates, updatedAt: Date.now() } : s));
  }, [activeSessionId]);

  const deleteSession = useCallback((id: string) => {
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== id);
      if (id === activeSessionId && filtered.length > 0) {
        setActiveSessionId(filtered[0].id);
        const active = filtered[0];
        setSelectedModel(active.model);
        setActiveTab(active.tab);
      } else if (filtered.length === 0) {
        createNewSession();
      }
      return filtered;
    });
  }, [activeSessionId, createNewSession]);

  const clearCurrentChat = () => {
    updateSession({ messages: [], totalTokens: 0, totalCost: 0 });
  };

  const copyMessage = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!mounted) return <div className={styles.container}><h1 className={styles.pageTitle}>Chat</h1></div>;
  if (!isConnected) {
    return (
      <div className={styles.connectWrap}>
        <div className={styles.connectBox}>
          <Bot size={48} className={styles.connectIcon} />
          <h2 className={styles.connectTitle}>Connect Your Wallet</h2>
          <p className={styles.connectText}>Connect to chat with AI and track per-token costs.</p>
        </div>
      </div>
    );
  }

  const currentModels = MODELS_BY_TAB[activeTab] || MODELS_BY_TAB.text;
  const userBalance = balance ? Number(balance) / 1e9 : 0;
  const selectedPrice = currentModels.find(m => m.id === selectedModel)?.price || 0.0000001;
  const selectedName = currentModels.find(m => m.id === selectedModel)?.name || "AI Model";
  const TabIcon = TABS.find(t => t.id === activeTab)?.icon || MessageSquare;

  const sendMessage = async () => {
    if (!input.trim() || !apiKey.trim()) return;
    
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: Date.now(),
      modelName: selectedName,
    };
    
    const updatedMessages = [...messages, userMsg];
    updateSession({ messages: updatedMessages });
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || "No response";
      const tokens = data.usage?.total_tokens || content.split(" ").length;
      const cost = tokens * selectedPrice;

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content,
        tokens,
        cost,
        timestamp: Date.now(),
        modelName: selectedName,
      };

      const finalMessages = [...updatedMessages, aiMsg];
      const newTokens = totalTokens + tokens;
      const newCost = totalCost + cost;
      updateSession({ messages: finalMessages, totalTokens: newTokens, totalCost: newCost });
    } catch {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Error connecting to AI. Check your API key.",
        tokens: 0,
        cost: 0,
        timestamp: Date.now(),
      };
      updateSession({ messages: [...updatedMessages, errorMsg] });
    }
    setIsLoading(false);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => setShowSidebar(!showSidebar)} className={styles.sidebarToggle}>
            <MessageSquare size={20} />
          </button>
          <h1 className={styles.pageTitle}>AI Chat · {selectedName}</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div className={styles.costBadge}>
            <Coins size={14} style={{ color: "#FFB800" }} />
            <span>{totalCost.toFixed(8)} AIC</span>
            <span className={styles.tokenCount}>{totalTokens} tokens</span>
          </div>
          <button onClick={clearCurrentChat} className={styles.iconBtn} title="Clear chat">
            <Trash2 size={16} />
          </button>
          <button onClick={createNewSession} className={styles.iconBtn} title="New chat">
            <MessageSquare size={16} />
          </button>
        </div>
      </div>

      {/* Sidebar + Chat */}
      <div style={{ display: "flex", gap: "16px" }}>
        {/* Sidebar */}
        {showSidebar && (
          <div className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
              <span>Conversations</span>
              <button onClick={createNewSession} className={styles.newChatBtn}>+ New</button>
            </div>
            <div className={styles.sessionList}>
              {sessions.map(session => (
                <div
                  key={session.id}
                  className={`${styles.sessionItem} ${session.id === activeSessionId ? styles.sessionActive : ""}`}
                  onClick={() => {
                    setActiveSessionId(session.id);
                    setSelectedModel(session.model);
                    setActiveTab(session.tab);
                    setShowSidebar(false);
                  }}
                >
                  <div className={styles.sessionInfo}>
                    <div className={styles.sessionName}>{session.name}</div>
                    <div className={styles.sessionMeta}>
                      {session.messages.length} msgs · {session.totalCost.toFixed(6)} AIC
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                    className={styles.deleteBtn}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Chat Area */}
        <div style={{ flex: 1 }}>
          {/* Tabs */}
          <div className={styles.tabBar}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  const models = MODELS_BY_TAB[tab.id] || MODELS_BY_TAB.text;
                  const newModel = models[0]?.id || selectedModel;
                  setSelectedModel(newModel);
                  updateSession({ tab: tab.id, model: newModel, name: `Chat ${activeSession?.name || ""}` });
                }}
                className={`${styles.tabBtn} ${activeTab === tab.id ? styles.tabActive : ""}`}
              >
                <tab.icon size={16} /> {tab.label}
              </button>
            ))}
          </div>

          {/* Chat Card */}
          <div className={styles.chatCard}>
            <div className={styles.chatHeader}>
              <div className={styles.modelSelect}>
                <TabIcon size={18} style={{ color: "#FFB800" }} />
                <select value={selectedModel} onChange={(e) => { setSelectedModel(e.target.value); updateSession({ model: e.target.value }); }} className={styles.select}>
                  {currentModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className={styles.apiInput}>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Groq API Key"
                  className={styles.keyInput}
                />
              </div>
            </div>

            <div className={styles.messages}>
              {messages.length === 0 && (
                <div className={styles.emptyChat}>
                  <TabIcon size={48} className={styles.emptyIcon} />
                  <div className={styles.emptyTitle}>Start a conversation</div>
                  <div className={styles.emptyText}>Enter your API key and start. Conversations are saved automatically.</div>
                </div>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`${styles.message} ${msg.role === "user" ? styles.userMsg : styles.aiMsg}`}>
                  <div className={styles.messageContent}>{msg.content}</div>
                  <div className={styles.messageFooter}>
                    {msg.tokens ? (
                      <div className={styles.messageMeta}>
                        <span>{msg.tokens} tokens</span>
                        <span>{msg.cost?.toFixed(8)} AIC</span>
                      </div>
                    ) : null}
                    <div className={styles.messageActions}>
                      <button onClick={() => copyMessage(msg.content, msg.id)} className={styles.msgBtn}>
                        {copiedId === msg.id ? <CheckCircle2 size={14} style={{ color: "#00D278" }} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className={styles.aiMsg}>
                  <Loader2 size={20} className={styles.spinner} style={{ color: "#FFB800" }} />
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className={styles.chatInput}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Type your message..."
                className={styles.input}
                disabled={isLoading}
              />
              <button onClick={sendMessage} disabled={isLoading || !input.trim()} className={styles.sendBtn}>
                {isLoading ? <Loader2 size={18} className={styles.spinner} /> : <Send size={18} />}
              </button>
            </div>
          </div>

          {/* Info Row */}
          <div className={styles.infoRow}>
            <div className={styles.infoItem}><Shield size={14} style={{ color: "#00D278" }} /><span>ZK Privacy</span></div>
            <div className={styles.infoItem}><Zap size={14} style={{ color: "#FFB800" }} /><span>Gas-Free</span></div>
            <div className={styles.infoItem}><Coins size={14} style={{ color: "#5BAAFF" }} /><span>{userBalance.toFixed(2)} AIC</span></div>
            <div className={styles.infoItem} style={{ color: "#7A7A99" }}><span>{selectedPrice.toFixed(8)} AIC/token</span></div>
            <div className={styles.infoItem} style={{ color: "#7A7A99" }}><span>🟢 Auto-saved</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}