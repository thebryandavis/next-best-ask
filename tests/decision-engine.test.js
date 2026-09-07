import test from "node:test";
import assert from "node:assert/strict";
import { defaultContext, evaluateDecision } from "../shared/decision-engine.js";

test("offers a first-party sign-up to an engaged anonymous Politics reader before any donation ask", () => {
  const result = evaluateDecision(defaultContext);
  assert.equal(result.action, "signup");
  assert.equal(result.treatment, "morning-wire-newsletter");
  assert.equal(result.fallback, "section-continuity");
  assert.equal(result.trace.length, 7);
});

test("turns a high-intent AI assistant handoff into a first-party relationship", () => {
  const result = evaluateDecision({
    ...defaultContext,
    origin: "ai-assistant",
    partnerEngagement: 0.82,
    visits30d: 2,
    engagedMinutes: 4,
  });
  assert.equal(result.action, "signup");
  assert.equal(result.reasonCode, "OFF_PLATFORM_HIGH_INTENT_HANDOFF");
  assert.match(result.treatment, /assistant-to-owned-continuity/);
  assert.equal(result.trace[0].id, "origin");
});

test("makes a section-relevant donation ask to a known, habitual Fact Check reader", () => {
  const result = evaluateDecision({
    ...defaultContext,
    section: "fact-check",
    identity: "known",
    visits30d: 12,
    engagedMinutes: 20,
    missionAffinity: 0.85,
  });
  assert.equal(result.action, "donation");
  assert.equal(result.treatment, "fund-verification-ask");
  assert.equal(result.reasonCode, "KNOWN_READER_HIGH_DONATION_PROPENSITY");
  assert.equal(result.fallback, "newsletter-continuity");
});

test("never shows a donation ask during breaking news", () => {
  const result = evaluateDecision({
    ...defaultContext,
    identity: "known",
    storyMode: "breaking",
    visits30d: 15,
    engagedMinutes: 30,
    missionAffinity: 0.95,
  });
  assert.equal(result.reasonCode, "BREAKING_NEWS_ASK_SUPPRESSED");
  assert.notEqual(result.action, "donation");
});

test("never invites a donor to upgrade during breaking news", () => {
  const result = evaluateDecision({ ...defaultContext, identity: "donor", storyMode: "breaking", visits30d: 18, engagedMinutes: 30, missionAffinity: 0.9, lapseRisk: 0.1 });
  assert.equal(result.action, "quiet");
  assert.equal(result.reasonCode, "BREAKING_NEWS_ASK_SUPPRESSED");
});

test("caps asks when the reader has already seen too many this week", () => {
  const result = evaluateDecision({ ...defaultContext, identity: "known", asksSeen7d: 5, visits30d: 15, missionAffinity: 0.9 });
  assert.equal(result.action, "quiet");
  assert.equal(result.reasonCode, "ASK_FATIGUE_CAP");
});

test("never shows an acquisition ask to a current donor", () => {
  const result = evaluateDecision({ ...defaultContext, identity: "donor", lapseRisk: 0.2 });
  assert.equal(result.action, "quiet");
  assert.equal(result.reasonCode, "DONOR_PROTECTED");
  assert.equal(result.experimentCell, "donor-holdout");
});

test("stewards a donor at risk of lapsing instead of asking again", () => {
  const result = evaluateDecision({ ...defaultContext, identity: "donor", lapseRisk: 0.75 });
  assert.equal(result.action, "steward");
});

test("invites a highly engaged donor into monthly support", () => {
  const result = evaluateDecision({ ...defaultContext, identity: "donor", visits30d: 18, engagedMinutes: 30, missionAffinity: 0.9, lapseRisk: 0.1 });
  assert.equal(result.action, "sustain");
});

test("protects ad yield when relationship propensity is low", () => {
  const result = evaluateDecision({
    ...defaultContext,
    visits30d: 1,
    engagedMinutes: 1,
    missionAffinity: 0.1,
    adValue: 0.92,
  });
  assert.equal(result.action, "advertising");
});

test("rejects unknown sections and origins", () => {
  assert.throws(() => evaluateDecision({ ...defaultContext, section: "unknown" }), /Unknown section/);
  assert.throws(() => evaluateDecision({ ...defaultContext, origin: "unknown" }), /Unknown discovery origin/);
  assert.throws(() => evaluateDecision({ ...defaultContext, storyMode: "unknown" }), /Unknown story mode/);
});
