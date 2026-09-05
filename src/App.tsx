import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Braces,
  Check,
  ChevronRight,
  Menu,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { defaultContext, evaluateDecision } from "../shared/decision-engine.js";
import { architecture, evidence, opportunities, originOptions, sectionOptions, storyModeOptions } from "./data";
import type { Decision, EvidenceLevel, JourneyContext, Opportunity } from "./types";

type ViewMode = "story" | "system";

const actionCopy: Record<string, { eyebrow: string; title: string }> = {
  signup: { eyebrow: "Next best ask", title: "Earn an email with something useful" },
  account: { eyebrow: "Next best ask", title: "Deepen the relationship with an account" },
  app: { eyebrow: "Habit handoff", title: "Move the habit to the app" },
  donation: { eyebrow: "Next best ask", title: "Make the specific, section-relevant ask" },
  sustain: { eyebrow: "Donor relationship", title: "Invite monthly support, once" },
  steward: { eyebrow: "Donor relationship", title: "Show what the gift funded" },
  winback: { eyebrow: "Recognized relationship", title: "Welcome a past supporter back" },
  alerts: { eyebrow: "Breaking-news restraint", title: "Offer alerts, never a payment ask" },
  advertising: { eyebrow: "Revenue arbitration", title: "Protect premium ad yield" },
  quiet: { eyebrow: "Experience restraint", title: "Keep the reading moment quiet" },
};

function levelLabel(level: EvidenceLevel) {
  return level.charAt(0).toUpperCase() + level.slice(1);
}

function EvidenceTag({ level }: { level: EvidenceLevel }) {
  return (
    <span className={`evidence-tag evidence-${level}`}>
      <span aria-hidden="true" />
      {levelLabel(level)}
    </span>
  );
}

function ModeSwitch({ mode, onChange }: { mode: ViewMode; onChange: (mode: ViewMode) => void }) {
  return (
    <div className="mode-switch" aria-label="Reading mode">
      <button className={mode === "story" ? "active" : ""} onClick={() => onChange("story")}>
        Brief
      </button>
      <button className={mode === "system" ? "active" : ""} onClick={() => onChange("system")}>
        Trace
      </button>
    </div>
  );
}

function Header({ mode, setMode }: { mode: ViewMode; setMode: (mode: ViewMode) => void }) {
  const [open, setOpen] = useState(false);
  const links = [
    ["Thesis", "#thesis"],
    ["Boundaries", "#architecture"],
    ["Decision lab", "#lab"],
    ["Roadmap", "#roadmap"],
    ["Sources", "#evidence"],
  ];

  return (
    <header className="site-header">
      <a className="wordmark" href="#top" aria-label="Next Best Ask home">
        <span>NEXT BEST ASK</span>
        <small>READER RELATIONSHIP DECISIONS</small>
      </a>
      <nav className={open ? "nav-open" : ""} aria-label="Primary navigation">
        {links.map(([label, href]) => (
          <a key={href} href={href} onClick={() => setOpen(false)}>
            {label}
          </a>
        ))}
      </nav>
      <div className="header-actions">
        <ModeSwitch mode={mode} onChange={setMode} />
        <button className="menu-button" onClick={() => setOpen(!open)} aria-label="Toggle navigation" aria-expanded={open}>
          {open ? <X size={19} /> : <Menu size={19} />}
        </button>
      </div>
    </header>
  );
}

