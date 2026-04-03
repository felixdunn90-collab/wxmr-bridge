"use client";

import { useEffect, useState } from "react";

interface ReserveData {
  balanceXmr: string;
  unlockedXmr: string;
  note?: string;
}

interface SupplyData {
  supplyXmr: string;
  mintAuthority: string | null;
}

interface Tx {
  type: "deposit" | "burn";
  txHash: string;
  amountXmr: string;
  destination: string;
  timestamp: string;
  status: string;
}

export default function Dashboard() {
  const [reserve, setReserve] = useState<ReserveData | null>(null);
  const [supply, setSupply] = useState<SupplyData | null>(null);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [solanaPubkey, setSolanaPubkey] = useState("");
  const [depositAddress, setDepositAddress] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const [r, s, t] = await Promise.all([
        fetch("/api/reserve").then((res) => res.json()),
        fetch("/api/supply").then((res) => res.json()),
        fetch("/api/transactions").then((res) => res.json()),
      ]);
      setReserve(r);
      setSupply(s);
      setTransactions(t.transactions || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  async function generateAddress() {
    setBusy(true);
    setError(null);
    setDepositAddress(null);
    try {
      const res = await fetch("/api/deposit-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ solanaPubkey }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setDepositAddress(data.subaddress);
    } catch {
      setError("Failed to generate deposit address");
    } finally {
      setBusy(false);
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30000);
    return () => clearInterval(id);
  }, []);

  const reserveXmr = parseFloat(reserve?.balanceXmr ?? "0");
  const supplyXmr = parseFloat(supply?.supplyXmr ?? "0");
  const ratio = supplyXmr > 0 ? reserveXmr / supplyXmr : 1;

  return (
    <div className="min-h-screen" style={{ color: "var(--text-primary)" }}>
      {/* Header */}
      <header
        className="px-6 py-5 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-6 h-6 flex items-center justify-center text-[10px] font-bold rounded"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            M
          </div>
          <span className="text-sm font-medium tracking-wide">wXMR</span>
        </div>
        <button
          onClick={refresh}
          className="text-xs tracking-wide px-4 py-2 rounded transition-colors"
          style={{
            color: "var(--text-secondary)",
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.color = "var(--text-primary)";
            (e.target as HTMLElement).style.borderColor = "var(--text-muted)";
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.color = "var(--text-secondary)";
            (e.target as HTMLElement).style.borderColor = "var(--border)";
          }}
        >
          Refresh
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-16 space-y-12">
        {/* Reserve balance */}
        <div>
          <p className="text-xs tracking-wide uppercase" style={{ color: "var(--text-muted)" }}>
            XMR Reserve
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-5xl font-semibold tracking-tight">
              {loading ? "—" : reserveXmr.toFixed(4)}
            </span>
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>
              XMR
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-6">
          <Stat label="wXMR Supply" value={loading ? "—" : supplyXmr.toFixed(4)} sub="12 decimals" />
          <Stat
            label="Ratio"
            value={loading ? "—" : `${(ratio * 100).toFixed(1)}%`}
            sub={ratio >= 1 ? "Fully backed" : "Undercollateralised"}
            accent={ratio >= 1 ? "var(--green)" : "var(--yellow)"}
          />
          <Stat
            label="Unlocked"
            value={loading ? "—" : parseFloat(reserve?.unlockedXmr ?? "0").toFixed(4)}
            sub="XMR"
          />
        </div>

        {/* Divider */}
        <div style={{ borderTop: "1px solid var(--border)" }} />

        {/* Deposit */}
        <div>
          <p className="text-xs tracking-wide uppercase mb-4" style={{ color: "var(--text-muted)" }}>
            Deposit XMR
          </p>
          <div className="flex gap-0">
            <input
              type="text"
              placeholder="Solana address"
              value={solanaPubkey}
              onChange={(e) => setSolanaPubkey(e.target.value)}
              className="flex-1 px-3 py-2.5 text-xs font-mono outline-none"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRight: "none",
                borderRadius: "6px 0 0 6px",
                color: "var(--text-primary)",
              }}
            />
            <button
              onClick={generateAddress}
              disabled={busy || !solanaPubkey}
              className="px-5 py-2.5 text-xs tracking-wide rounded-r transition-colors disabled:opacity-40"
              style={{
                background: busy ? "var(--border)" : "var(--accent)",
                color: "#fff",
                border: "1px solid var(--accent)",
              }}
            >
              {busy ? "..." : "Generate"}
            </button>
          </div>

          {error && <p className="mt-3 text-xs" style={{ color: "var(--red)" }}>{error}</p>}

          {depositAddress && (
            <div
              className="mt-4 flex items-start gap-3 px-3 py-3"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "6px",
              }}
            >
              <span
                className="flex-1 text-xs font-mono break-all leading-relaxed select-all"
                style={{ color: "var(--accent)" }}
              >
                {depositAddress}
              </span>
              <button
                onClick={() => copy(depositAddress)}
                className="text-xs shrink-0 transition-colors"
                style={{ color: "var(--text-muted)" }}
              >
                Copy
              </button>
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ borderTop: "1px solid var(--border)" }} />

        {/* Transactions */}
        <div>
          <p className="text-xs tracking-wide uppercase mb-4" style={{ color: "var(--text-muted)" }}>
            Transactions
          </p>
          {transactions.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No transactions yet.</p>
          ) : (
            <div className="space-y-0">
              {transactions.slice(0, 10).map((tx, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-3"
                  style={{
                    borderBottom: i < 9 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <div className="flex items-center gap-4">
                    <span
                      className="text-xs font-medium tracking-wide"
                      style={{
                        color: tx.type === "deposit" ? "var(--accent)" : "var(--purple)",
                      }}
                    >
                      {tx.type === "deposit" ? "Deposit" : "Burn"}
                    </span>
                    <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                      {tx.destination}
                    </span>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-xs font-mono">{tx.amountXmr}</span>
                    <StatusBadge status={tx.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer
        className="px-6 py-6 flex items-center justify-between"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
          <span>Stagenet</span>
          <span>·</span>
          <span>Localnet</span>
        </div>
        {reserve?.note && (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{reserve.note}</p>
        )}
      </footer>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: string;
}) {
  return (
    <div>
      <p className="text-[11px] tracking-wide uppercase" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      <p className="text-xl font-medium mt-0.5" style={accent ? { color: accent } : {}}>
        {value}
      </p>
      <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
        {sub}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "confirmed" || status === "released"
      ? "var(--green)"
      : status === "failed"
        ? "var(--red)"
        : "var(--yellow)";
  return (
    <span className="text-[11px] font-medium tracking-wide uppercase" style={{ color }}>
      {status}
    </span>
  );
}
