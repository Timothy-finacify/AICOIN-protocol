import { NextRequest, NextResponse } from "next/server";

// POST /api/v1/models — Register a new AI model
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, version, category, inputPricePer1M, outputPricePer1M, autoPricing, hardwareTier, minMemoryMB, maxTokensPerRequest, privateKey } = body;

    if (!name || !version || category === undefined || !inputPricePer1M || !outputPricePer1M) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const categories = ["text", "code", "image", "audio", "video", "multimodal", "reasoning", "agentic"];
    const catIndex = categories.indexOf(category);
    if (catIndex === -1) {
      return NextResponse.json({ error: `Invalid category. Must be one of: ${categories.join(", ")}` }, { status: 400 });
    }

    const hardwareTiers = ["mobile", "consumer_gpu", "data_center", "supercomputer"];
    const tierIndex = hardwareTiers.indexOf(hardwareTier || "data_center");

    return NextResponse.json({
      success: true,
      message: "Transaction data ready.",
      contractAddress: "0x021aa2761aD177b97e311775d219615F2A4aC3cc",
      contractName: "ModelRegistry",
      functionName: "registerModel",
      args: {
        name,
        version,
        ipfsMetadata: body.ipfsMetadata || "ipfs://metadata",
        zkVerificationKey: "0x0000000000000000000000000000000000000000000000000000000000000000",
        zkCircuitHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
        category: catIndex,
        inputPricePer1MTokens: Math.floor(Number(inputPricePer1M) * 1e6),
        outputPricePer1MTokens: Math.floor(Number(outputPricePer1M) * 1e6),
        useAutoPricing: autoPricing !== false,
        minHardwareTier: tierIndex >= 0 ? tierIndex : 2,
        minMemoryMB: Number(minMemoryMB) || 80000,
        maxTokensPerRequest: Number(maxTokensPerRequest) || 32000,
      },
      note: "You must be a registered company to register a model. 100 AIC registration fee applies.",
    });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

// GET /api/v1/models — List all models
export async function GET() {
  return NextResponse.json({
    models: [],
    total: 0,
    categories: ["text", "code", "image", "audio", "video", "multimodal", "reasoning", "agentic"],
    note: "Query the subgraph for live on-chain data",
    graphqlEndpoint: "/api/v1/graphql",
  });
}