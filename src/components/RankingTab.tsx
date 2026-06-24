import type { GroupData } from '../types';
import { classifyOutcome } from '../types';
import styles from './RankingTab.module.css';

export default function RankingTab({ data }: { data: GroupData }) {
  const playedGames = data.games.filter((g) => g.status === 3);
  const total = playedGames.length;

  const rows = [...data.table.members]
    .sort((a, b) => Number(a.rank) - Number(b.rank))
    .map((m) => {
      const mp = data.memberPredictions.find((p) => p.userID === m.userID);
      let exact = 0, direction = 0, miss = 0;
      if (mp) {
        for (const g of mp.games) {
          if (g.status !== 3) continue;
          const o = classifyOutcome(g.gameBet?.betOutcome);
          if (o === 'exact') exact++;
          else if (o === 'direction') direction++;
          else if (o === 'miss') miss++;
        }
      }
      const acc = total > 0 ? exact / total : 0;
      return { m, exact, direction, miss, acc };
    });

  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>#</th>
            <th>שם</th>
            <th>נקודות</th>
            <th>בול</th>
            <th>כיוון</th>
            <th>החטאה</th>
            <th>דיוק</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ m, exact, direction, miss, acc }) => (
            <tr key={m.userID}>
              <td className={styles.rank}>{m.rank}</td>
              <td className={styles.name}>{m.name}</td>
              <td className={styles.pts}>{m.totalScore}</td>
              <td><span className={`${styles.badge} ${styles.exact}`}>{exact}</span></td>
              <td><span className={`${styles.badge} ${styles.direction}`}>{direction}</span></td>
              <td><span className={`${styles.badge} ${styles.miss}`}>{miss}</span></td>
              <td>
                <div className={styles.accBar}>
                  <div className={styles.bar}>
                    <div className={styles.barFill} style={{ width: `${acc * 100}%` }} />
                  </div>
                  <span className={styles.accPct}>{Math.round(acc * 100)}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
