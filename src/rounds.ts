import type { GroupData, Game, Member, MemberPredictions } from './types';

// All tournament rounds, in canonical display order.
export type RoundKey =
  | 'all'
  | 'group-1'
  | 'group-2'
  | 'group-3'
  | 'r32'
  | 'r16'
  | 'qf'
  | 'sf'
  | 'final';

export interface RoundDef {
  key: RoundKey;
  label: string;
}

export const ROUND_DEFS: RoundDef[] = [
  { key: 'all', label: 'הכל' },
  { key: 'group-1', label: 'מחזור א׳' },
  { key: 'group-2', label: 'מחזור ב׳' },
  { key: 'group-3', label: 'מחזור ג׳' },
  { key: 'r32', label: 'שלב 32' },
  { key: 'r16', label: 'שמינית גמר' },
  { key: 'qf', label: 'רבע גמר' },
  { key: 'sf', label: 'חצי גמר' },
  { key: 'final', label: 'גמר' },
];

// Best-effort mapping for knockout games by stageNum. The knockout games are not
// present in the API yet (they are added once the bracket is known), so these
// values are an educated guess and may need adjusting once that data appears.
// Group-stage games carry a `compGroupName` (e.g. "בית א'") and are handled
// separately below.
const KNOCKOUT_BY_STAGE: Record<number, RoundKey> = {
  2: 'r32',
  3: 'r16',
  4: 'qf',
  5: 'sf',
  6: 'final',
};

function isGroupGame(g: Game): boolean {
  return !!(g.compGroupName && g.compGroupName.trim());
}

/**
 * Build a map of gameID -> RoundKey for every game.
 *
 * The API has no explicit "matchday" field, so for the group stage we derive it:
 * within each group, games are sorted by kickoff time and split into pairs
 * (first 2 = round 1, next 2 = round 2, last 2 = round 3). This matches the World
 * Cup structure of 4-team groups playing 3 matchdays.
 */
export function buildRoundMap(games: Game[]): Map<number, RoundKey> {
  const map = new Map<number, RoundKey>();
  const groupGames: Game[] = [];

  for (const g of games) {
    if (isGroupGame(g)) {
      groupGames.push(g);
    } else {
      map.set(g.gameID, KNOCKOUT_BY_STAGE[g.stageNum] ?? 'r32');
    }
  }

  const byGroup = new Map<number, Game[]>();
  for (const g of groupGames) {
    const arr = byGroup.get(g.compGroupNumber) ?? [];
    arr.push(g);
    byGroup.set(g.compGroupNumber, arr);
  }

  for (const arr of byGroup.values()) {
    arr.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    arr.forEach((g, i) => {
      const matchday = Math.min(2, Math.floor(i / 2)); // 0,1,2 -> rounds 1,2,3
      map.set(g.gameID, `group-${matchday + 1}` as RoundKey);
    });
  }

  return map;
}

/** Rounds that currently have at least one game (always includes 'all'). */
export function availableRounds(games: Game[], roundMap: Map<number, RoundKey>): RoundDef[] {
  const present = new Set<RoundKey>();
  for (const g of games) {
    const k = roundMap.get(g.gameID);
    if (k) present.add(k);
  }
  return ROUND_DEFS.filter((d) => d.key === 'all' || present.has(d.key));
}

/**
 * Return a GroupData scoped to a single round. Games and per-member predictions
 * are filtered to that round, and member points/rank are recomputed from the
 * points earned in that round only (the API only provides tournament-wide
 * totals). For 'all', the original data is returned unchanged.
 */
export function filterDataByRound(
  data: GroupData,
  round: RoundKey,
  roundMap: Map<number, RoundKey>,
): GroupData {
  if (round === 'all') return data;

  const inRound = (gameID: number) => roundMap.get(gameID) === round;

  const games = data.games.filter((g) => inRound(g.gameID));
  const memberPredictions: MemberPredictions[] = data.memberPredictions.map((mp) => ({
    userID: mp.userID,
    games: mp.games.filter((g) => inRound(g.gameID)),
  }));

  // Points earned in this round (finished games only).
  const pointsByUser = new Map<number, number>();
  for (const mp of memberPredictions) {
    let pts = 0;
    for (const g of mp.games) {
      if (g.status === 3) pts += g.gameBet?.gainedPoints ?? 0;
    }
    pointsByUser.set(mp.userID, pts);
  }

  // Rank by round points (standard competition ranking, ties share a rank).
  const ranked = [...data.table.members].sort(
    (a, b) => (pointsByUser.get(b.userID) ?? 0) - (pointsByUser.get(a.userID) ?? 0),
  );
  const rankByUser = new Map<number, number>();
  ranked.forEach((m, i) => {
    const pts = pointsByUser.get(m.userID) ?? 0;
    const prev = i > 0 ? ranked[i - 1] : null;
    if (prev && pts === (pointsByUser.get(prev.userID) ?? 0)) {
      rankByUser.set(m.userID, rankByUser.get(prev.userID)!);
    } else {
      rankByUser.set(m.userID, i + 1);
    }
  });

  const members: Member[] = data.table.members.map((m) => {
    const pts = pointsByUser.get(m.userID) ?? 0;
    return {
      ...m,
      score: String(pts),
      totalScore: String(pts),
      rank: String(rankByUser.get(m.userID) ?? 0),
    };
  });

  return { table: { ...data.table, members }, games, memberPredictions };
}
