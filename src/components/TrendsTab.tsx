import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Cell, LabelList, Legend, ComposedChart, Scatter,
} from 'recharts';
import type { GroupData, Member } from '../types';
import { classifyOutcome } from '../types';
import { buildRoundMap, ROUND_DEFS } from '../rounds';
import styles from './TrendsTab.module.css';

// Distinct colors for up to 20 players
const PLAYER_COLORS = [
  '#f0b429','#22c55e','#3b82f6','#ef4444','#a855f7',
  '#06b6d4','#f97316','#84cc16','#ec4899','#14b8a6',
  '#eab308','#8b5cf6','#f43f5e','#10b981','#60a5fa',
  '#fb923c','#4ade80','#c084fc','#34d399','#fbbf24',
];

function buildPointsOverTime(data: GroupData) {
  const playedGames = [...data.games.filter((g) => g.status === 3)]
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  if (playedGames.length === 0) return { chartData: [], members: [] };

  const members = [...data.table.members].sort((a, b) => Number(a.rank) - Number(b.rank));

  // cumulative points per member
  const cumulative: Record<number, number> = {};
  members.forEach((m) => (cumulative[m.userID] = 0));

  const chartData = playedGames.map((game, idx) => {
    const entry: Record<string, unknown> = {
      label: `${game.competitors[0].name.slice(0, 3)}-${game.competitors[1].name.slice(0, 3)}`,
      gameIdx: idx + 1,
    };
    for (const member of members) {
      const mp = data.memberPredictions.find((p) => p.userID === member.userID);
      const g = mp?.games.find((gg) => gg.gameID === game.gameID);
      cumulative[member.userID] += g?.gameBet?.gainedPoints ?? 0;
      entry[String(member.userID)] = cumulative[member.userID];
    }
    return entry;
  });

  return { chartData, members };
}

function buildScoreDistribution(data: GroupData) {
  const dist: Record<string, number> = {};
  for (const game of data.games) {
    if (game.status !== 3) continue;
    // Treat reversed scorelines as the same (1-0 === 0-1), always show higher first
    const hi = Math.max(game.scores.team1, game.scores.team2);
    const lo = Math.min(game.scores.team1, game.scores.team2);
    const key = `${hi}-${lo}`;
    dist[key] = (dist[key] ?? 0) + 1;
  }
  return Object.entries(dist)
    .sort((a, b) => b[1] - a[1])
    .map(([score, count]) => ({ score, count }));
}

function buildPredictionDistribution(data: GroupData) {
  // Aggregate every prediction the members made. Reversed scorelines are treated
  // as the same (1-0 === 0-1, higher shown first), matching the results chart so
  // the two can be compared directly.
  const dist: Record<string, number> = {};
  for (const mp of data.memberPredictions) {
    for (const g of mp.games) {
      const sel = g.gameBet?.selection;
      if (!sel) continue;
      const hi = Math.max(sel.team1, sel.team2);
      const lo = Math.min(sel.team1, sel.team2);
      const key = `${hi}-${lo}`;
      dist[key] = (dist[key] ?? 0) + 1;
    }
  }
  return Object.entries(dist)
    .sort((a, b) => b[1] - a[1])
    .map(([score, count]) => ({ score, count }));
}

function buildControversy(data: GroupData) {
  const playedGames = [...data.games.filter((g) => g.status === 3)]
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  return playedGames.map((game) => {
    const bets = data.memberPredictions.map((mp) => {
      const g = mp.games.find((gg) => gg.gameID === game.gameID);
      return g?.gameBet?.selection ? `${g.gameBet.selection.team1}-${g.gameBet.selection.team2}` : null;
    }).filter(Boolean);
    const unique = new Set(bets).size;
    const label = `${game.competitors[0].name.slice(0, 3)}-${game.competitors[1].name.slice(0, 3)}`;
    return { label, unique, total: bets.length };
  });
}

const firstName = (name: string) => name.split(' ')[0];

