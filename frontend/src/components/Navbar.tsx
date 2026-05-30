// src/components/Navbar.tsx

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Zap, Menu, X, ChevronDown, MessageCircle, Search, Pickaxe, Wallet, Building2, Bot, Smartphone, Landmark, Plus, ArrowUpDown, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import styles from "./Navbar.module.css";

const mainLinks = [
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/models", label: "Models", icon: Search },
  { href: "/mining", label: "Mine", icon: Pickaxe },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/p2p", label: "P2P", icon: ArrowUpDown },
];

const moreLinks = [
  { href: "/company", label: "Company", icon: Building2 },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/devices", label: "Devices", icon: Smartphone },
  { href: "/treasury", label: "Treasury", icon: Landmark },
  { href: "/register", label: "Register", icon: Plus },
];

export function Navbar() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return (
      <nav className={styles.nav}>
        <div className={styles.container}>
          <Link href="/" className={styles.logo}>
            <Zap size={28} className={styles.logoIcon} />
            <span className={styles.logoText}>AICOIN</span>
          </Link>
        </div>
      </nav>
    );
  }

  return (
    <nav className={styles.nav}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          <Zap size={28} className={styles.logoIcon} />
          <span className={styles.logoText}>AICOIN</span>
        </Link>

        <button className={styles.mobileBtn} onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <div className={`${styles.links} ${mobileOpen ? styles.linksOpen : ""}`}>
          {mainLinks.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={`${styles.link} ${pathname === href ? styles.linkActive : ""}`} onClick={() => setMobileOpen(false)}>
              <Icon size={16} /> {label}
            </Link>
          ))}

          <div className={styles.moreWrap}>
            <button className={styles.link} onClick={() => setMoreOpen(!moreOpen)}>
              More <ChevronDown size={14} className={`${styles.chevron} ${moreOpen ? styles.chevronUp : ""}`} />
            </button>
            {moreOpen && (
              <div className={styles.dropdown}>
                {moreLinks.map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href} className={`${styles.dropLink} ${pathname === href ? styles.dropLinkActive : ""}`} onClick={() => { setMoreOpen(false); setMobileOpen(false); }}>
                    <Icon size={15} /> {label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className={styles.walletSection}>
            {isConnected ? (
              <button onClick={() => disconnect()} className={styles.connectBtn}>
                {address?.slice(0, 6)}...{address?.slice(-4)} <LogOut size={14} />
              </button>
            ) : (
              <button onClick={() => connect({ connector: connectors[0] })} className={styles.connectBtn}>
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}