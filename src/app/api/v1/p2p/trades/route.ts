import { NextRequest, NextResponse } from "next/server";

// GET /api/v1/p2p/trades — List open trades
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const method = searchParams.get("method");
  const minAmount = searchParams.get("minAmount");

  return NextResponse.json({
    trades: [],
    total: 0,
    filters: { method, minAmount },
    paymentMethods: ["MTN_Money", "Orange_Money", "UPI", "Pix", "MPesa", "GCash", "Bank_Transfer"],
    note: "Query the subgraph for live on-chain trades",
    graphqlEndpoint: "/api/v1/graphql",
    howToCreate: "POST /api/v1/p2p/trades with { amount, method, contact, privateKey }",
    escrowInfo: {
      stakePercent: 5,
      minStake: "10 AIC",
      maxStake: "100,000 AIC",
      contractAddress: "0xbb15c2F81d02eDc03D23Cb1CF557BE3194af6225",
    },
  });
}

// POST /api/v1/p2p/trades — Create a new trade
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, method, contact, privateKey } = body;

    if (!amount || !method || !contact) {
      return NextResponse.json({ error: "Missing required fields: amount, method, contact" }, { status: 400 });
    }

    const validMethods = ["MTN_Money", "Orange_Money", "UPI", "Pix", "MPesa", "GCash", "Bank_Transfer"];
    if (!validMethods.includes(method)) {
      return NextResponse.json({ error: `Invalid method. Must be one of: ${validMethods.join(", ")}` }, { status: 400 });
    }

    const stake = Math.max(10, Math.min(100000, (Number(amount) * 5) / 100));

    return NextResponse.json({
      success: true,
      message: "Trade data ready. Approve AIC spending first, then create the trade.",
      contractAddress: "0xbb15c2F81d02eDc03D23Cb1CF557BE3194af6225",
      contractName: "P2PEscrow",
      functionName: "createTrade",
      args: { amount: Number(amount), method, contact },
      stake: { amount: stake, percent: 5, totalRequired: Number(amount) + stake },
      steps: [
        "1. Approve AIC spending: Call AICOIN.approve(P2P_ESCROW_ADDRESS, totalRequired)",
        "2. Create trade: Call P2PEscrow.createTrade(amount, method, contact)",
      ],
    });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}