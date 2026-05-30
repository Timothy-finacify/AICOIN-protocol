"use client";

import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useState, useEffect } from "react";
import { 
  Smartphone, Shield, CheckCircle2, Loader2, Monitor, Cpu, AlertTriangle, 
  ArrowRight, Server, HardDrive, Laptop, Radio 
} from "lucide-react";
import { DEVICE_REGISTRY } from "@/lib/contracts";
import styles from "./page.module.css";

const DEVICE_TYPES = [
  { id: "phone", label: "Phone", icon: Smartphone, desc: "Mobile mining, P2P trading" },
  { id: "laptop", label: "Laptop", icon: Laptop, desc: "Personal mining, AI usage" },
  { id: "desktop", label: "Desktop / Gaming PC", icon: Monitor, desc: "GPU mining, model hosting" },
  { id: "server", label: "Server / Farm Node", icon: Server, desc: "Data center mining, ZK verification" },
  { id: "gpu_rig", label: "GPU Mining Rig", icon: HardDrive, desc: "Multi-GPU mining farm" },
  { id: "iot", label: "IoT / Edge Device", icon: Radio, desc: "Mesh relay, lightweight mining" },
];

export default function DevicesPage() {
  const { address, isConnected } = useAccount();
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  const [mounted, setMounted] = useState(false);
  const [deviceId, setDeviceId] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [deviceLabel, setDeviceLabel] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [registeredDevices, setRegisteredDevices] = useState<string[]>([]);

  useEffect(() => { setMounted(true); }, []);

  const generateDeviceId = async () => {
    setIsGenerating(true);
    try {
      const components = [
        selectedType,
        deviceLabel || "unnamed",
        navigator.hardwareConcurrency || 4,
        navigator.deviceMemory || 4,
        navigator.platform || "Unknown",
        screen.width + "x" + screen.height,
      ];
      const fingerprint = components.join("|");
      const encoder = new TextEncoder();
      const data = encoder.encode(fingerprint);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = "0x" + hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
      setDeviceId(hashHex);
    } catch {
      setDeviceId("0x" + Math.random().toString(16).slice(2, 66));
    }
    setIsGenerating(false);
  };

  const registerDevice = () => {
    if (!deviceId) return;
    writeContract({
      address: DEVICE_REGISTRY as `0x${string}`,
      abi: [{
        name: "registerDevice", type: "function", stateMutability: "nonpayable",
        inputs: [{ name: "deviceId", type: "bytes32" }],
        outputs: [],
      }],
      functionName: "registerDevice",
      args: [deviceId as `0x${string}`],
    });
    setRegisteredDevices(prev => [...prev, deviceId]);
  };

  if (!mounted) return <div className={styles.container}><h1 className={styles.pageTitle}>Devices</h1></div>;
  if (!isConnected) {
    return (
      <div className={styles.connectWrap}>
        <div className={styles.connectBox}>
          <Server size={48} className={styles.connectIcon} />
          <h2 className={styles.connectTitle}>Connect Your Wallet</h2>
          <p className={styles.connectText}>Connect to register and manage your mining devices and server farms.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <h1 className={styles.pageTitle}>Device Management</h1>
        <div className={styles.badge}><div className={styles.badgeDot} /> Sepolia</div>
      </div>

      <div className={styles.card}>
        <h2 className={styles.sectionTitle}><Server size={18} style={{ color: "#FFB800" }} />Select Device Type</h2>
        <p className={styles.description}>
          Register phones, laptops, GPU rigs, servers, or entire mining farms. Each device gets a unique on-chain fingerprint.
        </p>

        <div className={styles.typeGrid}>
          {DEVICE_TYPES.map(({ id, label, icon: Icon, desc }) => (
            <button
              key={id}
              onClick={() => setSelectedType(id)}
              className={`${styles.typeCard} ${selectedType === id ? styles.typeCardActive : ""}`}
            >
              <Icon size={28} style={{ color: selectedType === id ? "#FFB800" : "#7A7A99", marginBottom: "10px" }} />
              <div className={styles.typeLabel}>{label}</div>
              <div className={styles.typeDesc}>{desc}</div>
            </button>
          ))}
        </div>

        {selectedType && (
          <div className={styles.configSection}>
            <div className={styles.field}>
              <label className={styles.label}>Device Name / Label (Optional)</label>
              <input
                type="text"
                value={deviceLabel}
                onChange={(e) => setDeviceLabel(e.target.value)}
                placeholder="Farm Node #1, Bedroom Rig, Office Server..."
                className={styles.input}
              />
              <span className={styles.helpText}>Name your device for easy identification in your dashboard.</span>
            </div>

            <div className={styles.deviceInfo}>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <Cpu size={16} style={{ color: "#7A7A99" }} />
                  <div>
                    <div className={styles.infoLabel}>CPU Cores</div>
                    <div className={styles.infoValue}>{navigator.hardwareConcurrency || "Unknown"}</div>
                  </div>
                </div>
                <div className={styles.infoItem}>
                  <Monitor size={16} style={{ color: "#7A7A99" }} />
                  <div>
                    <div className={styles.infoLabel}>Screen</div>
                    <div className={styles.infoValue}>{screen.width}x{screen.height}</div>
                  </div>
                </div>
                <div className={styles.infoItem}>
                  <Smartphone size={16} style={{ color: "#7A7A99" }} />
                  <div>
                    <div className={styles.infoLabel}>Platform</div>
                    <div className={styles.infoValue}>{navigator.platform || "Unknown"}</div>
                  </div>
                </div>
                <div className={styles.infoItem}>
                  <HardDrive size={16} style={{ color: "#7A7A99" }} />
                  <div>
                    <div className={styles.infoLabel}>Memory</div>
                    <div className={styles.infoValue}>{navigator.deviceMemory || "?"} GB</div>
                  </div>
                </div>
              </div>
            </div>

            {!deviceId ? (
              <button onClick={generateDeviceId} disabled={isGenerating} className={styles.primaryBtn}>
                {isGenerating ? <><Loader2 size={16} className={styles.spinner} /> Generating...</> : <><Shield size={16} /> Generate Device Fingerprint</>}
              </button>
            ) : (
              <div className={styles.generatedSection}>
                <div className={styles.fingerprintBox}>
                  <Shield size={14} style={{ color: "#00D278" }} />
                  <span className={styles.fingerprintText}>{deviceId.slice(0, 24)}...{deviceId.slice(-8)}</span>
                </div>

                <button onClick={registerDevice} disabled={isPending || isConfirming} className={styles.submitBtn}>
                  {isPending || isConfirming ? <><Loader2 size={16} className={styles.spinner} /> Registering...</> : <><ArrowRight size={16} /> Register This {DEVICE_TYPES.find(d => d.id === selectedType)?.label}</>}
                </button>

                {isSuccess && (
                  <div className={styles.successBox}>
                    <CheckCircle2 size={20} style={{ color: "#00D278" }} />
                    <div>
                      <div className={styles.successTitle}>Device Registered!</div>
                      <div className={styles.successHash}>TX: {txHash?.slice(0, 10)}...{txHash?.slice(-8)}</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {registeredDevices.length > 0 && (
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}><Server size={18} style={{ color: "#00D278" }} />Your Registered Devices</h2>
          <div className={styles.deviceList}>
            {registeredDevices.map((id, i) => (
              <div key={i} className={styles.registeredDevice}>
                <Shield size={16} style={{ color: "#00D278" }} />
                <span className={styles.fingerprintText}>{id.slice(0, 20)}...{id.slice(-8)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}