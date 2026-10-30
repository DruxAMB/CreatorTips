"use client";

import { useCallback, useEffect, useState } from "react";
import { BrowserProvider, Contract, JsonRpcProvider, formatEther, parseEther } from "ethers";
import { toast } from "sonner";
import { WalletProvider, ConnectWalletButton, useWallet } from "./Wallet";
import Toaster from "./Toaster";
import { NET } from "../lib/chain";
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "../lib/contract";

const DEPLOYED = CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000";
const PRESETS = ["0.01", "0.05", "0.1"];
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

type Tip = { handle: string; tipper: string; creator: string; amount: string; ts: number; tx: string };

function readContract() {
  const p = new JsonRpcProvider(NET.rpc, NET.chainId, { staticNetwork: true });
  return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI as unknown as string[], p);
}

const norm = (h: string) => h.trim().replace(/^@/, "").toLowerCase();
const HANDLE_RE = /^[a-z0-9._-]{2,32}$/;

function Tips() {
  const { status, address, provider } = useWallet();
  const [handle, setHandle] = useState("");
  const [creator, setCreator] = useState<string | null>(null);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [amount, setAmount] = useState(PRESETS[1]);
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [tips, setTips] = useState<Tip[]>([]);
  const [myHandle, setMyHandle] = useState("");
  const [totalTipped, setTotalTipped] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!DEPLOYED) return;
    try {
      const c = readContract();
      const [tt, logs] = await Promise.all([
        c.totalTipped().catch(() => 0n),
        c.queryFilter(c.filters.Tipped(), -50_000).catch(() => []),
      ]);
      setTotalTipped(formatEther(tt));
      const feed: Tip[] = await Promise.all(
        logs.slice(-30).map(async (l: any) => ({
          handle: l.args[1],
          tipper: l.args[2],
          creator: l.args[3],
          amount: formatEther(l.args[4]),
          ts: Number((await l.getBlock()).timestamp),
          tx: l.transactionHash,
        }))
      );
      setTips(feed.reverse());
    } catch {
      toast.error("could not load tips feed");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, busy]);

  useEffect(() => {
    if (status !== "ready" || !DEPLOYED) return setMyHandle("");
    readContract()
      .handleOf(address)
      .then((h: string) => setMyHandle(h))
      .catch(() => {});
  }, [status, address, busy]);

  const lookup = async (raw: string) => {
    const h = norm(raw);
    setHandle(h);
    if (!HANDLE_RE.test(h)) {
      setCreator(null);
      return;
    }
    setLookupBusy(true);
    try {
      const a = await readContract().resolveHandle(h);
      setCreator(a === "0x0000000000000000000000000000000000000000" ? null : a);
    } catch {
      setCreator(null);
    } finally {
      setLookupBusy(false);
    }
  };

  const claim = async () => {
    const h = norm(handle);
    if (status !== "ready" || !provider) return toast.warning("connect your wallet first");
    if (!HANDLE_RE.test(h)) return toast.warning("handle: 2-32 chars, lowercase a-z 0-9 . _ -");
    setBusy(true);
    try {
      const signer = await new BrowserProvider(provider as any).getSigner();
      const c = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI as unknown as string[], signer);
      const tx = await c.setHandle(h);
      toast.info("claiming handle…");
      const r = await tx.wait();
      if (r.status === 1) {
        toast.success(`@${h} is yours`);
        setMyHandle(h);
      } else toast.error("transaction reverted");
    } catch (e: any) {
      const m = e?.shortMessage ?? e?.reason ?? "claim failed";
      toast.error(m.includes("handle taken") ? "that handle is taken" : m);
    } finally {
      setBusy(false);
    }
  };

  const tip = async () => {
    if (status !== "ready" || !provider) return toast.warning("connect your wallet first");
    if (!creator) return toast.warning("no creator found for that handle");
    const amt = custom || amount;
    let v: bigint;
    try {
      v = parseEther(amt);
    } catch {
      return toast.warning("invalid amount");
    }
    if (v <= 0n) return toast.warning("amount must be positive");
    setBusy(true);
    try {
      const signer = await new BrowserProvider(provider as any).getSigner();
      const c = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI as unknown as string[], signer);
      const tx = await c.tipHandle(handle, { value: v });
      toast.info("sending tip…");
      const r = await tx.wait();
      if (r.status === 1) toast.success(`tipped ${amt} BOT to @${handle} (creator got 95%)`);
      else toast.error("transaction reverted");
    } catch (e: any) {
      const m = e?.shortMessage ?? e?.reason ?? "tip failed";
      toast.error(m.includes("tip too small") ? "below the 0.001 BOT minimum" : m);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-4xl px-4 pb-24 sm:px-6">
      {!DEPLOYED && (
        <p className="mt-6 rounded-md border border-warning/40 bg-card px-4 py-3 text-sm text-warning">
          contract not deployed yet — run <code>npm run deploy</code> after funding the deployer
        </p>
      )}

      {/* Hero — white paper card on mint canvas, coral tip-card visual */}
      <section className="mt-8 rounded-xl bg-card p-8 sm:p-12">
        <div className="grid items-center gap-10 md:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="font-display text-xl font-bold text-coral">Live on BOT Chain · chain 677</p>
            <h2 className="font-display mt-3 text-4xl font-extrabold leading-[1.15] text-foreground sm:text-5xl">
              Tip a creator,<br />
              <span className="text-coral">skip the address.</span>
            </h2>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-steel sm:text-xl">
              Send BOT to a handle — a Telegram or X username — instead of a raw address.
              Every tip splits 95% creator / 5% treasury, enforced on-chain.
            </p>
            <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-elevated px-4 py-2 text-sm font-semibold text-secondary">
              <span aria-hidden className="h-2 w-2 rounded-full bg-success" />
              {totalTipped ?? "—"} BOT tipped so far
            </p>
          </div>

          {/* The card product — Monzo's one permitted coral fill */}
          <div className="tip-card mx-auto w-full max-w-[300px] rounded-lg p-6 text-white md:rotate-3">
            <div className="flex items-center justify-between">
              <span className="font-display text-sm font-bold tracking-tight">CreatorTips</span>
              <span className="text-[10px] uppercase tracking-widest opacity-80">BOT</span>
            </div>
            <div className="mt-8 h-8 w-11 rounded-md bg-white/25" aria-hidden />
            <p className="mt-6 font-mono text-sm tracking-wider opacity-95">@handle → wallet</p>
            <div className="mt-5 flex items-end justify-between">
              <span className="text-xs opacity-80">95% to creators</span>
              <span className="font-display text-lg font-bold">0.05 BOT</span>
            </div>
          </div>
        </div>
      </section>

      {/* Tip flow */}
      <section className="mt-6 rounded-lg bg-card p-8">
        <h3 className="font-display text-2xl font-bold text-foreground">Send a tip</h3>
        <p className="mt-1 text-base text-steel">
          Type a handle — we resolve it to the wallet that claimed it.
        </p>

        <input
          value={handle}
          onChange={(e) => void lookup(e.target.value)}
          placeholder="creator handle (no @ needed)"
          aria-label="creator handle"
          className="mt-5 w-full rounded-md border border-border-strong bg-background px-5 py-3.5 text-base text-foreground placeholder:text-steel focus:border-coral focus:outline-none"
        />

        {handle && HANDLE_RE.test(handle) && !lookupBusy && (
          <div className="mt-3 text-sm">
            {creator ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-elevated px-4 py-3">
                <span className="text-secondary">
                  <span className="font-display text-xl font-bold text-coral">@{handle}</span>{" "}
                  <a
                    className="font-mono text-xs text-secondary underline decoration-dotted underline-offset-2 hover:text-foreground"
                    href={`${NET.explorer}/address/${creator}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {short(creator)}
                  </a>
                </span>
                <span className="font-semibold text-success">claimed ✓</span>
              </div>
            ) : (
              <p className="text-warning">@{handle} is unclaimed</p>
            )}
          </div>
        )}

        {creator ? (
          <>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setAmount(p);
                    setCustom("");
                  }}
                  aria-pressed={!custom && amount === p}
                  className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
                    !custom && amount === p
                      ? "bg-primary text-primary-foreground"
                      : "bg-elevated text-secondary hover:bg-border-strong"
                  }`}
                >
                  {p} BOT
                </button>
              ))}
              <input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="custom"
                aria-label="custom tip amount"
                className="w-28 rounded-full border border-border-strong bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-steel focus:border-coral focus:outline-none"
              />
            </div>
            <button
              onClick={tip}
              disabled={busy || status !== "ready"}
              className="mt-6 w-full rounded-full bg-primary px-6 py-3.5 font-display text-base font-bold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50 sm:w-auto sm:px-10"
            >
              {busy ? "sending…" : `Tip @${handle}`}
            </button>
          </>
        ) : (
          handle &&
          HANDLE_RE.test(handle) &&
          !lookupBusy && (
            <button
              onClick={claim}
              disabled={busy || status !== "ready"}
              className="mt-5 rounded-full border-2 border-foreground px-6 py-2.5 font-display text-sm font-bold text-foreground transition-colors hover:bg-elevated disabled:opacity-50"
            >
              {busy ? "claiming…" : `Claim @${handle} for your wallet`}
            </button>
          )
        )}

        {myHandle && (
          <p className="mt-5 text-sm text-steel">
            your handle: <span className="font-display text-xl font-bold text-coral">@{myHandle}</span>
          </p>
        )}
      </section>

      {/* Recent tips — link-list voice, coral handles on hairlines */}
      <section className="mt-6 rounded-lg bg-card p-8">
        <h3 className="font-display text-2xl font-bold text-foreground">Recent tips</h3>
        {tips.length === 0 ? (
          <p className="mt-4 rounded-md border border-dashed border-border-strong px-4 py-10 text-center text-sm text-steel">
            {DEPLOYED ? "no tips yet — be the first" : "deploy the contract to populate"}
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-rule">
            {tips.map((t) => (
              <li key={t.tx} className="flex flex-wrap items-center justify-between gap-2 py-3.5 text-sm">
                <span className="text-secondary">
                  <a
                    className="font-mono text-xs text-steel underline decoration-dotted underline-offset-2 hover:text-foreground"
                    href={`${NET.explorer}/address/${t.tipper}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {short(t.tipper)}
                  </a>{" "}
                  tipped <span className="font-display text-xl font-bold text-coral">@{t.handle}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-display font-semibold text-foreground">
                    {Number(t.amount).toFixed(3)} BOT
                  </span>
                  <a
                    className="text-xs text-steel underline decoration-dotted underline-offset-2 hover:text-secondary"
                    href={`${NET.explorer}/tx/${t.tx}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    tx ↗
                  </a>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

export default function Home() {
  return (
    <WalletProvider chainId={NET.chainId} chainName={NET.name} rpc={NET.rpc} explorer={NET.explorer}>
      <div className="flex min-h-screen flex-col bg-surface text-foreground">
        <header className="border-b border-rule bg-card">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
            <div>
              <h1 className="font-display text-lg font-extrabold tracking-tight text-foreground">
                <span className="text-coral">▮</span> CreatorTips
              </h1>
              <p className="text-xs text-steel">tip creators by handle · BOT Chain mainnet</p>
            </div>
            <ConnectWalletButton />
          </div>
        </header>
        <Tips />
        <footer className="mt-auto bg-navy text-white/90">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-4 py-8 sm:px-6">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/bot-chain.svg" alt="BOT Chain" className="h-5 w-auto" />
              <span className="text-xs text-white/50">· CreatorTips</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <a href="https://www.botchain.ai" target="_blank" rel="noopener noreferrer" className="hover:text-white">
                botchain.ai ↗
              </a>
              <a href="https://scan.botchain.ai" target="_blank" rel="noopener noreferrer" className="hover:text-white">
                BOT Chain Explorer ↗
              </a>
              <a
                href={`${NET.explorer}/address/${CONTRACT_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-white/70 hover:text-white"
              >
                {short(CONTRACT_ADDRESS)}
              </a>
            </div>
          </div>
        </footer>
      </div>
      <Toaster />
    </WalletProvider>
  );
}