// #1 — rank (position) per member after each played game
function buildRankOverTime(data: GroupData) {
  const playedGames = [...data.games.filter((g) => g.status === 3)]
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  if (playedGames.length === 0) return { chartData: [], members: [] as Member[] };

  const members = [...data.table.members].sort((a, b) => Number(a.rank) - Number(b.rank));
  const cumulative: Record<number, number> = {};
  members.forEach((m) => (cumulative[m.userID] = 0));

  const chartData = playedGames.map((game, idx) => {
    for (const member of members) {
      const mp = data.memberPredictions.find((p) => p.userID === member.userID);
      const g = mp?.games.find((gg) => gg.gameID === game.gameID);
      cumulative[member.userID] += g?.gameBet?.gainedPoints ?? 0;
    }
    // assign ranks (ties share a rank)
    const sorted = [...members].sort((a, b) => cumulative[b.userID] - cumulative[a.userID]);
    const entry: Record<string, unknown> = {
      label: `${game.competitors[0].name.slice(0, 3)}-${game.competitors[1].name.slice(0, 3)}`,
      gameIdx: idx + 1,
    };
    sorted.forEach((m, i) => {
      const prev = i > 0 ? sorted[i - 1] : null;
      const rank = prev && cumulative[m.userID] === cumulative[prev.userID]
        ? (entry[`__rank_${prev.userID}`] as number)
        : i + 1;
      entry[`__rank_${m.userID}`] = rank;
      entry[String(m.userID)] = rank;
    });
    return entry;
  });

  return { chartData, members };
}

