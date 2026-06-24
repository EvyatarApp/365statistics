export interface Competitor {
  competitorID: number;
  name: string;
  nameForUrl: string;
  countryID: number;
}

export interface GameBet {
  gameID: number;
  selection: { team1: number; team2: number };
  gainedPoints: number;
  betOutcome: number | null; // 3=exact, 2=direction, 0=miss, null=not played yet
}

export interface Game {
  gameID: number;
  sportifierGameID: number;
  stageNum: number;
  compGroupName: string;
  compGroupNumber: number;
  startTime: string;
  competitors: [Competitor, Competitor];
  scores: { team1: number; team2: number };
  status: number; // 1=upcoming, 2=live, 3=finished
  gameBet: GameBet | null;
  isBetable: boolean;
  stid: number;
  gtd: string; // stage display name in Hebrew
  gameBetOutcomes: { partial: number; full: number };
}

export interface Member {
  userID: number;
  name: string;
  imageURL: string;
  score: string;
  totalScore: string;
  topScorerID: number;
  topScorerName: string;
  winnerTeamID: number;
  winnerTeamName: string;
  rank: string;
  isAdmin: boolean | null;
}

export interface GroupTable {
  groupID: number;
  name: string;
  membersCount: number;
  members: Member[];
}

// betOutcome values
export const OUTCOME_EXACT = 3;
export const OUTCOME_DIRECTION = 2;
export const OUTCOME_MISS = 0;

export type BetOutcomeType = 'exact' | 'direction' | 'miss' | 'pending';

export function classifyOutcome(outcome: number | null | undefined): BetOutcomeType {
  if (outcome === OUTCOME_EXACT) return 'exact';
  if (outcome === OUTCOME_DIRECTION) return 'direction';
  if (outcome === OUTCOME_MISS) return 'miss';
  return 'pending';
}

export interface MemberPredictions {
  userID: number;
  games: Game[];
}

export interface GroupData {
  table: GroupTable;
  games: Game[]; // all tournament games
  memberPredictions: MemberPredictions[]; // one entry per member
}
