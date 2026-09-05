export type EvidenceLevel = "observed" | "public" | "inferred" | "proposed";

export type JourneyContext = {
  section: "politics" | "world" | "fact-check" | "sports";
  identity: "anonymous" | "known" | "registered" | "donor" | "lapsed-donor";
  consent: "essential" | "analytics" | "personalization";
  origin: "direct" | "search" | "social-video" | "aggregator" | "ai-assistant" | "member-site";
  storyMode: "standard" | "breaking" | "evergreen";
  visits30d: number;
  engagedMinutes: number;
  partnerEngagement: number;
  missionAffinity: number;
  adValue: number;
  asksSeen7d: number;
  lapseRisk: number;
};

export type TraceStep = {
  id: string;
  label: string;
  status: "complete" | "ready" | "waiting";
  detail: string;
  evidence: string;
};

export type Decision = {
  decisionId: string;
  action: string;
  treatment: string;
  reasonCode: string;
  rationale: string;
  fallback: string;
  policyVersion: string;
  experimentCell: string;
  scores: Record<string, number>;
  trace: TraceStep[];
  generatedAt: string;
};

export type Evidence = {
  id: string;
  capability: string;
  level: EvidenceLevel;
  signal: string;
  conclusion: string;
  implication: string;
  source: string;
  url: string;
};

export type Opportunity = {
  id: string;
  horizon: "90 days" | "2–4 quarters";
  domain: "Donations" | "First-party data" | "Reliability" | "Distribution" | "Trust";
  title: string;
  thesis: string;
  metric: string;
  impact: number;
  confidence: number;
  effort: number;
};
