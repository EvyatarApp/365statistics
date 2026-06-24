import type { BetOutcomeType } from './types';

export function projectOutcome(
  betTeam1: number,
  betTeam2: number,
  liveTeam1: number,
  liveTeam2: number
): BetOutcomeType {
  if (betTeam1 === liveTeam1 && betTeam2 === liveTeam2) return 'exact';
  const betDir = Math.sign(betTeam1 - betTeam2);
  const liveDir = Math.sign(liveTeam1 - liveTeam2);
  if (betDir === liveDir) return 'direction';
  return 'miss';
}