function OperatingModel({ mode }: { mode: ViewMode }) {
  const boundaries = [
    { label: "Entry signal", level: "Observed", items: ["Search", "Social + video", "Aggregators", "AI assistants", "Member sites"] },
    { label: "Reader state", level: "Observed", items: ["Anonymous", "Email known", "Registered", "Donor", "Lapsed donor"] },
    { label: "Ask policy", level: "Proposed", items: ["Breaking guardrail", "Ask budget", "Propensity", "Section rules"] },
    { label: "Execution", level: "Public", items: ["Newsletter", "Account + alerts", "App", "Donate", "Ads"] },
    { label: "Outcome", level: "Measured", items: ["Sign-up", "Gift", "Monthly", "Retention"] },
  ];

  return (
    <div className="operating-model" aria-label="Proposed reader relationship operating model">
      <div className="model-heading">
        <div>
          <span className="model-overline">PROPOSED OPERATING MODEL</span>
          <strong>One ask contract across five boundaries</strong>
        </div>
        <span className="model-status"><i /> SERVICE READY <code>2026.09</code></span>
      </div>
      <div className="model-flow">
        {boundaries.map((boundary, index) => (
          <div className={`model-boundary boundary-${index + 1}`} key={boundary.label}>
            <div className="boundary-heading">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div><strong>{boundary.label}</strong><small>{boundary.level}</small></div>
            </div>
            <ul>{boundary.items.map((item) => <li key={item}>{item}</li>)}</ul>
            {index < boundaries.length - 1 && <ArrowRight className="boundary-arrow" size={16} aria-hidden="true" />}
          </div>
        ))}
      </div>
      <div className="model-contract">
        <code>POST /api/decision</code>
        <span>context in</span><ArrowRight size={14} /><span>one eligible ask</span><ArrowRight size={14} /><span>exposure + outcome</span>
        {mode === "system" && <strong>origin.v1 · relationship.v1 · policy.v1 · exposure.v1</strong>}
      </div>
    </div>
  );
}

function Hero({ mode }: { mode: ViewMode }) {
  return (
    <section className="hero" id="thesis">
      <div className="hero-kicker">
        <span>Independent product prototype</span>
        <span>Public signals only · no internal data</span>
        <span>September 2026</span>
      </div>
      <div className="hero-grid">
        <div className="hero-copy">
          <p className="section-label">Donations and first-party data for a nonprofit newsroom</p>
          <h1>
            One explainable ask
            <br /> for every
            <br /> <em>reader moment.</em>
          </h1>
          <p className="hero-deck">
            AP journalism reaches billions of people a day, mostly off apnews.com. This prototype decides, for one reader on one
            story, whether the right next step is a newsletter, an account, the app, a donation, or nothing at all, and explains why.
          </p>
          <div className="hero-cta-row">
            <a className="button-primary" href="#lab">
              Run the decision model <ArrowDown size={16} />
            </a>
            <a className="text-link" href="#evidence">
              Review evidence <ArrowRight size={15} />
            </a>
          </div>
        </div>
        <OperatingModel mode={mode} />
      </div>
      <div className="field-stats" aria-label="Public business signals">
        <div><strong>4 billion</strong><span>people see AP journalism every day, per ap.org</span></div>
        <div><strong>17%</strong><span>pay for online news across markets, per Reuters Institute 2026</span></div>
        <div><strong>1 ask</strong><span>per reader moment, chosen from ten eligible actions</span></div>
      </div>
      <div className="thesis-band">
        <span className="thesis-number">OPERATING THESIS / 01</span>
        <p>
          For a nonprofit newsroom the ask is a trust event. The product is an explainable
          <strong> next best ask</strong> contract that turns borrowed attention into a first-party relationship first, and into
          support only when the relationship has earned it.
        </p>
      </div>
    </section>
  );
}

