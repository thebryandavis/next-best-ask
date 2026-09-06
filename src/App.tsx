import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Braces } from "lucide-react";
import { defaultContext, evaluateDecision } from "../shared/decision-engine.js";
import { evidence, opportunities, originOptions, sectionOptions, storyModeOptions } from "./data";
import type { Decision, EvidenceLevel, JourneyContext } from "./types";

const actionCopy: Record<string, string> = {
  signup: "Offer a newsletter, not a payment ask",
  account: "Offer an account with saves and alerts",
  app: "Hand the habit to the app",
  donation: "Make the donation ask, and make it specific",
  sustain: "Invite monthly support, once",
  steward: "Show the donor what the gift funded",
  winback: "Welcome a past supporter back",
  alerts: "Offer alerts only. Breaking news is not a fundraising moment",
  advertising: "Leave the ad in place",
  quiet: "Ask for nothing",
};

const percent = (value: number) => `${Math.round(value * 100)}%`;

function levelLabel(level: EvidenceLevel) {
  return level.charAt(0).toUpperCase() + level.slice(1);
}

function Header() {
  const links = [
    ["Problem", "#problem"],
    ["Policy", "#policy"],
    ["Lab", "#lab"],
    ["Roadmap", "#roadmap"],
    ["Sources", "#sources"],
  ];
  return (
    <header className="site-header">
      <a className="wordmark" href="#top">Next Best Ask</a>
      <nav aria-label="Primary">
        {links.map(([label, href]) => (
          <a key={href} href={href}>{label}</a>
        ))}
      </nav>
      <a className="header-link" href="https://github.com/thebryandavis/next-best-ask" target="_blank" rel="noreferrer">
        Source <ArrowUpRight size={14} />
      </a>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero" id="problem">
      <p className="eyebrow">A working prototype · Example brand: AP News</p>
      <h1>
        One ask per reader.
        <br />
        <span>Explained.</span>
      </h1>
      <div className="hero-split">
        <p className="lede">
          A reader-supported newsroom can show the same person a newsletter prompt, an account prompt, an app banner and a
          donation ask on a single visit. Each one makes sense to the team that owns it. Together they read as noise.
        </p>
        <p className="lede">
          Next Best Ask is a small policy service that picks one of those asks for one reader on one story, and returns
          the reason. The goal is more first-party relationships and more donations, with fewer interruptions.
        </p>
      </div>
      <div className="cta-row">
        <a className="button" href="#lab">Try the decision lab <ArrowRight size={16} /></a>
        <a className="text-link" href="#sources">What it is based on</a>
      </div>
    </section>
  );
}

