import type { GroupData, Game } from '../types';
import { classifyOutcome } from '../types';
import { projectOutcome } from '../utils';
import styles from './ByMatchTab.module.css';

function MatchCard({ game, data, isLive }: { game: Game; data: GroupData; isLive: boolean }) {
  const [home, away] = game.competitors;
  // Scores/selections are ordered team1=away, team2=home in the data; display as
  // home-away to match the title order ({home} — {away}).
  const liveScore = isLive ? `${game.scores.team2}′-${game.scores.team1}′` : `${game.scores.team2}-${game.scores.team1}`;

  const memberBets = data.table.members.map((m) => {
    const mp = data.memberPredictions.find((p) => p.userID === m.userID);
    const g = mp?.games.find((gg) => gg.gameID === game.gameID);
    return { member: m, bet: g?.gameBet ?? null };
  });

  const dist: Record<string, number> = {};
  for (const { bet } of memberBets) {
    if (bet?.selection) {
      const key = `${bet.selection.team2}-${bet.selection.team1}`;
      dist[key] = (dist[key] ?? 0) + 1;
    }
  }
  const distSorted = Object.entries(dist).sort((a, b) => b[1] - a[1]);

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

      <div className={styles.predictionsGrid}>
        {memberBets.map(({ member, bet }) => {
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
