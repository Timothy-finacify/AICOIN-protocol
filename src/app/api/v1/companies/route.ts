import { NextRequest, NextResponse } from "next/server";

// POST /api/v1/companies — Register a new AI company
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, endpointURI, tokensPerSecond, stakeAmount, privateKey } = body;

    if (!name || !endpointURI || !tokensPerSecond || !stakeAmount || !privateKey) {
      return NextResponse.json({ error: "Missing required fields: name, endpointURI, tokensPerSecond, stakeAmount, privateKey" }, { status: 400 });
    }

    if (name.length < 3 || name.length > 40) {
      return NextResponse.json({ error: "Company name must be 3-40 characters" }, { status: 400 });
    }

    if (Number(stakeAmount) < 10000) {
      return NextResponse.json({ error: "Minimum stake is 10,000 AIC" }, { status: 400 });
    }

    // Return the transaction data for the frontend to send
    return NextResponse.json({
      success: true,
      message: "Transaction data ready. Send this to the blockchain.",
      contractAddress: "0x22386a826027f8522A19E17282471752FA3F8a9b",
      contractName: "CompanyRegistry",
      functionName: "register",
      args: {
        name,
        publicKey: "0x0000000000000000000000000000000000000000",
        modelRegistryPointer: "0x0000000000000000000000000000000000000000",
        endpointURI,
        jurisdictionHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
        supportedTokensPerSecond: Number(tokensPerSecond),
        stakeAmount: Number(stakeAmount) * 1e9,
      },
      note: "You must call AICOIN.approve() first for CompanyRegistry to spend your AIC.",
      example: {
        approveAmount: Number(stakeAmount) + 100,
        approveContract: "0xcb0402629AF93ac8205736c771ACB5e842357f66",
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

// GET /api/v1/companies — List registered companies
export async function GET() {
  return NextResponse.json({
    companies: [],
    total: 0,
    note: "Query the subgraph at /api/v1/graphql for live on-chain data",
    graphqlEndpoint: "/api/v1/graphql",
    exampleQuery: `
      query {
        companies(first: 10) {
          id
          name
          verified
          trustScore
          totalEarned
        }
      }
    `,
  });
}