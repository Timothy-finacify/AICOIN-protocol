import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    name: "AICOIN REST API v1",
    description: "Universal AI Payment Protocol — Pay per token. Zero gas. Open infrastructure.",
    baseURL: "http://localhost:3000/api/v1",
    authentication: "No API key required for testnet. Use your wallet's private key for write operations.",
    rateLimit: "100 requests per minute per IP",
    
    endpoints: {
      companies: {
        "POST /companies": { description: "Register an AI company", body: { name: "string", endpointURI: "string", tokensPerSecond: "number", stakeAmount: "number", privateKey: "string" } },
        "GET /companies": { description: "List all registered companies" },
        "GET /companies/:address": { description: "Get company by wallet address" },
      },
      models: {
        "POST /models": { description: "Register an AI model", body: { name: "string", version: "string", category: "text|code|image|audio|video|multimodal|reasoning|agentic", inputPricePer1M: "number (USD)", outputPricePer1M: "number (USD)", autoPricing: "boolean", hardwareTier: "mobile|consumer_gpu|data_center|supercomputer" } },
        "GET /models": { description: "List all registered models" },
        "GET /models/:id": { description: "Get model by ID" },
      },
      p2p: {
        "GET /p2p/trades": { description: "List open P2P trades" },
        "POST /p2p/trades": { description: "Create a P2P trade offer", body: { amount: "number (AIC)", method: "MTN_Money|Orange_Money|UPI|Pix|MPesa|GCash|Bank_Transfer", contact: "string (phone number or ID)" } },
      },
      status: {
        "GET /status": { description: "Network status and contract addresses" },
      },
      docs: {
        "GET /docs": { description: "This documentation" },
      },
    },

    howToUse: {
      step1: "Connect your wallet",
      step2: "Mine AIC or buy from P2P",
      step3: "Choose an AI model from /models",
      step4: "Pay per token through the chat interface",
      step5: "AI companies earn 70.5% automatically",
    },

    localHosting: {
      message: "You can run AICOIN entirely on your own machine.",
      requirements: "Node.js 18+, Python 3.10+, Foundry",
      commands: {
        frontend: "cd frontend && npm install && npm run dev",
        miner: "cd miner && pip install web3 && python miner_v3.py",
        contracts: "forge build && forge test",
      },
    },

    support: {
      github: "https://github.com/your-username/aicoin-protocol",
      discord: "Coming soon",
      email: "Coming soon",
    },
  });
}