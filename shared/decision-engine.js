export const POLICY_VERSION = "2026.09.reader-relationship.1";

// Where the reader came from. Off-platform origins carry a privacy-safe
// engagement signal (for example, dwell on a partner surface) but never a
// user identifier.
export const originPolicies = {
  direct: { label: "Direct / owned", propensityBoost: 0, treatment: "owned-continuity" },
  search: { label: "Search", propensityBoost: 0.02, treatment: "search-to-owned-continuity" },
  "social-video": { label: "Social video", propensityBoost: 0.035, treatment: "social-to-owned-continuity" },
  aggregator: { label: "News aggregator", propensityBoost: 0.03, treatment: "aggregator-to-owned-continuity" },
  "ai-assistant": { label: "AI assistant", propensityBoost: 0.06, treatment: "assistant-to-owned-continuity" },
  "member-site": { label: "Member / customer site", propensityBoost: 0.045, treatment: "member-to-owned-continuity" },
};

// Section policies stand in for editorial context. Thresholds and utilities
// differ because the reason a reader shows up in Fact Check is not the reason
// they show up in Sports.
export const sectionPolicies = {
  politics: {
    label: "Politics",
    donationThreshold: 0.6,
    signupThreshold: 0.4,
    utility: "morning-wire-newsletter",
    donationTreatment: "independent-election-coverage-ask",
    missionWeight: 0.24,
  },
  world: {
    label: "World",
    donationThreshold: 0.62,
    signupThreshold: 0.42,
    utility: "world-briefing-newsletter",
    donationTreatment: "on-the-ground-reporting-ask",
    missionWeight: 0.22,
  },
  "fact-check": {
    label: "Fact Check",
    donationThreshold: 0.56,
    signupThreshold: 0.4,
    utility: "fact-check-alerts",
    donationTreatment: "fund-verification-ask",
    missionWeight: 0.3,
  },
  sports: {
    label: "Sports",
    donationThreshold: 0.72,
    signupThreshold: 0.36,
    utility: "team-and-score-alerts",
    donationTreatment: "keep-the-scoreboard-free-ask",
    missionWeight: 0.1,
  },
};

const allowedIdentities = new Set(["anonymous", "known", "registered", "donor", "lapsed-donor"]);
const allowedConsent = new Set(["essential", "analytics", "personalization"]);
const allowedStoryModes = new Set(["standard", "breaking", "evergreen"]);
const numericFields = ["visits30d", "engagedMinutes", "partnerEngagement", "missionAffinity", "adValue", "asksSeen7d", "lapseRisk"];