function SignalLedger({ mode }: { mode: ViewMode }) {
  const items = evidence.slice(0, mode === "story" ? 6 : 9);
  return (
    <section className="signal-ledger section-shell" aria-labelledby="signals-title">
      <div className="section-intro split-intro">
        <div>
          <p className="section-label">Public-signal audit / what is already true</p>
          <h2 id="signals-title">The surfaces exist. Coordination is the gap.</h2>
        </div>
        <p>
          A donate page, two flagship newsletters, sign-in, and mobile apps are all publicly visible on apnews.com. The
          opportunity is deciding which of them a given reader should meet, and when.
        </p>
      </div>
      <div className="ledger-table" role="table" aria-label="Public signal ledger">
        <div className="ledger-head" role="row">
          <span role="columnheader">Capability</span>
          <span role="columnheader">Signal</span>
          <span role="columnheader">Strategic read</span>
        </div>
        {items.map((item, index) => (
          <div className="ledger-row" role="row" key={item.id}>
            <div role="cell" className="ledger-capability">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{item.capability}</strong>
              <EvidenceTag level={item.level} />
            </div>
            <p role="cell">{item.signal}</p>
            <p role="cell">{item.implication}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ArchitectureSection() {
  const [selected, setSelected] = useState("decision");
  const active = architecture.find((node) => node.id === selected) ?? architecture[0];
  const details: Record<string, string[]> = {
    distribution: ["Search, social and aggregator referrals", "AI assistant citations with links back", "AP stories on member and customer sites"],
    experience: ["Section and story mode", "Article, live blog, explainer, video", "Web, app, newsletter surfaces"],
    signals: ["Visits and engaged minutes", "Mission affinity from consented reading", "Consent state and ad opportunity"],
    identity: ["Email relationship from newsletters", "Registered account with saves and alerts", "Donor and lapsed-donor state"],
    decision: ["Breaking-news and consent guardrails", "Weekly ask budget", "Propensity, section policy, fallback"],
    systems: ["Newsletter and alert delivery", "Account and app", "Donation and advertising"],
    truth: ["Decision vs. actual exposure", "Sign-up, gift and monthly conversion", "Retention and donor recognition accuracy"],
  };

  return (
    <section className="architecture-section" id="architecture" aria-labelledby="architecture-title">
      <div className="section-shell architecture-heading">
        <p className="section-label light">Seven boundaries / one contract</p>
        <h2 id="architecture-title">Route the ask. Leave the systems in place.</h2>
        <p>
          Next Best Ask sits between reader context and the surfaces that already exist. It does not replace the newsletter,
          account, app, donation or ad systems. It gives them one shared decision and measurement contract.
        </p>
      </div>
      <div className="architecture-canvas section-shell">
        <div className="architecture-flow" aria-label="Proposed reader decision architecture">
          {architecture.map((node, index) => (
            <div className="architecture-step-wrap" key={node.id}>
              <button
                className={`architecture-node ${selected === node.id ? "selected" : ""}`}
                onClick={() => setSelected(node.id)}
                aria-pressed={selected === node.id}
              >
                <span className="node-index">{String(index + 1).padStart(2, "0")}</span>
                <strong>{node.label}</strong>
                <small>{node.note}</small>
                <EvidenceTag level={node.level as EvidenceLevel} />
              </button>
              {index < architecture.length - 1 && <ChevronRight className="flow-arrow" size={18} aria-hidden="true" />}
            </div>
          ))}
        </div>
        <div className="architecture-inspector" aria-live="polite">
          <div>
            <span className="inspector-eyebrow">Selected boundary</span>
            <h3>{active.label}</h3>
            <p>{active.note}</p>
          </div>
          <ul>
            {details[active.id].map((detail) => (
              <li key={detail}>
                <Check size={14} /> {detail}
              </li>
            ))}
          </ul>
          <code>contract.{active.id}.v1</code>
        </div>
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
  const percent = ((value - min) / (max - min)) * 100;
  return (
    <label className="range-control">
      <span>
        {label}
        <output>{format ? format(value) : value}</output>
      </span>
      <input
        type="range"
        aria-label={label}
        aria-valuetext={format ? format(value) : String(value)}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ backgroundSize: `${percent}% 100%` }}
      />
    </label>
  );
}

function ScorePlot({ scores }: { scores: Record<string, number> }) {
  const shown = ["donation", "signup", "mission", "fatigue", "ad"];
  if (scores.partner > 0) shown.splice(3, 0, "partner");
  return (
    <div className="score-plot" aria-label="Decision scores">
      {shown.map((key) => (
        <div className="score-row" key={key}>
          <span>{key}</span>
          <div className="score-track">
            <i style={{ transform: `scaleX(${scores[key] ?? 0})` }} />
          </div>
          <code>{(scores[key] ?? 0).toFixed(2)}</code>
        </div>
      ))}
    </div>
  );
}

function JsonInspector({ context, decision }: { context: JourneyContext; decision: Decision }) {
  const payload = {
    request: {
      section: context.section,
      storyMode: context.storyMode,
      identity: context.identity,
      origin: context.origin,
      partnerEngagement: context.partnerEngagement,
      visits30d: context.visits30d,
      missionAffinity: context.missionAffinity,
      asksSeen7d: context.asksSeen7d,
      consent: context.consent,
    },
    response: {
      action: decision.action,
      treatment: decision.treatment,
      reasonCode: decision.reasonCode,
      fallback: decision.fallback,
      experimentCell: decision.experimentCell,
    },
  };
  return (
    <pre className="json-inspector" tabIndex={0} aria-label="Decision API payload">
      <code>{JSON.stringify(payload, null, 2)}</code>
    </pre>
  );
}

const percent = (value: number) => `${Math.round(value * 100)}%`;

function JourneyLab({ mode }: { mode: ViewMode }) {
  const [context, setContext] = useState<JourneyContext>(defaultContext as JourneyContext);
  const [decision, setDecision] = useState<Decision>(() => evaluateDecision(defaultContext as JourneyContext));
  const [status, setStatus] = useState<"live" | "fallback" | "loading">("live");
  const [inspectorOpen, setInspectorOpen] = useState(mode === "system");
  const requestSequence = useRef(0);

  useEffect(() => setInspectorOpen(mode === "system"), [mode]);

  useEffect(() => {
    const sequence = ++requestSequence.current;
    setStatus("loading");
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/decision", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(context),
        });
        if (!response.ok) throw new Error("Decision API unavailable");
        const next = (await response.json()) as Decision;
        if (requestSequence.current === sequence) {
          setDecision(next);
          setStatus("live");
        }
      } catch {
        if (requestSequence.current === sequence) {
          setDecision(evaluateDecision(context));
          setStatus("fallback");
        }
      }
    }, 180);
    return () => window.clearTimeout(timer);
  }, [context]);

  const update = <K extends keyof JourneyContext>(key: K, value: JourneyContext[K]) => {
    setContext((current) => ({ ...current, [key]: value }));
  };
  const copy = actionCopy[decision.action] ?? actionCopy.quiet;
  const displayCopy = decision.reasonCode === "OFF_PLATFORM_HIGH_INTENT_HANDOFF"
    ? { eyebrow: "Partner-to-owned handoff", title: "Turn borrowed attention into a relationship" }
    : copy;
  const activeSection = sectionOptions.find((section) => section.id === context.section)!;
  const activeOrigin = originOptions.find((origin) => origin.id === context.origin)!;

  return (
    <section className="lab-section section-shell" id="lab" aria-labelledby="lab-title">
      <div className="section-intro lab-heading">
        <div>
          <p className="section-label">Decision lab / live microservice</p>
          <h2 id="lab-title">Change the reader. Inspect the ask.</h2>
        </div>
        <p>
          Change section, origin, relationship state and behavior. The API applies guardrails, scores eligible asks, applies
          section policy, returns a reason code and exposes the full trace. Nothing below claims to be a production AP model.
        </p>
      </div>

      <div className="lab-shell">
        <aside className="lab-controls" aria-label="Reader inputs">
          <div className="panel-heading">
            <span>01</span>
            <div>
              <strong>Reader context</strong>
              <small>Adjust the incoming signal envelope</small>
            </div>
          </div>

          <fieldset className="brand-fieldset">
            <legend>Section</legend>
            <div className="brand-options">
              {sectionOptions.map((section) => (
                <button
                  key={section.id}
                  className={context.section === section.id ? "active" : ""}
                  onClick={() => update("section", section.id)}
                  aria-pressed={context.section === section.id}
                >
                  <strong>{section.label}</strong>
                  <span>{section.note}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <label className="origin-control">
            Discovery origin
            <select
              value={context.origin}
              onChange={(event) => {
                const origin = event.target.value as JourneyContext["origin"];
                update("origin", origin);
                update("partnerEngagement", origin === "direct" ? 0 : 0.72);
              }}
            >
              {originOptions.map((origin) => (
                <option value={origin.id} key={origin.id}>{origin.label}</option>
              ))}
            </select>
            <small>{activeOrigin.note}</small>
          </label>

          <div className="select-row">
            <label>
              Relationship
              <select value={context.identity} onChange={(event) => update("identity", event.target.value as JourneyContext["identity"])}>
                <option value="anonymous">Anonymous</option>
                <option value="known">Email known</option>
                <option value="registered">Registered account</option>
                <option value="donor">Current donor</option>
                <option value="lapsed-donor">Lapsed donor</option>
              </select>
            </label>
            <label>
              Story mode
              <select value={context.storyMode} onChange={(event) => update("storyMode", event.target.value as JourneyContext["storyMode"])}>
                {storyModeOptions.map((option) => (
                  <option value={option.id} key={option.id}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="select-row">
            <label>
              Consent
              <select value={context.consent} onChange={(event) => update("consent", event.target.value as JourneyContext["consent"])}>
                <option value="essential">Essential only</option>
                <option value="analytics">Analytics</option>
                <option value="personalization">Personalization</option>
              </select>
            </label>
          </div>

          <div className="range-stack">
            <RangeControl label="Visits in 30 days" value={context.visits30d} min={0} max={20} step={1} onChange={(value) => update("visits30d", value)} />
            <RangeControl label="Engaged minutes" value={context.engagedMinutes} min={0} max={40} step={1} onChange={(value) => update("engagedMinutes", value)} />
            {context.origin !== "direct" && (
              <RangeControl label="Partner engagement" value={context.partnerEngagement} min={0} max={1} step={0.01} format={percent} onChange={(value) => update("partnerEngagement", value)} />
            )}
            <RangeControl label="Mission affinity" value={context.missionAffinity} min={0} max={1} step={0.01} format={percent} onChange={(value) => update("missionAffinity", value)} />
            <RangeControl label="Asks seen this week" value={context.asksSeen7d} min={0} max={8} step={1} onChange={(value) => update("asksSeen7d", value)} />
            <RangeControl label="Ad opportunity value" value={context.adValue} min={0} max={1} step={0.01} format={percent} onChange={(value) => update("adValue", value)} />
            {context.identity === "donor" && (
              <RangeControl label="Lapse risk" value={context.lapseRisk} min={0} max={1} step={0.01} format={percent} onChange={(value) => update("lapseRisk", value)} />
            )}
          </div>
        </aside>

        <div className="decision-stage">
          <div className="stage-status">
            <span className={`status-light ${status}`} />
            {status === "loading" ? "Recomputing policy" : status === "live" ? "Live API response" : "Local resilient fallback"}
            <code>{decision.decisionId}</code>
          </div>
          <div className="decision-copy">
            <p>{displayCopy.eyebrow}</p>
            <h3>{displayCopy.title}</h3>
            <div className="treatment-line">
              <span>{activeOrigin.label}</span>
              <ArrowRight size={16} />
              <span>{activeSection.label}</span>
              <ArrowRight size={16} />
              <strong>{decision.treatment.replaceAll("-", " ")}</strong>
            </div>
            <p className="decision-rationale">{decision.rationale}</p>
          </div>
          <ScorePlot scores={decision.scores} />
          <div className="decision-meta">
            <div>
              <span>Reason code</span>
              <code>{decision.reasonCode}</code>
            </div>
            <div>
              <span>Experiment cell</span>
              <code>{decision.experimentCell}</code>
            </div>
            <div>
              <span>Fallback</span>
              <code>{decision.fallback}</code>
            </div>
          </div>
          <button className="inspector-toggle" onClick={() => setInspectorOpen(!inspectorOpen)} aria-expanded={inspectorOpen}>
            <Braces size={16} /> {inspectorOpen ? "Close API payload" : "Inspect API payload"}
          </button>
          {inspectorOpen && <JsonInspector context={context} decision={decision} />}
        </div>

        <aside className="trace-panel" aria-label="Decision trace">
          <div className="panel-heading">
            <span>02</span>
            <div>
              <strong>Decision trace</strong>
              <small>Input to measurable exposure</small>
            </div>
          </div>
          <ol className="trace-list">
            {decision.trace.map((step, index) => (
              <li key={step.id} className={`trace-${step.status}`}>
                <span className="trace-marker">{index + 1}</span>
                <div>
                  <span className="trace-label">
                    {step.label} <small>{step.status}</small>
                  </span>
                  <p>{step.detail}</p>
                  <code>{step.evidence}</code>
                </div>
              </li>
            ))}
          </ol>
          <div className="trace-footer">
            <ShieldCheck size={16} />
            <p>Consent, breaking-news mode, ask budget and donor state can veto any score.</p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function RatingDots({ value, invert = false }: { value: number; invert?: boolean }) {
  return (
    <span className="rating-dots" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((dot) => (
        <i key={dot} className={dot <= value ? (invert ? "filled inverse" : "filled") : ""} />
      ))}
    </span>
  );
}

function OpportunityRow({ opportunity, rank }: { opportunity: Opportunity; rank: number }) {
  return (
    <article className="opportunity-row">
      <span className="opportunity-rank">{String(rank).padStart(2, "0")}</span>
      <div className="opportunity-thesis">
        <div>
          <span>{opportunity.horizon}</span>
          <span>{opportunity.domain}</span>
        </div>
        <h3>{opportunity.title}</h3>
        <p>{opportunity.thesis}</p>
        <code>{opportunity.metric}</code>
      </div>
      <div className="opportunity-scores">
        <span>Impact <RatingDots value={opportunity.impact} /></span>
        <span>Confidence <RatingDots value={opportunity.confidence} /></span>
        <span>Effort <RatingDots value={opportunity.effort} invert /></span>
      </div>
    </article>
  );
}

function RoadmapSection() {
  const [filter, setFilter] = useState("All");
  const domains = ["All", "Donations", "First-party data", "Trust", "Reliability", "Distribution"];
  const filtered = filter === "All" ? opportunities : opportunities.filter((item) => item.domain === filter);
  return (
    <section className="roadmap-section section-shell" id="roadmap" aria-labelledby="roadmap-title">
      <div className="section-intro split-intro">
        <div>
          <p className="section-label">Sequenced bets / impact × evidence</p>
          <h2 id="roadmap-title">Establish the guardrails before optimizing the ask.</h2>
        </div>
        <p>
          The early roadmap pairs donation and sign-up experiments with trust and recognition reliability. A fundraising
          program that cannot explain its exposures or recognize its donors is not actually growing.
        </p>
      </div>
      <div className="filter-bar" aria-label="Filter opportunities">
        {domains.map((domain) => (
          <button key={domain} className={filter === domain ? "active" : ""} onClick={() => setFilter(domain)}>
            {domain}
          </button>
        ))}
      </div>
      <div className="opportunity-list">
        {filtered.map((opportunity, index) => (
          <OpportunityRow opportunity={opportunity} rank={index + 1} key={opportunity.id} />
        ))}
      </div>
    </section>
  );
}

function AiSection() {
  return (
    <section className="ai-section">
      <div className="section-shell ai-grid">
        <div className="ai-statement">
          <p className="section-label light">Discovery is leaving the page</p>
          <h2>An answer box can summarize a story. It cannot become a supporter.</h2>
          <p>
            AP journalism is valuable because it is fast, verified and nonpartisan, and because it is everywhere. That reach
            is mostly borrowed. The product question is how each encounter becomes a relationship AP actually holds.
          </p>
        </div>
        <div className="ai-counterpoint">
          <div>
            <span>Search pressure</span>
            <strong>Search referrals to publishers fell sharply through 2025 as AI answers absorbed informational queries.</strong>
            <small>Reuters Institute, Digital News Report 2026</small>
          </div>
          <div>
            <span>Direct response</span>
            <strong>Newsletters, alerts, accounts and the app are relationships an answer box cannot reproduce.</strong>
            <small>Email · alerts · saves · app · donor recognition</small>
          </div>
          <div>
            <span>Nonprofit advantage</span>
            <strong>A mission ask can be honest about why it exists. That honesty is the conversion asset.</strong>
            <small>The product question is timing, frequency and recognition, not persuasion.</small>
          </div>
        </div>
        <div className="north-star">
          <span>Proposed north star</span>
          <p>
            Durable first-party relationships
            <br />
            <em>per 1,000 content encounters</em>
          </p>
          <div className="relationship-legend">
            <span>Partner handoff</span><span>Email known</span><span>Registered</span><span>App active</span><span>Donor</span><span>Monthly</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function EvidenceRoom() {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<"all" | EvidenceLevel>("all");
  const filtered = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    return evidence.filter((item) => {
      const matchesLevel = level === "all" || item.level === level;
      const matchesQuery = !normalized || `${item.capability} ${item.signal} ${item.conclusion} ${item.source}`.toLowerCase().includes(normalized);
      return matchesLevel && matchesQuery;
    });
  }, [query, level]);

  return (
    <section className="evidence-room section-shell" id="evidence" aria-labelledby="evidence-title">
      <div className="section-intro split-intro">
        <div>
          <p className="section-label">Source registry / provenance built in</p>
          <h2 id="evidence-title">Every claim carries its receipts.</h2>
        </div>
        <p>
          This is a public-signal study, not an inside view. Every claim carries provenance so a reviewer can challenge the
          reasoning without first untangling what was actually observed.
        </p>
      </div>
      <div className="evidence-toolbar">
        <label className="search-field">
          <Search size={16} />
          <span className="sr-only">Search evidence</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search donate, newsletters, donor…" />
        </label>
        <div className="level-filter" aria-label="Filter evidence level">
          {(["all", "observed", "public", "inferred", "proposed"] as const).map((item) => (
            <button key={item} className={level === item ? "active" : ""} onClick={() => setLevel(item)}>
              {item === "all" ? "All" : levelLabel(item)}
            </button>
          ))}
        </div>
      </div>
      <div className="evidence-count">
        {filtered.length} signals <span>of {evidence.length}</span>
      </div>
      <div className="evidence-list">
        {filtered.map((item) => (
          <article key={item.id} className="evidence-item">
            <div className="evidence-title-line">
              <EvidenceTag level={item.level} />
              <h3>{item.capability}</h3>
            </div>
            <div className="evidence-body">
              <div>
                <span>Signal</span>
                <p>{item.signal}</p>
              </div>
              <div>
                <span>Strategic read</span>
                <p>{item.conclusion}</p>
              </div>
              <div>
                <span>Product implication</span>
                <p>{item.implication}</p>
              </div>
            </div>
            <a href={item.url} target={item.url.startsWith("#") ? undefined : "_blank"} rel="noreferrer">
              {item.source} <ArrowUpRight size={14} />
            </a>
          </article>
        ))}
      </div>
      <div className="method-note">
        <ShieldCheck size={19} />
        <p>
          Built from public pages and public reports only. No internal AP data, analytics, experiment results or reader
          information was used. Observed signals were read from public apnews.com and ap.org pages in September 2026.
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer>
      <div className="footer-mark">
        <div>
          <strong>Next Best Ask</strong>
          <small>A public-signal product study</small>
        </div>
      </div>
      <p>
        Independent portfolio work by Bryan Davis. Not an AP product, and not built with internal AP data.
        <br />
        Built to demonstrate product judgment about donations, first-party data and reader trust.
      </p>
      <div className="footer-links">
        <a href="https://github.com/thebryandavis/ap-next-best-ask" target="_blank" rel="noreferrer">Source on GitHub <ArrowUpRight size={13} /></a>
        <a href="#top">Back to top <ArrowUpRight size={13} /></a>
      </div>
    </footer>
  );
}

export default function App() {
  const [mode, setMode] = useState<ViewMode>("story");
  useEffect(() => {
    document.documentElement.dataset.mode = mode;
  }, [mode]);
  useEffect(() => {
    if (!window.location.hash) return;
    const target = window.setTimeout(() => {
      document.querySelector(window.location.hash)?.scrollIntoView();
    }, 80);
    return () => window.clearTimeout(target);
  }, []);
  return (
    <div id="top">
      <Header mode={mode} setMode={setMode} />
      <main>
        <Hero mode={mode} />
        <SignalLedger mode={mode} />
        <ArchitectureSection />
        <JourneyLab mode={mode} />
        <RoadmapSection />
        <AiSection />
        <EvidenceRoom />
      </main>
      <Footer />
    </div>
  );
}
