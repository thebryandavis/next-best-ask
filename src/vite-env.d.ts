/// <reference types="vite/client" />

declare module "../shared/decision-engine.js" {
  export const defaultContext: JourneyContext;
  export const sectionPolicies: Record<string, { label: string }>;
  export function evaluateDecision(context: JourneyContext): Decision;
}
