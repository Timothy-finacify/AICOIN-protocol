import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "online",
    network: "sepolia",
    chainId: 11155111,
    contracts: {
      aicoin: "0xcb0402629AF93ac8205736c771ACB5e842357f66",
      paymentRouter: "0xa4269ceD2c6AE4DF387086970dba7543e5c7e130",
      modelRegistry: "0x021aa2761aD177b97e311775d219615F2A4aC3cc",
      companyRegistry: "0x22386a826027f8522A19E17282471752FA3F8a9b",
      p2pEscrow: "0xbb15c2F81d02eDc03D23Cb1CF557BE3194af6225",
      treasury: "0x242c7E26De8c7feF7Ecc1a26F50c99904c824Ae3",
    },
    endpoints: {
      companies: "/api/v1/companies",
      models: "/api/v1/models",
      p2p: "/api/v1/p2p/trades",
      stats: "/api/v1/status",
      docs: "/api/v1/docs",
    },
    forBeginners: {
      message: "New to AICOIN? Start here.",
      steps: [
        "1. Get a wallet (MetaMask, Trust Wallet)",
        "2. Get Sepolia test ETH from faucet",
        "3. Mine AIC using our mining client",
        "4. Start using AI models",
      ],
      sdkInstall: "npm install @aicoin/sdk",
      pythonSdkInstall: "pip install aicoin-sdk",
    },
  });
}