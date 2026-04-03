"use client";

import { useEffect, useState } from "react";

interface ReserveData {
  balanceXmr: string;
  unlockedXmr: string;
  error?: string;
}

interface SupplyData {
  supplyXmr: string;
  mintAuthority: string | null;
  error?: string;
}

export default function Dashboard() {
  const [reserve, setReserve] = useState<ReserveData | null>(null);
  const [supply, setSupply] = useState<SupplyData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [solanaPubkey, setSolanaPubkey] = useState("");
  const [depositAddress, setDepositAddress] = useState<string | null>(null);
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function fetchData() {
    try {
      const [r, s] = await Promise.all([
        fetch("/api/reserve").then((res) => res.json()),
                                       fetch("/api/supply").then((res) => res.json()),
      ]);
      setReserve(r);
      setSupply(s);
      setLastUpdated(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function getDepositAddress() {
    setDepositLoading(true);
    setDepositError(null);
    setDepositAddress(null);

    try {
      const res = await fetch("/api/deposit-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ solanaPubkey }),
      });
      const data = await res.json();
      if (data.error) {
        setDepositError(data.error);
      } else {
        setDepositAddress(data.subaddress);
      }
    } catch (e) {
      setDepositError("Failed to generate deposit address");
    } finally {
      setDepositLoading(false);
    }
  }

  function copyAddress() {
    if (!depositAddress) return;
    navigator.clipboard.writeText(depositAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const reserveXmr = parseFloat(reserve?.balanceXmr ?? "0");
  const supplyXmr = parseFloat(supply?.supplyXmr ?? "0");
  const ratio = supplyXmr > 0 ? reserveXmr / supplyXmr : 1;
  const ratioColor = ratio >= 1 ? "#ff6600" : ratio >= 0.95 ? "#ca8a04" : "#dc2626";

  return (
    <div className="min-h-screen text-white font-['Roboto',sans-serif]" style={{ background: "#0d0d0d" }}>

    {/* Top bar */}
    <div className="px-8 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #222" }}>
    <div className="flex items-center gap-4">
    <div className="w-7 h-7 flex items-center justify-center text-xs font-bold" style={{ background: "#ff6600", color: "#fff" }}>
    M
    </div>
    <span className="font-['Inter',sans-serif] text-sm tracking-widest uppercase text-white">wXMR</span>
    <span className="text-xs tracking-widest uppercase hidden sm:block" style={{ color: "#444" }}>/ Reserve Dashboard</span>
    </div>
    <div className="flex items-center gap-6 text-xs tracking-wider uppercase" style={{ color: "#444" }}>
    <span>{lastUpdated ? lastUpdated.toLocaleTimeString() : "—"}</span>
    <span className="w-2 h-2 inline-block" style={{ background: loading ? "#333" : "#ff6600" }} />
    </div>
    </div>

    {/* 2-col layout */}
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] min-h-[calc(100vh-57px)]">

    {/* Left */}
    <div className="px-8 py-16 space-y-16" style={{ borderRight: "1px solid #222" }}>

    {/* Hero stat */}
    <div className="space-y-4">
    <p className="text-xs tracking-widest uppercase font-['Inter',sans-serif]" style={{ color: "#555" }}>
    XMR Reserve Balance
    </p>
    <div className="flex items-end gap-4">
    <h1 className="font-['Inter',sans-serif] font-bold leading-none text-white" style={{ fontSize: "clamp(3rem, 8vw, 6rem)" }}>
    {loading ? "—" : reserveXmr.toFixed(4)}
    </h1>
    <span className="text-xl mb-2 font-['Inter',sans-serif]" style={{ color: "#444" }}>XMR</span>
    </div>
    <p className="text-sm" style={{ color: "#555" }}>
    Locked in stagenet reserve wallet. Auditable via public view key.
    </p>
    </div>

    <div style={{ borderTop: "1px solid #222" }} />

    {/* Stats */}
    <div className="grid grid-cols-2 gap-0" style={{ border: "1px solid #222", boxShadow: "4px 4px 0px #ff6600" }}>
    <div className="p-8" style={{ borderRight: "1px solid #222" }}>
    <p className="text-xs tracking-widest uppercase mb-4 font-['Inter',sans-serif]" style={{ color: "#555" }}>wXMR Supply</p>
    <p className="text-3xl font-bold font-['Inter',sans-serif] text-white">{loading ? "—" : supplyXmr.toFixed(4)}</p>
    <p className="text-xs mt-2" style={{ color: "#444" }}>SPL token · 12 decimals</p>
    </div>
    <div className="p-8">
    <p className="text-xs tracking-widest uppercase mb-4 font-['Inter',sans-serif]" style={{ color: "#555" }}>Collateral Ratio</p>
    <p className="text-3xl font-bold font-['Inter',sans-serif]" style={{ color: ratioColor }}>
    {loading ? "—" : `${(ratio * 100).toFixed(2)}%`}
    </p>
    <p className="text-xs mt-2" style={{ color: "#444" }}>{ratio >= 1 ? "Fully backed" : "Undercollateralised"}</p>
    </div>
    </div>

    {/* Peg bar */}
    <div className="space-y-3">
    <div className="flex justify-between text-xs tracking-widest uppercase font-['Inter',sans-serif]" style={{ color: "#555" }}>
    <span>Backing</span>
    <span style={{ color: ratioColor }}>{loading ? "—" : `${(ratio * 100).toFixed(2)}%`}</span>
    </div>
    <div className="relative w-full" style={{ height: "1px", background: "#222" }}>
    <div
    className="absolute top-0 left-0 transition-all duration-1000"
    style={{ width: loading ? "0%" : `${Math.min(ratio * 100, 100)}%`, background: ratioColor, height: "3px", marginTop: "-1px" }}
    />
    </div>
    </div>

    <div style={{ borderTop: "1px solid #222" }} />

    {/* Deposit widget */}
    <div className="space-y-6">
    <p className="text-xs tracking-widest uppercase font-['Inter',sans-serif]" style={{ color: "#555" }}>
    Deposit XMR → Get wXMR
    </p>
    <p className="text-xs leading-relaxed" style={{ color: "#444" }}>
    Enter your Solana wallet address. You'll receive a unique XMR deposit address.
    Send XMR to it and wXMR will be minted to your Solana wallet automatically.
    </p>
    <div className="flex gap-0">
    <input
    type="text"
    placeholder="Solana wallet address"
    value={solanaPubkey}
    onChange={(e) => setSolanaPubkey(e.target.value)}
    className="flex-1 px-4 py-3 text-xs font-mono text-white bg-transparent outline-none"
    style={{ border: "1px solid #333", borderRight: "none" }}
    />
    <button
    onClick={getDepositAddress}
    disabled={depositLoading || !solanaPubkey}
    className="px-6 py-3 text-xs tracking-widest uppercase font-['Inter',sans-serif] text-white transition-all duration-200 disabled:opacity-30"
    style={{ border: "1px solid #333", background: depositLoading ? "#111" : "#ff6600", borderColor: "#ff6600" }}
    >
    {depositLoading ? "..." : "Generate"}
    </button>
    </div>

    {depositError && (
      <p className="text-xs" style={{ color: "#dc2626" }}>{depositError}</p>
    )}

    {depositAddress && (
      <div className="space-y-3">
      <p className="text-xs tracking-widest uppercase font-['Inter',sans-serif]" style={{ color: "#555" }}>
      Your XMR Deposit Address
      </p>
      <div
      className="flex items-start gap-4 p-4"
      style={{ border: "1px solid #333", background: "#111" }}
      >
      <p className="flex-1 text-xs font-mono break-all leading-relaxed" style={{ color: "#ff6600" }}>
      {depositAddress}
      </p>
      <button
      onClick={copyAddress}
      className="text-xs tracking-widest uppercase font-['Inter',sans-serif] shrink-0 transition-all duration-200"
      style={{ color: copied ? "#ff6600" : "#444" }}
      >
      {copied ? "Copied" : "Copy"}
      </button>
      </div>
      <p className="text-xs" style={{ color: "#444" }}>
      This address is unique to your wallet. Deposits confirmed after 10 blocks.
      </p>
      </div>
    )}
    </div>
    </div>

    {/* Right */}
    <div className="px-8 py-16 space-y-12" style={{ background: "#111" }}>
    <div>
    <p className="text-xs tracking-widest uppercase mb-4 font-['Inter',sans-serif]" style={{ color: "#555" }}>Reserve Address</p>
    <p className="text-xs break-all leading-relaxed font-mono" style={{ color: "#666" }}>
    59Qp8URJKRMFhzZhiELXucU4znvkNkydKdU2QE2TA2BVdnRxAhaHGw6CRgPwevHNXPLEbyxqj1zj5T5FxmqsRvheHdJ7oBm
    </p>
    </div>
    <div style={{ borderTop: "1px solid #1e1e1e" }} />
    <div>
    <p className="text-xs tracking-widest uppercase mb-4 font-['Inter',sans-serif]" style={{ color: "#555" }}>Mint Authority</p>
    <p className="text-xs break-all leading-relaxed font-mono" style={{ color: "#666" }}>{supply?.mintAuthority ?? "—"}</p>
    </div>
    <div style={{ borderTop: "1px solid #1e1e1e" }} />
    <div>
    <p className="text-xs tracking-widest uppercase mb-4 font-['Inter',sans-serif]" style={{ color: "#555" }}>Network</p>
    <div className="space-y-2 text-xs" style={{ color: "#666" }}>
    <div className="flex justify-between"><span>XMR</span><span className="font-mono">Stagenet</span></div>
    <div className="flex justify-between"><span>Solana</span><span className="font-mono">Localnet</span></div>
    <div className="flex justify-between"><span>Token Program</span><span className="font-mono">SPL Token</span></div>
    </div>
    </div>
    <div style={{ borderTop: "1px solid #1e1e1e" }} />
    <div>
    <p className="text-xs tracking-widest uppercase mb-4 font-['Inter',sans-serif]" style={{ color: "#555" }}>Verification</p>
    <p className="text-xs leading-relaxed" style={{ color: "#555" }}>
    Reserve balance is read directly from monero-wallet-rpc using the reserve wallet view key.
    wXMR supply is read from the Solana token program on-chain. No intermediaries.
    </p>
    </div>
    <button
    onClick={fetchData}
    className="w-full py-3 text-xs tracking-widest uppercase font-['Inter',sans-serif] text-white transition-all duration-200"
    style={{ border: "1px solid #333", boxShadow: "2px 2px 0px #ff6600", background: "transparent" }}
    onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.background = "#ff6600"; (e.target as HTMLButtonElement).style.borderColor = "#ff6600"; }}
    onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = "transparent"; (e.target as HTMLButtonElement).style.borderColor = "#333"; }}
    >
    Refresh
    </button>
    </div>
    </div>
    </div>
  );
}
