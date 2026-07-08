export const trialDurationDays = 14;

export function calculateTrialEndsAt(startedAt = new Date()): Date {
  return new Date(startedAt.getTime() + trialDurationDays * 24 * 60 * 60 * 1000);
}
