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
    <main className="mx-auto max-w-3xl px-4 pb-20">
      {!DEPLOYED && (
        <p className="mt-6 rounded border border-warning/40 bg-card px-4 py-3 text-xs text-warning">
          contract not deployed yet — run <code>npm run deploy</code> after funding the deployer
        </p>
      )}

      <p className="mt-6 text-xs text-muted-foreground">
        Total tipped: <span className="text-foreground">{totalTipped ?? "—"} BOT</span> · every tip
        splits 95% creator / 5% treasury on-chain.
      </p>

      <section className="mt-6 rounded-lg border border-border bg-card p-5">
        <h2 className="text-sm font-bold text-foreground">Tip a creator</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Send BOT to a handle — a Telegram or X username — instead of an address.
        </p>
        <div className="mt-4 flex gap-2">
          <input
            value={handle}
            onChange={(e) => void lookup(e.target.value)}
            placeholder="creator handle (no @ needed)"
            aria-label="creator handle"
            className="flex-1 rounded border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-steel focus:border-primary focus:outline-none"
          />
        </div>

        {handle && HANDLE_RE.test(handle) && !lookupBusy && (
          <div className="mt-3 text-xs">
            {creator ? (
              <div className="flex items-center justify-between rounded border border-border bg-background px-3 py-2">
                <span className="text-secondary">
                  @{handle} →{" "}
                  <a
                    className="font-mono underline decoration-dotted underline-offset-2 hover:text-foreground"
                    href={`${NET.explorer}/address/${creator}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {short(creator)}
                  </a>
                </span>
                <span className="text-success">claimed ✓</span>
              </div>
            ) : (
              <p className="text-warning">@{handle} is unclaimed</p>
            )}
          </div>
        )}

        {creator ? (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setAmount(p);
                    setCustom("");
                  }}
                  aria-pressed={!custom && amount === p}
                  className={`rounded border px-3 py-1.5 text-xs ${
                    !custom && amount === p
                      ? "border-primary text-primary"
                      : "border-border text-secondary hover:border-secondary"
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
                className="w-24 rounded border border-border bg-background px-2 py-1.5 text-xs text-foreground placeholder:text-steel focus:border-primary focus:outline-none"
              />
            </div>
            <button
              onClick={tip}
              disabled={busy || status !== "ready"}
              className="mt-4 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
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
              className="mt-3 rounded border border-primary px-4 py-2 text-sm text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
            >
              {busy ? "claiming…" : `Claim @${handle} for your wallet`}
            </button>
          )
        )}

        {myHandle && (
          <p className="mt-4 text-[11px] text-muted-foreground">
            your handle: <span className="text-primary">@{myHandle}</span>
          </p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-bold text-foreground">Recent tips</h2>
        {tips.length === 0 ? (
          <p className="mt-3 rounded border border-dashed border-border-strong px-4 py-8 text-center text-xs text-muted-foreground">
            {DEPLOYED ? "no tips yet" : "deploy the contract to populate"}
          </p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {tips.map((t) => (
              <li
                key={t.tx}
                className="flex items-center justify-between rounded border border-border bg-card px-3 py-2 text-xs"
              >
                <span className="text-secondary">
                  <a
                    className="font-mono underline decoration-dotted underline-offset-2 hover:text-foreground"
                    href={`${NET.explorer}/address/${t.tipper}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {short(t.tipper)}
                  </a>{" "}
                  tipped <span className="text-primary">@{t.handle}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-foreground">{Number(t.amount).toFixed(3)} BOT</span>
                  <a
                    className="text-steel underline decoration-dotted underline-offset-2 hover:text-secondary"
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
      <div className="min-h-screen bg-surface text-foreground font-sans">
        <header className="mx-auto flex max-w-3xl items-center justify-between px-4 pt-6">
          <div>
            <h1 className="text-base font-bold tracking-tight text-foreground">
              <span className="text-primary">▮</span> CreatorTips
            </h1>
            <p className="text-[11px] text-muted-foreground">
              tip creators by handle · BOT Chain mainnet
            </p>
          </div>
          <ConnectWalletButton />
        </header>
        <Tips />
      </div>
      <Toaster />
    </WalletProvider>
  );
}
