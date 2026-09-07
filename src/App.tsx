import { useEffect, useMemo, useRef, useState } from "react";
import { defaultContext, evaluateDecision, sectionPolicies } from "../shared/decision-engine.js";
import { evidence, originOptions, sectionOptions, storyModeOptions } from "./data";
import type { Decision, EvidenceLevel, JourneyContext } from "./types";

type Preset = { id: string; title: string; note: string; context: JourneyContext };

const presets: Preset[] = [
  {
    id: "politics-regular",
    title: "Regular Politics reader",
    note: "Anonymous · 7 visits · direct",
    context: { ...(defaultContext as JourneyContext) },
  },
  {
    id: "factcheck-assistant",
    title: "Fact Check reader via an AI assistant",
    note: "First visit · high intent",
    context: { ...(defaultContext as JourneyContext), section: "fact-check", origin: "ai-assistant", partnerEngagement: 0.82, visits30d: 1, engagedMinutes: 4, missionAffinity: 0.8 },
  },
  {
    id: "donor-breaking",
    title: "Current donor on breaking news",
    note: "Donor · World · breaking",
    context: { ...(defaultContext as JourneyContext), section: "world", identity: "donor", storyMode: "breaking", visits30d: 10, engagedMinutes: 18, missionAffinity: 0.8, lapseRisk: 0.2 },
  },
  {
    id: "factcheck-loyal",
    title: "Loyal Fact Check reader, email known",
    note: "12 visits · high mission affinity",
    context: { ...(defaultContext as JourneyContext), section: "fact-check", identity: "known", visits30d: 12, engagedMinutes: 20, missionAffinity: 0.85 },
  },
  {
    id: "sports-fatigued",
    title: "Sports fan who has seen five asks",
    note: "Email known · ask fatigue",
    context: { ...(defaultContext as JourneyContext), section: "sports", identity: "known", asksSeen7d: 5, visits30d: 12, engagedMinutes: 9, missionAffinity: 0.3 },
  },
];

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

const actionLabel: Record<string, string> = {
  signup: "Newsletter",
  account: "Account",
  app: "App",
  donation: "Donation",
  sustain: "Monthly upgrade",
  steward: "Stewardship",
  winback: "Win-back",
  alerts: "Alerts",
  advertising: "Ad only",
  quiet: "No ask",
};

const actionHeadline: Record<string, (section: string) => string> = {
  signup: (s) => `Offer the ${newsletterName[s]}`,
  account: () => "Offer an account with saves and alerts",
  app: () => "Hand the habit to the app",
  donation: (s) => `Ask for support of ${sectionName(s)} coverage`,
  sustain: () => "Invite monthly support, once",
  steward: () => "Show the donor what the gift funded",
  winback: () => "Welcome a past supporter back",
  alerts: () => "Offer breaking-news alerts only",
  advertising: () => "Leave the ad in place, ask for nothing",
  quiet: () => "Ask for nothing",
};

const newsletterName: Record<string, string> = {
  politics: "Morning Wire",
  world: "World Briefing",
  "fact-check": "Fact Check alerts",
  sports: "Scores and team alerts",
};

function sectionName(id: string) {
  return sectionOptions.find((s) => s.id === id)?.label ?? id;
}

