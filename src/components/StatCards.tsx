import type { GroupData } from '../types';
import { classifyOutcome } from '../types';
import styles from './StatCards.module.css';

function getStats(data: GroupData) {
  const playedGames = data.games.filter((g) => g.status === 3);

  // Leader (first by rank)
  const sorted = [...data.table.members].sort((a, b) => Number(a.rank) - Number(b.rank));
  const leader = sorted[0];
  const last = sorted[sorted.length - 1];
  const gap = leader && last ? Number(leader.totalScore) - Number(last.totalScore) : 0;

  // Max accuracy (across played games only)
  let maxAccuracyName = '-';
  let maxAccuracy = -1;
  if (playedGames.length > 0) {
    for (const member of data.table.members) {
      const mp = data.memberPredictions.find((p) => p.userID === member.userID);
      if (!mp) continue;
      const exact = mp.games.filter(
        (g) => g.status === 3 && classifyOutcome(g.gameBet?.betOutcome) === 'exact'
      ).length;
      const acc = exact / playedGames.length;
      if (acc > maxAccuracy) {
        maxAccuracy = acc;
        maxAccuracyName = member.name;
      }
    }
  }

  // Most controversial match = played game with most spread in predictions (highest unique bet count)
  let controversialMatch = '-';
  let maxSpread = 0;
  for (const game of playedGames) {
    const bets = data.memberPredictions.map((mp) => {
      const g = mp.games.find((gg) => gg.gameID === game.gameID);
      return g?.gameBet?.selection ? `${g.gameBet.selection.team1}-${g.gameBet.selection.team2}` : null;
    }).filter(Boolean);
    const unique = new Set(bets).size;
    if (unique > maxSpread) {
      maxSpread = unique;
      controversialMatch = `${game.competitors[0].name} - ${game.competitors[1].name}`;
    }
  }

  return { leader, gap, maxAccuracyName, maxAccuracy, controversialMatch };
}

export default function StatCards({ data }: { data: GroupData }) {
  const { leader, gap, maxAccuracyName, maxAccuracy, controversialMatch } = getStats(data);

  return (
    <div className={styles.grid}>
      <div className={styles.card}>
        <div className={styles.label}>מוביל הקבוצה</div>
        <div className={styles.value}>{leader?.name ?? '-'}</div>
        <div className={styles.sub}>{leader?.totalScore ?? 0} נקודות</div>
      </div>
      <div className={styles.card}>
        <div className={styles.label}>פער ראשון-אחרון</div>
        <div className={styles.value}>{gap}</div>
        <div className={styles.sub}>נקודות</div>
      </div>
      <div className={styles.card}>
        <div className={styles.label}>דיוק מקסימלי</div>
        <div className={styles.value}>{maxAccuracyName}</div>
        <div className={styles.sub}>{maxAccuracy >= 0 ? `${Math.round(maxAccuracy * 100)}%` : '-'}</div>
      </div>
      <div className={styles.card}>
        <div className={styles.label}>משחק שנוי במחלוקת</div>
        <div className={styles.value} style={{ fontSize: 13 }}>{controversialMatch}</div>
        <div className={styles.sub}></div>
      </div>
    </div>
  );
}
