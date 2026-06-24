import { useState } from 'react';
import type { GroupData } from '../types';
import { classifyOutcome } from '../types';
import Pager from './Pager';
import styles from './RankingTab.module.css';

const PER_PAGE = 100;

export default function RankingTab({ data }: { data: GroupData }) {
  const [page, setPage] = useState(0);
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

  const pageCount = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = rows.slice(safePage * PER_PAGE, safePage * PER_PAGE + PER_PAGE);

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
          {pageRows.map(({ m, exact, direction, miss, acc }) => (
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
      {pageCount > 1 && (
        <Pager
          page={safePage}
          pageCount={pageCount}
          total={rows.length}
          perPage={PER_PAGE}
          onPrev={() => setPage((p) => Math.max(0, p - 1))}
          onNext={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
        />
      )}
    </div>
  );
}
