export interface AICompany {
  id: string;
  name: string;
  description: string;
  price: number;
  verified: boolean;
  reputation: number;
  category: string;
  languages: string[];
  walletAddress: string;
  registeredAt: string;
}

const PROTECTED_NAMES = [
  "openai", "google", "deepmind", "anthropic", "microsoft", "meta",
  "amazon", "apple", "nvidia", "intel", "amd", "tesla", "xai",
  "chatgpt", "gpt", "gemini", "claude", "copilot", "llama", "groq",
  "midjourney", "dalle", "stability", "stable diffusion",
  "aicoin", "aicoin protocol", "aicoin official"
];

const BANNED_WORDS = [
  "official", "verified", "real", "authentic", "original",
  "legit", "trusted", "certified", "authorized", "registered"
];

const initialCompanies: AICompany[] = [
  {
    id: "seed-1",
    name: "SwahiliMed AI",
    description: "Medical diagnosis assistant trained on East African health data.",
    price: 0.01,
    verified: true,
    reputation: 142,
    category: "Medical",
    languages: ["Swahili", "English"],
    walletAddress: "0xMed11111111111111111111111111111111111111",
    registeredAt: "2026-05-14",
  },
  {
    id: "seed-2",
    name: "FarmSense Africa",
    description: "Crop disease detection and farming optimization.",
    price: 0.005,
    verified: false,
    reputation: 28,
    category: "Agriculture",
    languages: ["Swahili", "English", "French"],
    walletAddress: "0xFarm2222222222222222222222222222222222222",
    registeredAt: "2026-05-14",
  },
  {
    id: "seed-3",
    name: "LegalMind India",
    description: "Indian legal document analyzer covering IPC and CrPC.",
    price: 0.015,
    verified: true,
    reputation: 95,
    category: "Legal",
    languages: ["Hindi", "English", "Tamil", "Telugu"],
    walletAddress: "0xLegal33333333333333333333333333333333333",
    registeredAt: "2026-05-14",
  },
  {
    id: "seed-4",
    name: "EduTutor AI",
    description: "Personalized tutoring for K-12 students.",
    price: 0.008,
    verified: true,
    reputation: 67,
    category: "Education",
    languages: ["English", "French", "Arabic"],
    walletAddress: "0xEduT4444444444444444444444444444444444444",
    registeredAt: "2026-05-14",
  },
];

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export const validateCompanyName = (name: string, existingCompanies: AICompany[]): ValidationResult => {
  const trimmedName = name.trim();
  if (!trimmedName) return { valid: false, error: "Company name cannot be empty." };
  if (trimmedName.length < 3) return { valid: false, error: "Company name must be at least 3 characters." };
  if (trimmedName.length > 40) return { valid: false, error: "Company name must be under 40 characters." };
  
  const lowerName = trimmedName.toLowerCase();
  
  for (const protectedName of PROTECTED_NAMES) {
    if (lowerName.includes(protectedName)) {
      return { valid: false, error: "Company name cannot include \"" + protectedName + "\"." };
    }
  }
  
  for (const banned of BANNED_WORDS) {
    if (lowerName.includes(banned)) {
      return { valid: false, error: "Company name cannot include the word \"" + banned + "\"." };
    }
  }
  
  for (const company of existingCompanies) {
    if (company.name.toLowerCase() === lowerName) {
      return { valid: false, error: "\"" + company.name + "\" is already registered." };
    }
  }
  
  for (const company of existingCompanies) {
    const existingLower = company.name.toLowerCase();
    if (existingLower !== lowerName) {
      if (existingLower.includes(lowerName) || lowerName.includes(existingLower)) {
        return { valid: false, error: "Too similar to \"" + company.name + "\"." };
      }
    }
  }
  
  return { valid: true };
};

export const validateDescription = (description: string): ValidationResult => {
  const trimmed = description.trim();
  if (!trimmed) return { valid: false, error: "Description cannot be empty." };
  if (trimmed.length < 20) return { valid: false, error: "Description must be at least 20 characters." };
  if (trimmed.length > 500) return { valid: false, error: "Description must be under 500 characters." };
  return { valid: true };
};

export const validatePrice = (price: number): ValidationResult => {
  if (isNaN(price) || price <= 0) return { valid: false, error: "Price must be a positive number." };
  if (price < 0.001) return { valid: false, error: "Minimum price is 0.001 AIC." };
  if (price > 100) return { valid: false, error: "Maximum price is 100 AIC." };
  return { valid: true };
};

const getStoredCompanies = (): AICompany[] => {
  if (typeof window === "undefined") return [...initialCompanies];
  const stored = localStorage.getItem("aicoin_companies");
  if (stored) {
    try { return JSON.parse(stored); }
    catch { return [...initialCompanies]; }
  }
  localStorage.setItem("aicoin_companies", JSON.stringify(initialCompanies));
  return [...initialCompanies];
};

export const getCompanies = (): AICompany[] => {
  return getStoredCompanies();
};

export const addCompany = (company: Omit<AICompany, "id" | "verified" | "reputation" | "registeredAt">): { success: boolean; company?: AICompany; error?: string } => {
  const companies = getStoredCompanies();
  
  const nameCheck = validateCompanyName(company.name, companies);
  if (!nameCheck.valid) return { success: false, error: nameCheck.error };
  
  const descCheck = validateDescription(company.description);
  if (!descCheck.valid) return { success: false, error: descCheck.error };
  
  const priceCheck = validatePrice(company.price);
  if (!priceCheck.valid) return { success: false, error: priceCheck.error };
  
  const newCompany: AICompany = {
    ...company,
    id: "company-" + Date.now(),
    verified: false,
    reputation: 0,
    registeredAt: new Date().toISOString().split("T")[0],
  };
  
  companies.push(newCompany);
  localStorage.setItem("aicoin_companies", JSON.stringify(companies));
  return { success: true, company: newCompany };
};

export const getCategories = (): string[] => {
  const cats = new Set(initialCompanies.map(function(c) { return c.category; }));
  return ["All"].concat(Array.from(cats));
};