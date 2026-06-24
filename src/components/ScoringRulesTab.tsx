import styles from './ScoringRulesTab.module.css';

const stages = [
  { name: 'שלב בתים', direction: 1, exact: 3 },
  { name: '32 האחרונות', direction: 2, exact: 5 },
  { name: 'שמינית גמר', direction: 2, exact: 5 },
  { name: 'רבע גמר', direction: 4, exact: 8 },
  { name: 'חצי גמר', direction: 5, exact: 10 },
  { name: 'משחק על מקום שלישי', direction: 5, exact: 10 },
  { name: 'גמר', direction: 8, exact: 15 },
];

const bonuses = [
  { name: 'נבחרת זוכה', pts: 12 },
  { name: 'מלך שערים', pts: 12 },
];

export default function ScoringRulesTab() {
  return (
    <div className={styles.wrap}>
      <div className={styles.section}>
        <div className={styles.sectionTitle}>ניקוד לפי שלב</div>
        {stages.map((s) => (
          <div key={s.name} className={styles.row}>
            <span className={styles.stage}>{s.name}</span>
            <div className={styles.points}>
              <div className={styles.ptItem}>
                <span className={styles.ptValue} style={{ color: 'var(--color-direction)' }}>{s.direction}</span>
                <span className={styles.ptLabel}>כיוון</span>
              </div>
              <div className={styles.ptItem}>
                <span className={styles.ptValue} style={{ color: 'var(--color-exact)' }}>{s.exact}</span>
                <span className={styles.ptLabel}>בול</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>בונוסים</div>
        {bonuses.map((b) => (
          <div key={b.name} className={styles.bonus}>
            <span className={styles.stage}>{b.name}</span>
            <span className={styles.bonusPts}>{b.pts} נק׳</span>
          </div>
        ))}
      </div>
    </div>
  );
}
