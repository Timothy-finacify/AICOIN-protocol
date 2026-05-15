import { Wallet, Store, Pickaxe } from "lucide-react";
import "./globals.css";
export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
      <h1 className="text-5xl font-bold mb-4">
        <span className="text-blue-400">AICOIN</span>
      </h1>
      <p className="text-xl text-gray-400 mb-8 max-w-2xl">
        Universal, ownerless, mineable AI payment protocol.
        Connect your wallet to access the global AI economy.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <Wallet className="w-8 h-8 text-blue-400 mb-3" />
          <h3 className="text-lg font-semibold mb-2">Wallet</h3>
          <p className="text-gray-400 text-sm">Send, receive, and manage your AIC tokens</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <Store className="w-8 h-8 text-blue-400 mb-3" />
          <h3 className="text-lg font-semibold mb-2">AI Marketplace</h3>
          <p className="text-gray-400 text-sm">Browse and use AI services from registered companies</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <Pickaxe className="w-8 h-8 text-blue-400 mb-3" />
          <h3 className="text-lg font-semibold mb-2">Mine</h3>
          <p className="text-gray-400 text-sm">Run AI models on your device and earn AIC rewards</p>
        </div>
      </div>
    </div>
  );
}