function Policy() {
  const rules = [
    {
      n: "01",
      title: "Relationship before money.",
      body: "An engaged anonymous reader is offered an email relationship first. The donation ask waits until there is a known reader with a habit and a reason to care.",
    },
    {
      n: "02",
      title: "Some moments are off limits.",
      body: "No payment ask during breaking news. No more than a handful of asks in a week. Never an acquisition ask to someone who already gives.",
    },
    {
      n: "03",
      title: "Every decision carries its reason.",
      body: "The API returns the ask, a reason code, a fallback and a seven-step trace. An editor, a fundraiser and an engineer can disagree about the same record.",
    },
  ];
  return (
    <section className="policy" id="policy">
      <p className="eyebrow">What the policy says</p>
      <div className="rules">
        {rules.map((rule) => (
          <article key={rule.n}>
            <span className="rule-index">{rule.n}</span>
            <h2>{rule.title}</h2>
            <p>{rule.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function RangeControl({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (value: number) => string;
  onChange: (value: number) => void;
}) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <label className="range">
      <span className="range-label">
        {label}
        <output>{format ? format(value) : value}</output>
      </span>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ ["--fill" as string]: `${fill}%` }}
      />
    </label>
  );
}

function Select<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly { id: T; label: string }[]; onChange: (value: T) => void }) {
  return (
    <label className="select">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <option key={option.id} value={option.id}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

const identityOptions = [
  { id: "anonymous", label: "Anonymous" },
  { id: "known", label: "Email known" },
  { id: "registered", label: "Registered account" },
  { id: "donor", label: "Current donor" },
  { id: "lapsed-donor", label: "Lapsed donor" },
] as const;

const consentOptions = [
  { id: "essential", label: "Essential only" },
  { id: "analytics", label: "Analytics" },
  { id: "personalization", label: "Personalization" },
] as const;

function Lab() {
  const [context, setContext] = useState<JourneyContext>(defaultContext as JourneyContext);
  const [decision, setDecision] = useState<Decision>(() => evaluateDecision(defaultContext as JourneyContext));
  const [status, setStatus] = useState<"live" | "fallback" | "loading">("live");
  const [showPayload, setShowPayload] = useState(false);
  const sequence = useRef(0);

  useEffect(() => {
    const current = ++sequence.current;
    setStatus("loading");
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/decision", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(context),
        });
        if (!response.ok) throw new Error("unavailable");
        const next = (await response.json()) as Decision;
        if (sequence.current === current) {
          setDecision(next);
          setStatus("live");
        }
      } catch {
        if (sequence.current === current) {
          setDecision(evaluateDecision(context));
          setStatus("fallback");
        }
      }
    }, 160);
    return () => window.clearTimeout(timer);
  }, [context]);

  const update = <K extends keyof JourneyContext>(key: K, value: JourneyContext[K]) =>
    setContext((current) => ({ ...current, [key]: value }));

  const section = sectionOptions.find((item) => item.id === context.section)!;
  const origin = originOptions.find((item) => item.id === context.origin)!;
  const scores = ["donation", "signup", "mission", "fatigue", "ad"];
  if (decision.scores.partner > 0) scores.splice(3, 0, "partner");

  return (
    <section className="lab" id="lab">
      <div className="lab-intro">
        <p className="eyebrow light">Decision lab · live API</p>
        <h2>Change the reader. Watch the ask change.</h2>
        <p>
          Every control below is a field in the request. The response is the single ask the policy would make, with its
          reason and the scores behind it. Nothing here is a production model.
        </p>
      </div>

      <div className="lab-grid">
        <div className="controls">
          <fieldset>
            <legend>Section</legend>
            <div className="segments">
              {sectionOptions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={context.section === item.id ? "active" : ""}
                  aria-pressed={context.section === item.id}
                  onClick={() => update("section", item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </fieldset>

          <Select label="Discovery origin" value={context.origin} options={originOptions} onChange={(value) => { update("origin", value); update("partnerEngagement", value === "direct" ? 0 : 0.72); }} />
          <Select label="Relationship" value={context.identity} options={identityOptions} onChange={(value) => update("identity", value)} />
          <Select label="Story mode" value={context.storyMode} options={storyModeOptions} onChange={(value) => update("storyMode", value)} />
          <Select label="Consent" value={context.consent} options={consentOptions} onChange={(value) => update("consent", value)} />

          <div className="ranges">
            <RangeControl label="Visits, 30 days" value={context.visits30d} min={0} max={20} step={1} onChange={(value) => update("visits30d", value)} />
            <RangeControl label="Engaged minutes" value={context.engagedMinutes} min={0} max={40} step={1} onChange={(value) => update("engagedMinutes", value)} />
            {context.origin !== "direct" && (
              <RangeControl label="Partner engagement" value={context.partnerEngagement} min={0} max={1} step={0.01} format={percent} onChange={(value) => update("partnerEngagement", value)} />
            )}
            <RangeControl label="Mission affinity" value={context.missionAffinity} min={0} max={1} step={0.01} format={percent} onChange={(value) => update("missionAffinity", value)} />
            <RangeControl label="Asks seen this week" value={context.asksSeen7d} min={0} max={8} step={1} onChange={(value) => update("asksSeen7d", value)} />
            <RangeControl label="Ad value" value={context.adValue} min={0} max={1} step={0.01} format={percent} onChange={(value) => update("adValue", value)} />
            {context.identity === "donor" && (
              <RangeControl label="Lapse risk" value={context.lapseRisk} min={0} max={1} step={0.01} format={percent} onChange={(value) => update("lapseRisk", value)} />
            )}
          </div>
        </div>

        <div className="result">
          <div className="result-status">
            <span className={`dot ${status}`} />
            {status === "loading" ? "Recomputing" : status === "live" ? "Live response" : "Local fallback"}
            <code>{decision.decisionId}</code>
          </div>

          <p className="result-path">
            {origin.label} <ArrowRight size={14} /> {section.label} <ArrowRight size={14} /> {context.identity.replace("-", " ")}
          </p>
          <h3>{actionCopy[decision.action] ?? actionCopy.quiet}.</h3>
          <p className="result-rationale">{decision.rationale}</p>

          <dl className="result-meta">
            <div><dt>Action</dt><dd>{decision.action}</dd></div>
            <div><dt>Treatment</dt><dd>{decision.treatment}</dd></div>
            <div><dt>Reason</dt><dd>{decision.reasonCode}</dd></div>
            <div><dt>Fallback</dt><dd>{decision.fallback}</dd></div>
          </dl>

          <div className="scores">
            {scores.map((key) => (
              <div className="score" key={key}>
                <span>{key}</span>
                <i><b style={{ transform: `scaleX(${decision.scores[key] ?? 0})` }} /></i>
                <code>{(decision.scores[key] ?? 0).toFixed(2)}</code>
              </div>
            ))}
          </div>

          <button type="button" className="payload-toggle" onClick={() => setShowPayload(!showPayload)} aria-expanded={showPayload}>
            <Braces size={15} /> {showPayload ? "Hide" : "Show"} request and response
          </button>
          {showPayload && (
            <pre className="payload"><code>{JSON.stringify({ request: context, response: { action: decision.action, treatment: decision.treatment, reasonCode: decision.reasonCode, fallback: decision.fallback, experimentCell: decision.experimentCell, scores: decision.scores } }, null, 2)}</code></pre>
          )}
        </div>

        <ol className="trace" aria-label="Decision trace">
          {decision.trace.map((step, index) => (
            <li key={step.id} className={step.status}>
              <span className="trace-index">{index + 1}</span>
              <div>
                <strong>{step.label}</strong>
                <p>{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Flow() {
  const steps = [
    ["Origin", "Search, social, aggregator, AI assistant, member site or direct."],
    ["Reader state", "Anonymous, email known, registered, donor or lapsed donor."],
    ["Policy", "Guardrails first, then scores, then the section's own thresholds."],
    ["Surface", "The newsletter, account, app, donation or ad system renders it."],
    ["Outcome", "Exposure, sign-up, gift and retention flow back into the record."],
  ];
  return (
    <section className="flow">
      <p className="eyebrow">Where it sits</p>
      <h2>A thin layer between what you know about a reader and what you show them.</h2>
      <ol>
        {steps.map(([title, body], index) => (
          <li key={title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{title}</strong>
            <p>{body}</p>
          </li>
        ))}
      </ol>
      <p className="flow-note">It does not replace the newsletter, account, app, donation or ad systems. It gives them one decision and one measurement contract.</p>
    </section>
  );
}

function Roadmap() {
  const items = opportunities.slice(0, 6);
  return (
    <section className="roadmap" id="roadmap">
      <p className="eyebrow">First 90 days</p>
      <h2>Guardrails before optimization.</h2>
      <ol>
        {items.map((item, index) => (
          <li key={item.id}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <strong>{item.title}</strong>
              <p>{item.thesis}</p>
              <small>{item.metric}</small>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Sources() {
  const [level, setLevel] = useState<"all" | EvidenceLevel>("all");
  const shown = evidence.filter((item) => level === "all" || item.level === level);
  return (
    <section className="sources" id="sources">
      <p className="eyebrow">Sources</p>
      <h2>Public pages and public reports. Nothing internal.</h2>
      <p className="sources-note">
        AP News is the example brand because it is a nonprofit newsroom with a public donate page, flagship newsletters,
        sign-in and apps. Every claim below is labeled by how it is known.
      </p>
      <div className="level-filter" role="group" aria-label="Filter by evidence level">
        {(["all", "observed", "public", "proposed"] as const).map((item) => (
          <button key={item} type="button" className={level === item ? "active" : ""} onClick={() => setLevel(item)}>
            {item === "all" ? "All" : levelLabel(item)}
          </button>
        ))}
      </div>
      <ul>
        {shown.map((item) => (
          <li key={item.id}>
            <span className={`tag ${item.level}`}>{levelLabel(item.level)}</span>
            <div>
              <strong>{item.capability}</strong>
              <p>{item.signal}</p>
              <a href={item.url} target={item.url.startsWith("#") ? undefined : "_blank"} rel="noreferrer">{item.source} <ArrowUpRight size={12} /></a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Footer() {
  return (
    <footer>
      <p>
        Next Best Ask is independent portfolio work by Bryan Davis. It is not an AP product and uses no internal AP data.
      </p>
      <div>
        <a href="https://github.com/thebryandavis/next-best-ask" target="_blank" rel="noreferrer">GitHub <ArrowUpRight size={12} /></a>
        <a href="https://github.com/thebryandavis/growth-room-lab" target="_blank" rel="noreferrer">Companion: Growth Room <ArrowUpRight size={12} /></a>
        <a href="https://bryandavis.media" target="_blank" rel="noreferrer">bryandavis.media <ArrowUpRight size={12} /></a>
      </div>
    </footer>
  );
}

export default function App() {
  useEffect(() => {
    if (!window.location.hash) return;
    const timer = window.setTimeout(() => document.querySelector(window.location.hash)?.scrollIntoView(), 80);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <div id="top">
      <Header />
      <main>
        <Hero />
        <Policy />
        <Lab />
        <Flow />
        <Roadmap />
        <Sources />
      </main>
      <Footer />
    </div>
  );
}
