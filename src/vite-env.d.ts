/// <reference types="vite/client" />

declare module "../shared/decision-engine.js" {
  export const defaultContext: JourneyContext;
  export const sectionPolicies: Record<string, { label: string; donationThreshold: number; signupThreshold: number; utility: string; donationTreatment: string; missionWeight: number }>;
  export function evaluateDecision(context: JourneyContext): Decision;
}