function equalContext(a: JourneyContext, b: JourneyContext) {
  return (Object.keys(a) as (keyof JourneyContext)[]).every((k) => a[k] === b[k]);
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

/* ---------- small pieces ---------- */

function Check({ tone }: { tone: "pass" | "block" | "na" | "note" }) {
  return (
    <span className={`check ${tone}`} aria-hidden="true">
      {tone === "pass" && <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6.5l2.5 2.5L10 3.5" /></svg>}
      {tone === "block" && <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3l6 6M9 3l-6 6" /></svg>}
      {tone === "na" && <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h6" /></svg>}
      {tone === "note" && <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 3v3.5M6 8.5v.5" /></svg>}
    </span>
  );
}

function Field<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </label>
  );
}

function Slider({ label, value, min, max, step, format, onChange }: { label: string; value: number; min: number; max: number; step: number; format?: (v: number) => string; onChange: (v: number) => void }) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <label className="slider">
      <span><b>{label}</b><output>{format ? format(value) : value}</output></span>
      <input type="range" min={min} max={max} step={step} value={value} aria-label={label} onChange={(e) => onChange(Number(e.target.value))} style={{ ["--fill" as string]: `${fill}%` }} />
    </label>
  );
}

/* ---------- the in-story preview ---------- */

function AskPreview({ action, section }: { action: string; section: string }) {
  const name = sectionName(section);
  if (action === "quiet" || action === "advertising") {
    return (
      <div className="preview-module quiet">
        <div className="ad-slot">{action === "advertising" ? "Advertisement stays in this slot" : "No module is inserted"}</div>
        <p>The reader keeps reading. Nothing is asked on this visit.</p>
      </div>
    );
  }
  if (action === "signup" || action === "alerts") {
    const title = action === "alerts" ? "Get alerts as this story develops" : `Start your morning with the ${newsletterName[section]}`;
    const sub = action === "alerts" ? "Breaking-news alerts, nothing else. Unsubscribe any time." : `The day's biggest ${name.toLowerCase()} stories, free, each weekday.`;
    return (
      <div className="preview-module">
        <div><strong>{title}</strong><span>{sub}</span></div>
        <div className="preview-form"><span className="preview-input">Email address</span><span className="preview-button">Sign up</span></div>
      </div>
    );
  }
  if (action === "account") {
    return (
      <div className="preview-module">
        <div><strong>Save stories and get alerts on the topics you follow</strong><span>You already get our email. An account keeps your reading in one place.</span></div>
        <span className="preview-button">Create account</span>
      </div>
    );
  }
  if (action === "app") {
    return (
      <div className="preview-module">
        <div><strong>You read us most days. The app is faster.</strong><span>Offline reading, alerts, and your saved stories.</span></div>
        <span className="preview-button">Get the app</span>
      </div>
    );
  }
  if (action === "donation" || action === "winback" || action === "sustain") {
    const title = action === "sustain"
      ? "You already support this work. Would you make it monthly?"
      : action === "winback"
        ? "Welcome back. Your past support helped fund this reporting."
        : `Independent ${name.toLowerCase()} coverage is funded by readers like you`;
    const sub = action === "sustain" ? "A monthly gift keeps reporters in the field all year." : "AP is a nonprofit. There is no paywall. Your gift keeps it that way.";
    return (
      <div className="preview-module donate">
        <div><strong>{title}</strong><span>{sub}</span></div>
        <div className="preview-amounts"><span>$5</span><span className="on">$15</span><span>$50</span><span className="preview-button">Give</span></div>
      </div>
    );
  }
  return (
    <div className="preview-module">
      <div><strong>Thank you for supporting this work</strong><span>Here is what your gift helped fund this month. No ask, just the report.</span></div>
      <span className="preview-button">See the impact report</span>
    </div>
  );
}

/* ---------- lab ---------- */

function Lab() {
  const initial = useMemo(() => {
    const id = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("reader") : null;
    return presets.find((p) => p.id === id) ?? presets[0];
  }, []);
  const [context, setContext] = useState<JourneyContext>(initial.context);
  const [decision, setDecision] = useState<Decision>(() => evaluateDecision(initial.context));
  const [status, setStatus] = useState<"live" | "fallback" | "loading">("live");
  const [showJson, setShowJson] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    const current = ++seq.current;
    setStatus("loading");
    const t = window.setTimeout(async () => {
      try {
        const r = await fetch("/api/decision", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(context) });
        if (!r.ok) throw new Error();
        const next = (await r.json()) as Decision;
        if (seq.current === current) { setDecision(next); setStatus("live"); }
      } catch {
        if (seq.current === current) { setDecision(evaluateDecision(context)); setStatus("fallback"); }
      }
    }, 140);
    return () => window.clearTimeout(t);
  }, [context]);

  const update = <K extends keyof JourneyContext>(k: K, v: JourneyContext[K]) => setContext((c) => ({ ...c, [k]: v }));
  const activePreset = presets.find((p) => equalContext(p.context, context))?.id ?? "custom";
  const policy = sectionPolicies[context.section];

  const guardrails = useMemo(() => {
    const items: { label: string; detail: string; tone: "pass" | "block" | "na" | "note" }[] = [];
    if (context.storyMode === "breaking") items.push({ label: "Breaking news", detail: context.identity === "donor" ? "Donor: quiet state applies anyway" : "Payment asks are suppressed", tone: "block" });
    else items.push({ label: "Not breaking news", detail: "Payment asks are allowed", tone: "pass" });
    if (context.asksSeen7d >= 4) items.push({ label: "Over the weekly ask budget", detail: `${context.asksSeen7d} asks seen, cap is 3`, tone: "block" });
    else items.push({ label: "Under the weekly ask budget", detail: `${context.asksSeen7d} of 3 used`, tone: "pass" });
    if (context.identity === "donor") items.push({ label: "Donor protection applies", detail: "No acquisition asks, ever", tone: "note" });
    else items.push({ label: "Donor protection does not apply", detail: "Not a current donor", tone: "na" });
    if (context.consent === "essential") items.push({ label: "Consent is essential only", detail: "No personalized asks", tone: "block" });
    else items.push({ label: `Consent allows ${context.consent}`, detail: "Asks can be tailored", tone: "pass" });
    return items;
  }, [context]);

  const others = useMemo(() => {
    const s = decision.scores;
    const known = context.identity !== "anonymous";
    const donationNeed = known ? policy.donationThreshold - 0.08 : policy.donationThreshold;
    const rows: { key: string; text: string }[] = [];
    if (decision.action !== "donation") {
      rows.push({
        key: "donation",
        text: context.identity === "donor" ? "Donors are never shown an acquisition ask."
          : context.storyMode === "breaking" ? "Suppressed during breaking news."
          : context.asksSeen7d >= 4 ? "Held by the weekly ask budget."
          : s.donation < donationNeed ? `Held. Needs ${donationNeed.toFixed(2)} in ${sectionName(context.section)}; this reader is at ${s.donation.toFixed(2)}.`
          : context.identity === "anonymous" && context.visits30d < 6 ? "Held. Anonymous readers need six or more visits first."
          : "Outranked by a higher-priority ask.",
      });
    }
    if (decision.action !== "signup") {
      rows.push({
        key: "signup",
        text: context.identity !== "anonymous" ? "Already has an email relationship."
          : context.consent === "essential" ? "Needs consent beyond essential."
          : context.asksSeen7d >= 4 ? "Held by the weekly ask budget."
          : s.signup < policy.signupThreshold ? `Below the sign-up threshold of ${policy.signupThreshold.toFixed(2)}.`
          : "Outranked by a higher-priority ask.",
      });
    }
    if (decision.action !== "account") {
      rows.push({ key: "account", text: context.identity === "known" ? "Needs more habit first. Comes at 0.55 engagement." : "Comes after an email is known." });
    }
    if (decision.action !== "advertising") {
      rows.push({ key: "advertising", text: context.adValue >= 0.66 ? "Ad yield is high, but relationship propensity wins here." : "Stays in place. Ad value is not high enough to block an ask." });
    }
    return rows.slice(0, 3);
  }, [decision, context, policy]);

  const scoreRows = ["donation", "signup", "mission", "fatigue", "ad"];
  if (decision.scores.partner > 0) scoreRows.splice(2, 0, "partner");

  return (
    <section className="lab" id="lab">
      <div className="step">
        <h2><em>Step 1</em> Pick a reader, or build one</h2>
        <div className="presets">
          {presets.map((p) => (
            <button key={p.id} type="button" className={`preset ${activePreset === p.id ? "on" : ""}`} onClick={() => { setContext(p.context); window.history.replaceState(null, "", `?reader=${p.id}`); }} aria-pressed={activePreset === p.id}>
              <strong>{p.title}</strong><span>{p.note}</span>
            </button>
          ))}
          <div className={`preset custom ${activePreset === "custom" ? "on" : ""}`}><strong>Custom reader</strong><span>Change any field below</span></div>
        </div>
      </div>

      <div className="lab-grid">
        <div className="card controls">
          <h2><em>Step 2</em> Adjust the reader</h2>
          <div className="fields">
            <Field label="Section" value={context.section} options={sectionOptions} onChange={(v) => update("section", v)} />
            <Field label="Came from" value={context.origin} options={originOptions} onChange={(v) => { update("origin", v); update("partnerEngagement", v === "direct" ? 0 : 0.72); }} />
            <Field label="Relationship" value={context.identity} options={identityOptions} onChange={(v) => update("identity", v)} />
            <Field label="Story" value={context.storyMode} options={storyModeOptions} onChange={(v) => update("storyMode", v)} />
            <Field label="Consent" value={context.consent} options={consentOptions} onChange={(v) => update("consent", v)} />
          </div>
          <div className="sliders">
            <Slider label="Visits in the last 30 days" value={context.visits30d} min={0} max={20} step={1} onChange={(v) => update("visits30d", v)} />
            <Slider label="Minutes spent reading" value={context.engagedMinutes} min={0} max={40} step={1} onChange={(v) => update("engagedMinutes", v)} />
            {context.origin !== "direct" && <Slider label="Engagement on the referring surface" value={context.partnerEngagement} min={0} max={1} step={0.01} format={pct} onChange={(v) => update("partnerEngagement", v)} />}
            <Slider label="Mission affinity" value={context.missionAffinity} min={0} max={1} step={0.01} format={pct} onChange={(v) => update("missionAffinity", v)} />
            <Slider label="Asks already seen this week" value={context.asksSeen7d} min={0} max={8} step={1} onChange={(v) => update("asksSeen7d", v)} />
            <Slider label="Ad value of this page" value={context.adValue} min={0} max={1} step={0.01} format={pct} onChange={(v) => update("adValue", v)} />
            {context.identity === "donor" && <Slider label="Risk of lapsing" value={context.lapseRisk} min={0} max={1} step={0.01} format={pct} onChange={(v) => update("lapseRisk", v)} />}
          </div>
          <p className="fine">Every change re-runs the live policy. Nothing is stored.</p>
        </div>

        <div className="card result" aria-live="polite">
          <div className="result-head">
            <h2><em>Step 3</em> The ask this reader gets</h2>
            <span className={`live ${status}`}>{status === "loading" ? "Recomputing" : status === "live" ? "Live API" : "Local fallback"}</span>
          </div>
          <div className="verdict">
            <span className={`pill act-${decision.action}`}>{actionLabel[decision.action] ?? decision.action}</span>
            <h3>{(actionHeadline[decision.action] ?? actionHeadline.quiet)(context.section)}</h3>
          </div>
          <p className="rationale">{decision.rationale}</p>

          <div className="preview">
            <div className="preview-label">Preview · inside a {sectionName(context.section)} story</div>
            <div className="preview-story">
              <div className="ph w90" /><div className="ph w80" />
              <AskPreview action={decision.action} section={context.section} />
              <div className="ph w85" /><div className="ph w70" />
            </div>
          </div>

          <div className="others">
            {others.map((o) => (
              <div key={o.key}><small>{actionLabel[o.key]}</small><p>{o.text}</p></div>
            ))}
          </div>
        </div>

        <div className="side">
          <div className="card">
            <h2>Guardrails</h2>
            <ul className="guardrails">
              {guardrails.map((g) => (
                <li key={g.label}><Check tone={g.tone} /><div><strong>{g.label}</strong><span>{g.detail}</span></div></li>
              ))}
            </ul>
          </div>
          <div className="card">
            <div className="result-head"><h2>How it scored</h2><button type="button" className="text-button" onClick={() => setShowJson(!showJson)}>{showJson ? "Hide" : "See"} the API response</button></div>
            <div className="scores">
              {scoreRows.map((k) => (
                <div key={k} className="score"><span>{k === "ad" ? "Ad value" : k.charAt(0).toUpperCase() + k.slice(1)}</span><i><b className={k === decision.action || (k === "signup" && decision.action === "signup") ? "hot" : ""} style={{ width: `${(decision.scores[k] ?? 0) * 100}%` }} /></i><code>{(decision.scores[k] ?? 0).toFixed(2)}</code></div>
              ))}
            </div>
            <div className="reason"><code>{decision.reasonCode}</code><span>fallback: {decision.fallback}</span></div>
            {showJson && <pre className="json"><code>{JSON.stringify({ request: context, response: { action: decision.action, treatment: decision.treatment, reasonCode: decision.reasonCode, fallback: decision.fallback, experimentCell: decision.experimentCell, scores: decision.scores } }, null, 2)}</code></pre>}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- explainer + sources ---------- */

function HowItDecides() {
  const rules = [
    ["Relationship before money", "An engaged anonymous reader is offered an email relationship first. The donation ask waits until there is a known reader with a habit and a reason to care."],
    ["Some moments are off limits", "No payment ask during breaking news. No more than three asks in a week. Never an acquisition ask to someone who already gives."],
    ["Every decision carries its reason", "The API returns the ask, a reason code, a fallback and a seven-step trace. An editor, a fundraiser and an engineer can disagree about the same record."],
  ];
  const flow = ["Origin", "Reader state", "Guardrails", "Scores and section policy", "One ask", "Exposure and outcome"];
  return (
    <section className="explain" id="how">
      <div className="explain-head">
        <h2>How it decides</h2>
        <p>Next Best Ask is a small policy service for a reader-supported newsroom. It sits between what you know about a reader and what you show them, and picks one ask per visit. AP News is the example brand.</p>
      </div>
      <div className="rules">
        {rules.map(([t, b], i) => <div className="card" key={t}><small>0{i + 1}</small><strong>{t}</strong><p>{b}</p></div>)}
      </div>
      <ol className="flow">
        {flow.map((f, i) => <li key={f}><span>{i + 1}</span>{f}</li>)}
      </ol>
      <div className="api card">
        <div><small>Endpoint</small><code>POST /api/decision</code></div>
        <div><small>Returns</small><span>action · treatment · reasonCode · fallback · experimentCell · scores · trace</span></div>
        <a href="https://github.com/thebryandavis/next-best-ask#decision-api" target="_blank" rel="noreferrer">Full request shape on GitHub</a>
      </div>
    </section>
  );
}

function Sources() {
  const [level, setLevel] = useState<"all" | EvidenceLevel>("all");
  const shown = evidence.filter((e) => level === "all" || e.level === level);
  return (
    <section className="sources" id="sources">
      <div className="explain-head">
        <h2>What it is based on</h2>
        <p>Public pages and public reports only. AP News is the example brand because it is a nonprofit newsroom with a public donate page, flagship newsletters, sign-in and apps. No internal data was used.</p>
      </div>
      <div className="filters">
        {(["all", "observed", "public", "proposed"] as const).map((l) => <button key={l} type="button" className={level === l ? "on" : ""} onClick={() => setLevel(l)}>{l === "all" ? "All" : l.charAt(0).toUpperCase() + l.slice(1)}</button>)}
      </div>
      <ul className="source-list">
        {shown.map((e) => (
          <li key={e.id} className="card"><span className={`tag ${e.level}`}>{e.level}</span><div><strong>{e.capability}</strong><p>{e.signal}</p><a href={e.url} target={e.url.startsWith("#") ? undefined : "_blank"} rel="noreferrer">{e.source}</a></div></li>
        ))}
      </ul>
    </section>
  );
}

export default function App() {
  return (
    <div id="top">
      <header className="topbar">
        <div className="brand"><i /><strong>Next Best Ask</strong><span>Try the policy against any reader. Example brand: AP News.</span></div>
        <nav>
          <a href="#how">How it decides</a>
          <a href="#sources">Sources</a>
          <a className="dark" href="https://github.com/thebryandavis/next-best-ask" target="_blank" rel="noreferrer">GitHub</a>
        </nav>
      </header>
      <main>
        <Lab />
        <HowItDecides />
        <Sources />
      </main>
      <footer>
        <span>Independent portfolio work by Bryan Davis. Not an AP product. No internal AP data.</span>
        <a href="https://growth-room-lab-production.up.railway.app" target="_blank" rel="noreferrer">Companion: Growth Room</a>
      </footer>
    </div>
  );
}
