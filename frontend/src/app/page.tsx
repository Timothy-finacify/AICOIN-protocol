import Link from "next/link";
import { ArrowRight, Sparkles, Shield, Zap, Coins, Code, Wallet } from "lucide-react";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div>
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroContent}>
          <div className={styles.badge}>
            <Sparkles size={14} /> Live on Sepolia Testnet
          </div>
          <h1 className={styles.title}>
            The Payment Layer<br />
            <span className={styles.titleGold}>for Artificial Intelligence</span>
          </h1>
          <p className={styles.subtitle}>
            Open infrastructure for AI payments. Anyone can build, register models, and earn per token. No gatekeepers. No Stripe. Just code.
          </p>
          <div className={styles.actions}>
            <Link href="/explorer" className={styles.btnPrimary}>Explore AI Models <ArrowRight size={18} /></Link>
            <Link href="/mining" className={styles.btnSecondary}>Start Mining</Link>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>One Protocol. <span className={styles.sectionTitleGold}>Three Ways to Earn.</span></h2>
        <div className={styles.grid}>
          {[
            { icon: Code, title: "For AI Developers", text: "Register your model on-chain. Set your price per token. Earn 70.5% on every request. No payment processor. No approval.", cta: "Register Model", href: "/register" },
            { icon: Wallet, title: "For Users", text: "Pay per token. Zero gas fees. Your data stays private with ZK proofs. One approval for unlimited AI usage.", cta: "Get Started", href: "/wallet" },
            { icon: Coins, title: "For Miners", text: "Mine blocks from phone or data center. Verify ZK proofs. Earn block rewards + fees forever.", cta: "Start Mining", href: "/mining" },
          ].map(({ icon: Icon, title, text, cta, href }) => (
            <div key={title} className={styles.card}>
              <Icon size={32} className={styles.cardIcon} />
              <h3 className={styles.cardTitle}>{title}</h3>
              <p className={styles.cardText}>{text}</p>
              <Link href={href} className={styles.cardLink}>{cta} <ArrowRight size={14} /></Link>
            </div>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionCenter}`}>
        <h2 className={styles.sectionTitle}><span className={styles.sectionTitleGold}>Open</span> Infrastructure</h2>
        <p className={styles.sectionText}>
          AICOIN is open infrastructure. Anyone can build their own frontend, mobile app, or internal tool that uses AICOIN for AI payments. Every frontend uses the same contracts. Every frontend earns the same 70.5%. No fees to us. No permission needed.
        </p>
        <div className={styles.badgeGrid}>
          {[
            { icon: Shield, text: "14 Contracts Deployed" },
            { icon: Zap, text: "Gas-Free Forever" },
            { icon: Code, text: "Build Your Own UI" },
            { icon: Coins, text: "Earn Per Token" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className={styles.badgeCard}>
              <Icon size={20} className={styles.badgeIcon} />
              <span className={styles.badgeText}>{text}</span>
            </div>
          ))}
        </div>
      </section>

      <footer className={styles.footer}>
        <p>AICOIN Protocol — Sepolia Testnet. 14 contracts. Open infrastructure.</p>
      </footer>
    </div>
  );
}