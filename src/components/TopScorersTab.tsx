import { useState, useEffect } from 'react';
import { fetchTopScorers, type TopScorer } from '../api';
import type { GroupData } from '../types';
import styles from './TopScorersTab.module.css';

export default function TopScorersTab({ data }: { data: GroupData }) {
  const [scorers, setScorers] = useState<TopScorer[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTopScorers()
      .then(setScorers)
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <div className={styles.error}>שגיאה בטעינה: {error}</div>;
  if (!scorers) return <div className={styles.loading}>טוען...</div>;

  const leaderGoals = scorers[0]?.score ?? 0;

  return (
    <div className={styles.wrap}>

      {/* Live top scorers leaderboard */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>מלכי השערים — תוצאות אמת</div>
        {scorers.map((p, i) => (
          <div key={p.athleteID} className={styles.scorerRow}>
            <div className={styles.rank}>
              {p.score === leaderGoals ? '👑' : i + 1}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className={styles.scorerName}>{p.name}</div>
              <div className={styles.country}>{p.countryName}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div className={styles.goals}>{p.score}</div>
              <div className={styles.goalsLabel}>שערים</div>
            </div>
          </div>
        ))}
      </div>

      {/* Member predictions */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>ניחושי הקבוצה — מלך שערים</div>
        {[...data.table.members]
          .sort((a, b) => Number(a.rank) - Number(b.rank))
          .map((m) => {
            const isCurrentlyLeading = scorers.some(
              (s) => s.score === leaderGoals && s.name === m.topScorerName
            );
            return (
              <div key={m.userID} className={styles.predictRow}>
                <div className={styles.memberName}>{m.name}</div>
                <div className={styles.predictedPlayer}>{m.topScorerName}</div>
                {isCurrentlyLeading && (
                  <div className={styles.hitBadge}>מוביל ✓</div>
                )}
              </div>
            );
          })}
      </div>

    </div>
  );
}
