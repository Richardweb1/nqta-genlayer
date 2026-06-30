import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import type { Hash } from "genlayer-js/types";
import {
  ArrowRight,
  Check,
  CircleAlert,
  ExternalLink,
  Link as LinkIcon,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import {
  CONTRACT_ADDRESS,
  EXPLORER_URL,
  TASK_BRIEF,
  TASK_ID,
  createWriteClient,
  ensureBradburyNetwork,
  errorMessage,
  readClient,
  shortAddress,
} from "./genlayer";

type Phase = "idle" | "signing" | "pending" | "proposing" | "committing" | "revealing" | "accepted" | "finalized";
type Result = { verdict: string; score: number; reason: string };

const phaseLabel: Record<Phase, string> = {
  idle: "Ready",
  signing: "Confirm in wallet",
  pending: "Pending",
  proposing: "Proposing",
  committing: "Committing",
  revealing: "Revealing",
  accepted: "Accepted",
  finalized: "Finalized",
};

function normalizePhase(value?: string): Phase {
  const phase = value?.toLowerCase();
  return phase && phase in phaseLabel ? (phase as Phase) : "pending";
}

export default function App() {
  const [account, setAccount] = useState<`0x${string}` | null>(null);
  const [taskReady, setTaskReady] = useState(false);
  const [checkingTask, setCheckingTask] = useState(true);
  const [proofUrl, setProofUrl] = useState("https://cortex-ledger.vercel.app");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [consensus, setConsensus] = useState("IDLE");
  const [result, setResult] = useState<Result | null>(null);
  const [submissionId, setSubmissionId] = useState("");
  const alive = useRef(true);

  const busy = phase !== "idle" && phase !== "finalized";

  const refreshTask = useCallback(async () => {
    setCheckingTask(true);
    try {
      const brief = await readClient.readContract({
        address: CONTRACT_ADDRESS,
        functionName: "get_task",
        args: [TASK_ID],
      });
      setTaskReady(typeof brief === "string" && brief.length > 0);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setCheckingTask(false);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    void refreshTask();
    void window.ethereum?.request({ method: "eth_accounts" }).then((accounts) => {
      const first = Array.isArray(accounts) ? accounts[0] : null;
      if (typeof first === "string") setAccount(first as `0x${string}`);
    });
    return () => { alive.current = false; };
  }, [refreshTask]);

  const connectWallet = async () => {
    setError("");
    if (!window.ethereum) {
      setError("MetaMask is required to sign a GenLayer transaction.");
      return null;
    }
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const first = Array.isArray(accounts) ? accounts[0] : null;
      if (typeof first !== "string") throw new Error("No wallet account was returned.");
      const address = first as `0x${string}`;
      await ensureBradburyNetwork();
      const client = createWriteClient(address);
      setAccount(address);
      return { address, client };
    } catch (err) {
      setError(errorMessage(err));
      return null;
    }
  };

  const pollTransaction = async (hash: `0x${string}`, id?: string) => {
    for (let attempt = 0; attempt < 180 && alive.current; attempt += 1) {
      const tx = await readClient.getTransaction({ hash: hash as Hash });
      const statusName = String(tx.statusName || "PENDING");
      const nextPhase = normalizePhase(statusName);
      setPhase(nextPhase);
      setConsensus(String(tx.resultName || "IDLE"));

      if (nextPhase === "accepted" || nextPhase === "finalized") {
        if (id) {
          const [verdict, score, reason] = await Promise.all([
            readClient.readContract({ address: CONTRACT_ADDRESS, functionName: "get_verdict", args: [id] }),
            readClient.readContract({ address: CONTRACT_ADDRESS, functionName: "get_score", args: [id] }),
            readClient.readContract({ address: CONTRACT_ADDRESS, functionName: "get_reason", args: [id] }),
          ]);
          setResult({ verdict: String(verdict), score: Number(score), reason: String(reason) });
        }
        if (nextPhase === "finalized") return;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 5000));
    }
  };

  const publishTask = async () => {
    setError("");
    setPhase("signing");
    try {
      const wallet = account ? { address: account, client: createWriteClient(account) } : await connectWallet();
      if (!wallet) { setPhase("idle"); return; }
      await ensureBradburyNetwork();
      const hash = await wallet.client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: "create_task",
        args: [TASK_ID, TASK_BRIEF],
        value: 0n,
      });
      setTxHash(hash);
      await pollTransaction(hash);
      await refreshTask();
    } catch (err) {
      setError(errorMessage(err));
      setPhase("idle");
    }
  };

  const submitProof = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setResult(null);
    try {
      const parsed = new URL(proofUrl);
      if (parsed.protocol !== "https:") throw new Error("Use a public HTTPS link.");
      setPhase("signing");
      const wallet = account ? { address: account, client: createWriteClient(account) } : await connectWallet();
      if (!wallet) { setPhase("idle"); return; }
      await ensureBradburyNetwork();
      const id = `nqta-${wallet.address.slice(2, 10)}-${Date.now()}`;
      setSubmissionId(id);
      const hash = await wallet.client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: "verify",
        args: [id, TASK_ID, proofUrl],
        value: 0n,
      });
      setTxHash(hash);
      await pollTransaction(hash, id);
    } catch (err) {
      setError(errorMessage(err));
      setPhase("idle");
    }
  };

  return (
    <div className="site-shell">
      <a className="skip-link" href="#submission">Skip to submission</a>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Nqta home"><span>n</span>qta.</a>
        <div className="header-actions">
          <div className="network"><i aria-hidden="true" />Bradbury Testnet</div>
          <button className="wallet-button" type="button" onClick={() => void connectWallet()}>
            <Wallet size={18} aria-hidden="true" />
            {account ? shortAddress(account) : "Connect wallet"}
          </button>
        </div>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <p className="eyebrow"><Sparkles size={17} aria-hidden="true" />Proof, checked by consensus</p>
          <h1 id="hero-title">Good work deserves<br /><em>a clear verdict.</em></h1>
          <p className="hero-copy">Nqta checks submitted work against the brief, then records a neutral decision on GenLayer.</p>
          <a className="primary-link" href="#submission">Try the demo <ArrowRight size={19} aria-hidden="true" /></a>
        </section>

        <section className="workbench" id="submission" aria-label="Submission verifier">
          <article className="task-panel">
            <div className="panel-kicker"><span>Open task</span><b>01</b></div>
            <h2>Ship a one-page product site</h2>
            <p>Build a responsive landing page with a clear headline, one primary CTA, and a working mobile layout.</p>
            <div className="criteria">
              <h3>Acceptance criteria</h3>
              <ul>
                <li><Check size={19} aria-hidden="true" />Clear product headline</li>
                <li><Check size={19} aria-hidden="true" />Primary CTA is visible</li>
                <li><Check size={19} aria-hidden="true" />Works on mobile</li>
              </ul>
            </div>
            <div className="reward"><span>Completion reward</span><strong>120 NQ</strong></div>
          </article>

          <div className="proof-panel">
            <div className="panel-kicker"><span>Your proof</span><span>Step 1 of 1</span></div>
            <h2>Show us the work.</h2>
            <p>Add a public link that validators can independently inspect.</p>

            {!taskReady && !checkingTask ? (
              <div className="setup-card">
                <ShieldCheck size={24} aria-hidden="true" />
                <div><strong>One-time setup</strong><p>Publish this demo brief to the new Nqta contract before accepting submissions.</p></div>
                <button type="button" onClick={() => void publishTask()} disabled={busy}>
                  {busy ? <LoaderCircle className="spin" size={19} /> : null} Publish demo task
                </button>
              </div>
            ) : (
              <form onSubmit={(event) => void submitProof(event)} noValidate>
                <label htmlFor="proof-url">Proof URL</label>
                <div className="input-wrap"><LinkIcon size={20} aria-hidden="true" /><input id="proof-url" type="url" required value={proofUrl} onChange={(event) => setProofUrl(event.target.value)} placeholder="https://your-project.com" /></div>
                <p className="helper"><ExternalLink size={14} aria-hidden="true" />Must be publicly accessible</p>
                <label htmlFor="note">Short note <span>(optional)</span></label>
                <textarea id="note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="What should validators pay attention to?" maxLength={240} />
                {error ? <div className="error" role="alert"><CircleAlert size={18} />{error}</div> : null}
                <button className="submit-button" type="submit" disabled={busy || checkingTask}>
                  {busy ? <LoaderCircle className="spin" size={20} aria-hidden="true" /> : null}
                  {busy ? phaseLabel[phase] : "Verify submission"}<ArrowRight size={20} aria-hidden="true" />
                </button>
              </form>
            )}

            {checkingTask ? <p className="checking"><LoaderCircle className="spin" size={18} />Reading finalized contract state…</p> : null}
            {error && !taskReady ? <div className="error" role="alert"><CircleAlert size={18} />{error}</div> : null}
            <p className="trust"><ShieldCheck size={18} aria-hidden="true" />Evaluated by independent AI validators, not a single server.</p>
          </div>
        </section>

        {txHash ? (
          <section className="result-card" aria-live="polite">
            <div><p className="eyebrow">On-chain progress</p><h2>{result ? `${result.verdict} · ${result.score}/10` : phaseLabel[phase]}</h2>{result ? <p>{result.reason}</p> : <p>Consensus: {consensus}</p>}</div>
            <div className="result-actions">
              <code>{txHash}</code>
              {submissionId ? <small>Submission: {submissionId}</small> : null}
              <a href={`${EXPLORER_URL}/tx/${txHash}`} target="_blank" rel="noreferrer">View transaction <ExternalLink size={16} /></a>
              <button type="button" onClick={() => void refreshTask()}><RefreshCw size={16} />Refresh state</button>
            </div>
          </section>
        ) : null}
      </main>

      <footer><span>Nqta on GenLayer</span><a href={`${EXPLORER_URL}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer">Contract {shortAddress(CONTRACT_ADDRESS)} <ExternalLink size={14} /></a></footer>
    </div>
  );
}
