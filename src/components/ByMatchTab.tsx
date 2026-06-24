import { useState } from 'react';
import type { GroupData, Game } from '../types';
import { classifyOutcome } from '../types';
import { projectOutcome } from '../utils';
import MemberPicker from './MemberPicker';
import styles from './ByMatchTab.module.css';

// How many members' bets to show per match before "show 50 more" / search.
const MATCH_CAP = 50;

function MatchCard({ game, data, isLive }: { game: Game; data: GroupData; isLive: boolean }) {
  const [home, away] = game.competitors;
  // Scores/selections are ordered team1=away, team2=home in the data; display as
  // home-away to match the title order ({home} — {away}).
  const liveScore = isLive ? `${game.scores.team2}′-${game.scores.team1}′` : `${game.scores.team2}-${game.scores.team1}`;

  const [shown, setShown] = useState(MATCH_CAP);
  const [pins, setPins] = useState<number[]>([]);

  const memberBets = data.table.members.map((m) => {
    const mp = data.memberPredictions.find((p) => p.userID === m.userID);
    const g = mp?.games.find((gg) => gg.gameID === game.gameID);
    return { member: m, bet: g?.gameBet ?? null };
  });

  // Distribution always reflects EVERYONE, regardless of how many bets are shown.
  const dist: Record<string, number> = {};
  for (const { bet } of memberBets) {
    if (bet?.selection) {
      const key = `${bet.selection.team2}-${bet.selection.team1}`;
      dist[key] = (dist[key] ?? 0) + 1;
    }
  }
  const distSorted = Object.entries(dist).sort((a, b) => b[1] - a[1]);

  // Bets shown: the first `shown` (by ranking) plus any pinned members.
  const capped = memberBets.length > MATCH_CAP;
  const visibleIds = new Set<number>();
  memberBets.slice(0, capped ? shown : memberBets.length).forEach((b) => visibleIds.add(b.member.userID));
  pins.forEach((id) => visibleIds.add(id));
  const visibleBets = memberBets.filter((b) => visibleIds.has(b.member.userID));
  const addable = memberBets
    .filter((b) => !visibleIds.has(b.member.userID))
    .map((b) => ({ userID: b.member.userID, name: b.member.name }));
  const pinned = memberBets
    .filter((b) => pins.includes(b.member.userID))
    .map((b) => ({ userID: b.member.userID, name: b.member.name }));

  return (
    <div className={styles.matchCard}>
      <div className={styles.matchHeader}>
        <span className={styles.teams}>{home.name} — {away.name}</span>
        <span className={styles.score}>
          {liveScore}
          {isLive && <span className={styles.liveBadge}>LIVE</span>}
        </span>
        <span className={styles.stageBadge}>{game.gtd} | {game.compGroupName}</span>
        <span className={styles.pts}>בול: {game.gameBetOutcomes.full}נק׳ | כיוון: {game.gameBetOutcomes.partial}נק׳</span>
      </div>

      {isLive && (
        <div className={styles.liveNote}>
          תוצאות מוקרנות — מה כל אחד יקבל אם התוצאה הנוכחית תישאר
        </div>
      )}

      {capped && (
        <MemberPicker
          addable={addable}
          pinned={pinned}
          onAdd={(id) => setPins((p) => [...p, id])}
          onRemove={(id) => setPins((p) => p.filter((x) => x !== id))}
        />
      )}

      <div className={styles.predictionsGrid}>
        {visibleBets.map(({ member, bet }) => {
          const betStr = bet?.selection ? `${bet.selection.team2}-${bet.selection.team1}` : null;

          let o: ReturnType<typeof classifyOutcome>;
          if (!betStr) {
            o = 'pending';
          } else if (isLive && bet?.selection) {
            o = projectOutcome(
              bet.selection.team1, bet.selection.team2,
              game.scores.team1, game.scores.team2
            );
          } else {
            o = classifyOutcome(bet?.betOutcome);
          }

          return (
            <div key={member.userID} className={styles.predCell}>
              <span className={styles.predName}>{member.name}</span>
              {betStr ? (
                <span className={styles.predBet}>
                  {betStr}
                  <span className={`${styles.dot} ${styles[o]} ${isLive ? styles.dotProjected : ''}`} />
                </span>
              ) : (
                <span className={styles.noBet}>—</span>
              )}
            </div>
          );
        })}
      </div>

      {capped && (
        <div className={styles.showMoreRow}>
          <span className={styles.showMoreInfo}>
            מציג {Math.min(shown, memberBets.length)} מתוך {memberBets.length}
          </span>
          {shown < memberBets.length && (
            <button
              className={styles.showMoreBtn}
              onClick={() => setShown((s) => s + MATCH_CAP)}
            >
              הצג עוד {Math.min(MATCH_CAP, memberBets.length - shown)}
            </button>
          )}
        </div>
      )}

      <div className={styles.distSection}>
        <div className={styles.distTitle}>התפלגות תחזיות</div>
        <div className={styles.distList}>
          {distSorted.map(([score, count]) => (
            <div key={score} className={`${styles.distItem} ${score === liveScore.replace('′', '') ? styles.distItemMatch : ''}`}>
              <span className={styles.distScore}>{score}</span>
              <span className={styles.distCount}>×{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ByMatchTab({ data }: { data: GroupData }) {
  const byTime = (a: { startTime: string }, b: { startTime: string }) =>
    new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
  const liveGames = data.games.filter((g) => g.status === 2).sort(byTime);
  const finishedGames = data.games.filter((g) => g.status === 3).sort(byTime);

  if (liveGames.length === 0 && finishedGames.length === 0) {
    return <div style={{ padding: 32, color: 'var(--color-text-muted)', textAlign: 'center' }}>אין משחקים שהחלו עדיין</div>;
  }

  return (
    <div className={styles.wrap}>
      {liveGames.length > 0 && (
        <>
          <div className={styles.sectionLabel}>🔴 משחקים כעת</div>
          {liveGames.map((g) => <MatchCard key={g.gameID} game={g} data={data} isLive />)}
        </>
      )}
      {finishedGames.length > 0 && (
        <>
          {liveGames.length > 0 && <div className={styles.sectionLabel}>משחקים שהסתיימו</div>}
          {finishedGames.map((g) => <MatchCard key={g.gameID} game={g} data={data} isLive={false} />)}
        </>
      )}
    </div>
  );
}
