import type { Game, GroupTable, MemberPredictions, GroupData } from './types';

const BASE = 'https://wcg-il.365scores.com';
const TOKEN_KEY = 'bolao_token';
const GROUP_ID_KEY = 'bolao_group_id';
const GROUP_NAME_KEY = 'bolao_group_name';

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? import.meta.env.VITE_BOLAO_TOKEN ?? '';
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token.startsWith('Bearer ') ? token : `Bearer ${token}`);
}

export function getGroupId(): number {
  const stored = localStorage.getItem(GROUP_ID_KEY);
  return Number(stored ?? import.meta.env.VITE_GROUP_ID ?? 0);
}

export function setGroupId(groupID: number) {
  localStorage.setItem(GROUP_ID_KEY, String(groupID));
}

export function getGroupName(): string {
  return localStorage.getItem(GROUP_NAME_KEY) ?? import.meta.env.VITE_GROUP_NAME ?? '';
}

export function setGroupName(name: string) {
  localStorage.setItem(GROUP_NAME_KEY, name);
}

/** True when both a token and a group ID are available (from localStorage or baked-in env). */
export function isConfigured(): boolean {
  return Boolean(getToken()) && Boolean(getGroupId());
}

/** Clears only the user-entered config in localStorage (env-baked values remain). */
export function clearConfig() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(GROUP_ID_KEY);
  localStorage.removeItem(GROUP_NAME_KEY);
}

/** Clears the selected group but keeps the token, so the user can view another group. */
export function clearGroup() {
  localStorage.removeItem(GROUP_ID_KEY);
  localStorage.removeItem(GROUP_NAME_KEY);
}

function headers(): HeadersInit {
  return { Authorization: getToken() };
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: headers() });
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json();
}

async function getGroupTable(groupID: number): Promise<GroupTable> {
  const data = await get<{ table: GroupTable }>(`/Groups/GetGroupTable?lang=2&groupID=${groupID}`);
  return data.table;
}

async function getAllGames(): Promise<Game[]> {
  const data = await get<{ games: Game[] }>(`/Games/GetAllGames?lang=2`);
  return data.games;
}

async function getMemberGames(otherUserId: number, groupID: number): Promise<Game[]> {
  const data = await get<{ games: Game[] }>(
    `/Games/GetAllGamesForOtherUser?lang=2&otherUserId=${otherUserId}&groupID=${groupID}`
  );
  return data.games ?? [];
}

export interface TopScorer {
  athleteID: number;
  name: string;
  countryName: string;
  score: number;
  nameForUrl: string;
}

export async function fetchTopScorers(): Promise<TopScorer[]> {
  const data = await get<{ players: TopScorer[] }>('/Tournament/getTopScorers?lang=2');
  return data.players ?? [];
}

export async function fetchGroupData(groupID: number): Promise<GroupData> {
  const [table, games] = await Promise.all([getGroupTable(groupID), getAllGames()]);

  const memberPredictions: MemberPredictions[] = await Promise.all(
    table.members.map(async (m) => ({
      userID: m.userID,
      games: await getMemberGames(m.userID, groupID),
    }))
  );

  return { table, games, memberPredictions };
}
