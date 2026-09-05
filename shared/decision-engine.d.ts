import type { Decision, JourneyContext } from "../src/types";

export const POLICY_VERSION: string;
export const originPolicies: Record<JourneyContext["origin"], { label: string; propensityBoost: number; treatment: string }>;
export const sectionPolicies: Record<
  JourneyContext["section"],
  { label: string; donationThreshold: number; signupThreshold: number; utility: string; donationTreatment: string; missionWeight: number }
>;
export const defaultContext: JourneyContext;
export function validateContext(input: unknown): string | null;
export function evaluateDecision(input: JourneyContext): Decision;