// #2 — predictions only one person made that turned out exact ("hidden card")
function buildUniqueHits(data: GroupData) {
  const counts = new Map<number, number>();
  data.table.members.forEach((m) => counts.set(m.userID, 0));

  for (const game of data.games) {
    if (game.status !== 3) continue;
    const perMember = data.table.members.map((m) => {
      const mp = data.memberPredictions.find((p) => p.userID === m.userID);
      const g = mp?.games.find((gg) => gg.gameID === game.gameID);
      const sel = g?.gameBet?.selection;
      return {
        userID: m.userID,
        key: sel ? `${sel.team1}-${sel.team2}` : null,
        outcome: classifyOutcome(g?.gameBet?.betOutcome),
      };
    });
    const keyCounts: Record<string, number> = {};
    for (const p of perMember) if (p.key) keyCounts[p.key] = (keyCounts[p.key] ?? 0) + 1;
    for (const p of perMember) {
      if (p.key && p.outcome === 'exact' && keyCounts[p.key] === 1) {
        counts.set(p.userID, (counts.get(p.userID) ?? 0) + 1);
      }
    }
  }

  return [...data.table.members]
    .map((m) => ({ name: firstName(m.name), count: counts.get(m.userID) ?? 0 }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);
}

// #3 — group hit-rate (exact/direction/miss) per round
function buildHitRateByRound(data: GroupData) {
  const roundMap = buildRoundMap(data.games);
  const buckets = new Map<string, { exact: number; direction: number; miss: number }>();

  for (const mp of data.memberPredictions) {
    for (const g of mp.games) {
      if (g.status !== 3) continue;
      const rk = roundMap.get(g.gameID);
      if (!rk) continue;
      const b = buckets.get(rk) ?? { exact: 0, direction: 0, miss: 0 };
      const o = classifyOutcome(g.gameBet?.betOutcome);
      if (o === 'exact') b.exact++;
      else if (o === 'direction') b.direction++;
      else if (o === 'miss') b.miss++;
      buckets.set(rk, b);
    }
  }

  return ROUND_DEFS
    .filter((d) => d.key !== 'all' && buckets.has(d.key))
    .map((d) => ({ round: d.label, ...buckets.get(d.key)! }));
}

// #4 — pairwise similarity: % of identical scorelines between every two members
function buildSimilarityMatrix(data: GroupData) {
  const members = [...data.table.members].sort((a, b) => Number(a.rank) - Number(b.rank));
  const bets = new Map<number, Map<number, string>>(); // userID -> gameID -> scoreline
  for (const m of members) {
    const mp = data.memberPredictions.find((p) => p.userID === m.userID);
    const map = new Map<number, string>();
    for (const g of mp?.games ?? []) {
      const sel = g.gameBet?.selection;
      if (sel) map.set(g.gameID, `${sel.team1}-${sel.team2}`);
    }
    bets.set(m.userID, map);
  }

  const matrix = members.map((rowM) =>
    members.map((colM) => {
      if (rowM.userID === colM.userID) return null;
      const a = bets.get(rowM.userID)!;
      const b = bets.get(colM.userID)!;
      let same = 0, total = 0;
      for (const [gameID, sa] of a) {
        const sb = b.get(gameID);
        if (sb === undefined) continue;
        total++;
        if (sa === sb) same++;
      }
      return total > 0 ? Math.round((same / total) * 100) : null;
    }),
  );

  return { members, matrix };
}

// #5 — average goals predicted vs. actual (finished games)
function buildGoalsCompare(data: GroupData) {
  const finished = data.games.filter((g) => g.status === 3);
  let actualSum = 0;
  for (const g of finished) actualSum += g.scores.team1 + g.scores.team2;
  const avgActual = finished.length > 0 ? actualSum / finished.length : 0;

  let predSum = 0, predCount = 0;
  for (const mp of data.memberPredictions) {
    for (const g of mp.games) {
      if (g.status !== 3) continue;
      const sel = g.gameBet?.selection;
      if (!sel) continue;
      predSum += sel.team1 + sel.team2;
      predCount++;
    }
  }
  const avgPred = predCount > 0 ? predSum / predCount : 0;

  return [
    { name: 'ניחוש המשתתפים', goals: Number(avgPred.toFixed(2)) },
    { name: 'בפועל', goals: Number(avgActual.toFixed(2)) },
  ];
}

// #6 — longest streak of non-miss hits (exact or direction) per member
function buildStreaks(data: GroupData) {
  const playedGames = [...data.games.filter((g) => g.status === 3)]
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  return [...data.table.members]
    .map((m) => {
      const mp = data.memberPredictions.find((p) => p.userID === m.userID);
      let longest = 0, current = 0, running = 0;
      for (const game of playedGames) {
        const g = mp?.games.find((gg) => gg.gameID === game.gameID);
        const o = classifyOutcome(g?.gameBet?.betOutcome);
        if (o === 'exact' || o === 'direction') {
          running++;
          longest = Math.max(longest, running);
        } else {
          running = 0;
        }
      }
      current = running;
      return { name: firstName(m.name), longest, current };
    })
    .filter((r) => r.longest > 0)
    .sort((a, b) => b.longest - a.longest || b.current - a.current);
}

export default function TrendsTab({ data }: { data: GroupData }) {
  const playedCount = data.games.filter((g) => g.status === 3).length;

  if (playedCount === 0) {
    return <div className={styles.empty}>אין משחקים שהסתיימו עדיין</div>;
  }

  const { chartData, members } = buildPointsOverTime(data);
  const controversyData = buildControversy(data);
  const scoreDistData = buildScoreDistribution(data);
  const predDistData = buildPredictionDistribution(data);
  const { chartData: rankData } = buildRankOverTime(data);
  const uniqueHits = buildUniqueHits(data);
  const hitRateByRound = buildHitRateByRound(data);
  const { members: simMembers, matrix: simMatrix } = buildSimilarityMatrix(data);
  const goalsCompare = buildGoalsCompare(data);
  const streaks = buildStreaks(data);

  return (
    <div className={styles.wrap}>

      {/* Score distribution */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>התפלגות תוצאות במונדיאל</div>
        <div className={styles.sectionSub}>כמה פעמים כל תוצאה הסתיימה (ממשחקים שהסתיימו)</div>
        <div className={styles.chartWrap}>
          <ResponsiveContainer width="100%" height={Math.max(240, scoreDistData.length * 32)}>
            <BarChart
              layout="vertical"
              data={scoreDistData}
              margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
              <YAxis type="category" dataKey="score" width={48} tick={{ fill: 'var(--color-text)', fontSize: 13, fontWeight: 600 }} />
              <Tooltip
                contentStyle={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 8, direction: 'rtl' }}
                formatter={(v) => [`${v} משחקים`, 'כמות']}
                labelStyle={{ color: 'var(--color-accent)', fontWeight: 700 }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {scoreDistData.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? 'var(--color-accent)' : `hsl(${200 + i * 8}, 65%, 55%)`} />
                ))}
                <LabelList dataKey="count" position="right" style={{ fill: 'var(--color-text)', fontSize: 12, fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Prediction distribution */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>התפלגות ניחושי המשתתפים</div>
        <div className={styles.sectionSub}>כמה פעמים כל תוצאה נוחשה בסך הכל (כל הניחושים של כולם)</div>
        <div className={styles.chartWrap}>
          <ResponsiveContainer width="100%" height={Math.max(240, predDistData.length * 32)}>
            <BarChart
              layout="vertical"
              data={predDistData}
              margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
              <YAxis type="category" dataKey="score" width={48} tick={{ fill: 'var(--color-text)', fontSize: 13, fontWeight: 600 }} />
              <Tooltip
                contentStyle={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 8, direction: 'rtl' }}
                formatter={(v) => [`${v} ניחושים`, 'כמות']}
                labelStyle={{ color: 'var(--color-accent)', fontWeight: 700 }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {predDistData.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? '#22c55e' : `hsl(${150 + i * 8}, 60%, 50%)`} />
                ))}
                <LabelList dataKey="count" position="right" style={{ fill: 'var(--color-text)', fontSize: 12, fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Points over time */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>נקודות מצטברות לאורך הטורניר</div>
        <div className={styles.sectionSub}>נקודות שנצברו ממשחקי תחזיות (לא כולל בונוסים)</div>
        <div className={styles.legend}>
          {members.map((m, i) => (
            <div key={m.userID} className={styles.legendItem}>
              <div className={styles.legendLine} style={{ background: PLAYER_COLORS[i % PLAYER_COLORS.length] }} />
              {m.name}
            </div>
          ))}
        </div>
        <div className={styles.chartWrap}>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 8, direction: 'rtl' }}
                labelStyle={{ color: 'var(--color-text)', fontWeight: 600 }}
                itemStyle={{ color: 'var(--color-text-muted)' }}
              />
              {members.map((m, i) => (
                <Line
                  key={m.userID}
                  type="monotone"
                  dataKey={String(m.userID)}
                  name={m.name}
                  stroke={PLAYER_COLORS[i % PLAYER_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Controversy per match */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>מחלוקת לפי משחק</div>
        <div className={styles.sectionSub}>כמה תחזיות שונות היו לכל משחק (יותר = יותר שנוי במחלוקת)</div>
        <div className={styles.chartWrap}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={controversyData} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} label={{ value: 'תחזיות שונות', angle: -90, position: 'insideLeft', fill: 'var(--color-text-muted)', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 8, direction: 'rtl' }}
                formatter={(v, _, entry) => [`${v} תחזיות שונות מתוך ${(entry as { payload: { total: number } }).payload.total}`, 'ייחודיות']}
                labelStyle={{ color: 'var(--color-text)', fontWeight: 600 }}
              />
              <Bar dataKey="unique" radius={[4, 4, 0, 0]}>
                {controversyData.map((_, i) => (
                  <Cell key={i} fill={`hsl(${220 + i * 25}, 70%, 60%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* #1 — Rank over time */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>דירוג לאורך הזמן</div>
        <div className={styles.sectionSub}>המיקום בטבלה אחרי כל משחק (1 = ראשון; ככל שלמעלה — טוב יותר)</div>
        <div className={styles.legend}>
          {members.map((m, i) => (
            <div key={m.userID} className={styles.legendItem}>
              <div className={styles.legendLine} style={{ background: PLAYER_COLORS[i % PLAYER_COLORS.length] }} />
              {m.name}
            </div>
          ))}
        </div>
        <div className={styles.chartWrap}>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={rankData} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
              <YAxis reversed allowDecimals={false} domain={[1, members.length]} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 8, direction: 'rtl' }}
                labelStyle={{ color: 'var(--color-text)', fontWeight: 600 }}
                itemStyle={{ color: 'var(--color-text-muted)' }}
                formatter={(v, name) => [`מקום ${v}`, name as string]}
              />
              {members.map((m, i) => (
                <Line
                  key={m.userID}
                  type="monotone"
                  dataKey={String(m.userID)}
                  name={m.name}
                  stroke={PLAYER_COLORS[i % PLAYER_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* #3 — Hit-rate by round */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>שיעור פגיעה לפי מחזור</div>
        <div className={styles.sectionSub}>סך הניחושים של כולם בכל מחזור — בול / כיוון / החטאה</div>
        {hitRateByRound.length === 0 ? (
          <div className={styles.note}>אין עדיין מחזורים שהסתיימו</div>
        ) : (
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={Math.max(200, hitRateByRound.length * 56)}>
              <BarChart layout="vertical" data={hitRateByRound} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
                <YAxis type="category" dataKey="round" width={80} tick={{ fill: 'var(--color-text)', fontSize: 13, fontWeight: 600 }} />
                <Tooltip
                  contentStyle={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 8, direction: 'rtl' }}
                  labelStyle={{ color: 'var(--color-accent)', fontWeight: 700 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="exact" name="בול" stackId="a" fill="var(--color-exact)" />
                <Bar dataKey="direction" name="כיוון" stackId="a" fill="var(--color-direction)" />
                <Bar dataKey="miss" name="החטאה" stackId="a" fill="var(--color-miss)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* #6 — Streaks */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>רצפים חמים</div>
        <div className={styles.sectionSub}>הפס = רצף הפגיעות הארוך ביותר (בול או כיוון). הנקודה = הרצף הנוכחי</div>
        {streaks.length === 0 ? (
          <div className={styles.note}>אין עדיין רצפים</div>
        ) : (
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={Math.max(180, streaks.length * 34)}>
              <ComposedChart layout="vertical" data={streaks} margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fill: 'var(--color-text)', fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 8, direction: 'rtl' }}
                  labelStyle={{ color: 'var(--color-accent)', fontWeight: 700 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="longest" name="רצף שיא" radius={[0, 4, 4, 0]} fill="#f97316" barSize={14}>
                  <LabelList dataKey="longest" position="right" style={{ fill: 'var(--color-text)', fontSize: 12, fontWeight: 600 }} />
                </Bar>
                <Scatter dataKey="current" name="רצף נוכחי" fill="#22c55e" shape="circle" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* #2 — Hidden card: unique correct predictions */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>קלף נסתר 🃏</div>
        <div className={styles.sectionSub}>ניחושים שרק שחקן אחד העז לנחש — ופגע בול</div>
        {uniqueHits.length === 0 ? (
          <div className={styles.note}>אין עדיין ניחושים ייחודיים שפגעו בול</div>
        ) : (
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={Math.max(160, uniqueHits.length * 30)}>
              <BarChart layout="vertical" data={uniqueHits} margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fill: 'var(--color-text)', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 8, direction: 'rtl' }}
                  formatter={(v) => [`${v} פעמים`, 'קלף נסתר']}
                  labelStyle={{ color: 'var(--color-accent)', fontWeight: 700 }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} fill="#a855f7">
                  <LabelList dataKey="count" position="right" style={{ fill: 'var(--color-text)', fontSize: 12, fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* #5 — Predicted vs actual average goals */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>ממוצע שערים: ניחוש מול בפועל</div>
        <div className={styles.sectionSub}>ממוצע סך השערים למשחק — מה ניחשו המשתתפים מול מה שקרה בפועל</div>
        <div className={styles.chartWrap}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={goalsCompare} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'var(--color-text)', fontSize: 13 }} />
              <YAxis allowDecimals tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 8, direction: 'rtl' }}
                formatter={(v) => [`${v} שערים בממוצע`, '']}
                labelStyle={{ color: 'var(--color-accent)', fontWeight: 700 }}
              />
              <Bar dataKey="goals" radius={[4, 4, 0, 0]}>
                <Cell fill="#a855f7" />
                <Cell fill="var(--color-accent)" />
                <LabelList dataKey="goals" position="top" style={{ fill: 'var(--color-text)', fontSize: 12, fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* #4 — Similarity matrix */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>מי הכי דומה למי</div>
        <div className={styles.sectionSub}>אחוז הניחושים הזהים בין כל שני שחקנים (ירוק כהה = דומים יותר)</div>
        <div className={styles.matrixWrap}>
          <table className={styles.matrix}>
            <thead>
              <tr>
                <th className={styles.matrixCorner}></th>
                {simMembers.map((m) => (
                  <th key={m.userID} className={styles.matrixHead}>{firstName(m.name)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {simMembers.map((rowM, ri) => (
                <tr key={rowM.userID}>
                  <th className={styles.matrixRowHead}>{firstName(rowM.name)}</th>
                  {simMatrix[ri].map((pct, ci) => (
                    <td
                      key={ci}
                      className={styles.matrixCell}
                      style={{
                        // higher % => darker green (lower lightness)
                        background: pct === null ? 'var(--color-surface-2)' : `hsl(145, 55%, ${70 - (pct / 100) * 45}%)`,
                        color: pct === null ? 'var(--color-text-muted)' : pct >= 50 ? '#eafff2' : '#0b1f12',
                      }}
                      title={pct === null ? '' : `${firstName(rowM.name)} ↔ ${firstName(simMembers[ci].name)}: ${pct}%`}
                    >
                      {pct === null ? '' : `${pct}%`}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
