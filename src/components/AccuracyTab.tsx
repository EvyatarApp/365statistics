import { useState } from 'react';
import type { GroupData } from '../types';
import { classifyOutcome } from '../types';
import Pager from './Pager';
import styles from './AccuracyTab.module.css';

const PER_PAGE = 100;

export default function AccuracyTab({ data }: { data: GroupData }) {
  const [page, setPage] = useState(0);
  const playedGames = data.games.filter((g) => g.status === 3);

  if (playedGames.length === 0) {
    return <div className={styles.empty}>אין משחקים שהסתיימו עדיין</div>;
  }

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
      const pct = total > 0 ? Math.round((exact / total) * 100) : 0;
      return { m, exact, direction, miss, pct, total };
    });

  const pageCount = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = rows.slice(safePage * PER_PAGE, safePage * PER_PAGE + PER_PAGE);

  return (
    <div className={styles.wrap}>
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: 'var(--color-exact)' }} />
          בול
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: 'var(--color-direction)' }} />
          כיוון
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: 'var(--color-miss)' }} />
          החטאה
        </div>
      </div>

      <div className={styles.rows}>
        {pageRows.map(({ m, exact, direction, miss, pct }) => {
          const eW = total > 0 ? (exact / total) * 100 : 0;
          const dW = total > 0 ? (direction / total) * 100 : 0;
          const mW = total > 0 ? (miss / total) * 100 : 0;
          return (
            <div key={m.userID} className={styles.row}>
              <div className={styles.name}>{m.name}</div>
              <div className={styles.barTrack}>
                {exact > 0 && (
                  <div className={styles.segExact} style={{ width: `${eW}%` }}>
                    {eW >= 12 ? exact : ''}
                  </div>
                )}
                {direction > 0 && (
                  <div className={styles.segDirection} style={{ width: `${dW}%` }}>
                    {dW >= 12 ? direction : ''}
                  </div>
                )}
                {miss > 0 && (
                  <div className={styles.segMiss} style={{ width: `${mW}%` }}>
                    {mW >= 12 ? miss : ''}
                  </div>
                )}
              </div>
              <div className={styles.pct}>{pct}%</div>
            </div>
          );
        })}
      </div>
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