export function validateContext(input) {
  if (!input || typeof input !== "object") return "Request body must be an object.";
  if (!sectionPolicies[input.section]) return "Unknown section.";
  if (!allowedIdentities.has(input.identity)) return "Unknown identity state.";
  if (!allowedConsent.has(input.consent)) return "Unknown consent state.";
  if (!originPolicies[input.origin]) return "Unknown discovery origin.";
  if (!allowedStoryModes.has(input.storyMode)) return "Unknown story mode.";
  for (const field of numericFields) {
    if (typeof input[field] !== "number" || Number.isNaN(input[field])) return `${field} must be numeric.`;
  }
  return null;
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function traceStep(id, label, status, detail, evidence) {
  return { id, label, status, detail, evidence };
}

export function evaluateDecision(rawInput) {
  const error = validateContext(rawInput);
  if (error) {
    const validationError = new Error(error);
    validationError.code = "INVALID_CONTEXT";
    throw validationError;
  }

  const input = {
    ...rawInput,
    visits30d: clamp(rawInput.visits30d, 0, 60),
    engagedMinutes: clamp(rawInput.engagedMinutes, 0, 240),
    partnerEngagement: clamp(rawInput.partnerEngagement),
    missionAffinity: clamp(rawInput.missionAffinity),
    adValue: clamp(rawInput.adValue),
    asksSeen7d: clamp(rawInput.asksSeen7d, 0, 20),
    lapseRisk: clamp(rawInput.lapseRisk),
  };
  const policy = sectionPolicies[input.section];
  const originPolicy = originPolicies[input.origin];
  const offPlatform = input.origin !== "direct";
  const knownEmail = input.identity !== "anonymous";

  const engagement = clamp(
    (input.visits30d / 12) * 0.4 +
      (input.engagedMinutes / 35) * 0.3 +
      input.missionAffinity * 0.2 +
      input.partnerEngagement * 0.1,
  );
  const identityBoost = { anonymous: 0, known: 0.08, registered: 0.13, donor: 0, "lapsed-donor": 0.1 }[input.identity];
  const fatiguePenalty = Math.max(0, input.asksSeen7d - 2) * 0.06;
  const donationPropensity = clamp(
    engagement * 0.5 +
      input.missionAffinity * policy.missionWeight +
      identityBoost +
      originPolicy.propensityBoost * input.partnerEngagement -
      fatiguePenalty -
      input.adValue * 0.05,
  );
  const signupPropensity = clamp(
    engagement * 0.6 + input.missionAffinity * 0.22 + input.partnerEngagement * (offPlatform ? 0.2 : 0) - fatiguePenalty * 0.5,
  );

  let action = "quiet";
  let treatment = "no-ask-keep-reading";
  let reasonCode = "LOW_RELATIONSHIP_SIGNAL";
  let rationale = "Keep the reading experience quiet and keep collecting consented engagement signal.";
  let fallback = "no-interruption";

  if (input.storyMode === "breaking") {
    const donor = input.identity === "donor";
    action = donor || input.consent === "essential" ? "quiet" : "alerts";
    treatment = donor ? "donor-thank-you-state" : input.consent === "essential" ? "no-ask-breaking-news" : "breaking-news-alert-opt-in";
    reasonCode = "BREAKING_NEWS_ASK_SUPPRESSED";
    rationale = donor
      ? "Breaking coverage is not a fundraising moment, and this reader already gives. Show nothing but a quiet thank-you."
      : "Breaking coverage is not a fundraising moment. Offer continuity through alerts only if consent allows, and never a payment ask.";
    fallback = "no-interruption";
  } else if (input.asksSeen7d >= 4 && input.identity !== "donor") {
    action = "quiet";
    treatment = "ask-fatigue-cooldown";
    reasonCode = "ASK_FATIGUE_CAP";
    rationale = "The reader has already seen the ceiling of asks for this week. Another one costs trust more than it earns.";
  } else if (input.identity === "donor") {
    if (input.lapseRisk >= 0.58) {
      action = "steward";
      treatment = "impact-report-and-thanks";
      reasonCode = "DONOR_LAPSE_RISK";
      rationale = "This reader already gives. Show what the gift funded and confirm the relationship instead of asking again.";
    } else if (engagement >= 0.6 && input.missionAffinity >= 0.6) {
      action = "sustain";
      treatment = "one-time-to-monthly-invitation";
      reasonCode = "DONOR_HIGH_ENGAGEMENT_UPGRADE";
      rationale = "A highly engaged donor is the right person to invite into monthly support, once, with a clear thank-you path.";
    } else {
      action = "quiet";
      treatment = "donor-thank-you-state";
      reasonCode = "DONOR_PROTECTED";
      rationale = "Donors never see an acquisition ask. A quiet acknowledgment keeps the deal honest.";
    }
  } else if (input.identity === "lapsed-donor" && donationPropensity >= 0.45) {
    action = "winback";
    treatment = "recognition-led-return";
    reasonCode = "LAPSED_DONOR_HIGH_PROPENSITY";
    rationale = "Acknowledge the prior gift and make it easy to return. Do not treat a past supporter as a stranger.";
  } else if (knownEmail && donationPropensity >= policy.donationThreshold - 0.08) {
    action = "donation";
    treatment = policy.donationTreatment;
    reasonCode = "KNOWN_READER_HIGH_DONATION_PROPENSITY";
    rationale = "A known reader with sustained habit and mission affinity is ready for a specific, section-relevant donation ask.";
    fallback = "newsletter-continuity";
  } else if (input.identity === "anonymous" && donationPropensity >= policy.donationThreshold && input.visits30d >= 6) {
    action = "donation";
    treatment = policy.donationTreatment;
    reasonCode = "ANONYMOUS_HIGH_DONATION_PROPENSITY";
    rationale = "Repeated, high-affinity visits justify a direct ask, with a first-party sign-up as the softer fallback.";
    fallback = "newsletter-continuity";
  } else if (input.identity === "anonymous" && offPlatform && input.partnerEngagement >= 0.55 && input.consent !== "essential") {
    action = "signup";
    treatment = `${originPolicy.treatment}-${policy.utility}`;
    reasonCode = "OFF_PLATFORM_HIGH_INTENT_HANDOFF";
    rationale = `Turn demonstrated ${originPolicy.label} interest into a first-party relationship before asking for money.`;
    fallback = "section-continuity";
  } else if (input.identity === "anonymous" && signupPropensity >= policy.signupThreshold && input.consent !== "essential") {
    action = "signup";
    treatment = policy.utility;
    reasonCode = "HIGH_UTILITY_AFFINITY_ANONYMOUS";
    rationale = "Offer something durable and useful in exchange for an email before any payment ask.";
    fallback = "section-continuity";
  } else if (input.identity === "known" && engagement >= 0.55) {
    action = "account";
    treatment = "save-stories-and-alerts";
    reasonCode = "KNOWN_READER_DEEPEN_RELATIONSHIP";
    rationale = "The reader already gets email. A registered account with saves and alerts deepens the relationship and improves the data.";
  } else if (input.identity === "registered" && engagement >= 0.55 && input.visits30d >= 8) {
    action = "app";
    treatment = "mobile-app-handoff";
    reasonCode = "REGISTERED_HABIT_APP_HANDOFF";
    rationale = "A frequent registered reader benefits more from the app habit than from another web prompt.";
  } else if (input.adValue >= 0.66 && donationPropensity < 0.4) {
    action = "advertising";
    treatment = "premium-ad-opportunity";
    reasonCode = "AD_VALUE_OUTWEIGHS_PROPENSITY";
    rationale = "Protect ad yield while relationship propensity remains low.";
  }

  const experimentCell = input.identity === "donor" ? "donor-holdout" : `${input.origin}-${action}-policy-a`;
  const decisionId = `ask_${input.section.replaceAll("-", "_")}_${input.origin.replaceAll("-", "_")}_${Math.round(donationPropensity * 1000)}`;

  return {
    decisionId,
    action,
    treatment,
    reasonCode,
    rationale,
    fallback,
    policyVersion: POLICY_VERSION,
    experimentCell,
    scores: {
      engagement: round(engagement),
      donation: round(donationPropensity),
      signup: round(signupPropensity),
      mission: round(input.missionAffinity),
      ad: round(input.adValue),
      fatigue: round(clamp(input.asksSeen7d / 5)),
      lapse: round(input.lapseRisk),
      partner: round(input.partnerEngagement),
    },
    trace: [
      traceStep("origin", "Discovery origin", "complete", `${originPolicy.label} · partner engagement ${round(input.partnerEngagement)}`, offPlatform ? "public + proposed" : "observed + proposed"),
      traceStep("context", "Story context", "complete", `${policy.label} · ${input.storyMode} · ${input.consent} consent`, "observed + proposed"),
      traceStep("identity", "Reader relationship", "complete", `${input.identity} relationship resolved`, "observed + public"),
      traceStep("propensity", "Relationship scoring", "complete", `Donation ${round(donationPropensity)} · sign-up ${round(signupPropensity)}`, "proposed"),
      traceStep("policy", "Ask arbitration", "complete", `${reasonCode} selected ${action}`, "proposed"),
      traceStep("surface", "Surface instruction", "ready", treatment, "proposed"),
      traceStep("measurement", "Exposure & outcome", "waiting", `Emit only after render · ${experimentCell}`, "proposed"),
    ],
    generatedAt: new Date().toISOString(),
  };
}

export const defaultContext = {
  section: "politics",
  identity: "anonymous",
  consent: "personalization",
  origin: "direct",
  storyMode: "standard",
  visits30d: 7,
  engagedMinutes: 12,
  partnerEngagement: 0,
  missionAffinity: 0.72,
  adValue: 0.34,
  asksSeen7d: 1,
  lapseRisk: 0.1,
};
