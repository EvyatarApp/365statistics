import { useState } from 'react';
import { setToken, setGroupId, setGroupName, getToken } from '../api';
import styles from './TokenSetup.module.css';

export default function TokenSetup({ onDone }: { onDone: () => void }) {
  const [groupId, setGroupIdValue] = useState('');
  const [groupName, setGroupNameValue] = useState('');
  const [token, setTokenValue] = useState(getToken());
  const [error, setError] = useState('');

  function save() {
    const id = Number(groupId.trim());
    const t = token.trim();
    if (!id) {
      setError('אנא הזן מספר קבוצה תקין.');
      return;
    }
    if (!t) {
      setError('אנא הדבק את הטוקן שלך.');
      return;
    }
    setGroupId(id);
    setGroupName(groupName.trim());
    setToken(t);
    onDone();
  }

  return (
    <div className={styles.wrap} dir="rtl">
      <div className={styles.card}>
        <div className={styles.title}>Bolão Mundial 2026 — הגדרות</div>

        <label className={styles.label}>
          מספר קבוצה
          <input
            className={styles.input}
            placeholder="למשל 21495"
            inputMode="numeric"
            value={groupId}
            onChange={(e) => setGroupIdValue(e.target.value)}
          />
        </label>

        <details className={styles.help}>
          <summary>איך משיגים את מספר הקבוצה?</summary>
          <ol className={styles.steps}>
            <li>פתחו את הקבוצה שלכם באתר (<code>bolao.365scores.com</code>) בדפדפן, כשאתם מחוברים.</li>
            <li>פתחו את כלי המפתחים: <b>F12</b> (או קליק ימני ואז Inspect), ועברו ללשונית <b>Network</b>.</li>
            <li>רעננו את העמוד וחפשו בקשה בשם <code>GetGroupTable</code>.</li>
            <li>
              ה-URL שלה מסתיים ב-<code>&groupID=...</code> — העתיקו את המספר הזה
              (למשל <code>GetGroupTable?lang=2&groupID=2256</code> ⟸ <b>2256</b>).
            </li>
          </ol>
        </details>

        <label className={styles.label}>
          שם הקבוצה (לא חובה)
          <input
            className={styles.input}
            placeholder="הקבוצה שלי"
            value={groupName}
            onChange={(e) => setGroupNameValue(e.target.value)}
          />
        </label>

        <label className={styles.label}>
          הטוקן שלך
          <input
            className={styles.input}
            placeholder="Bearer eyJ..."
            value={token}
            onChange={(e) => setTokenValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
        </label>

        <details className={styles.help}>
          <summary>איך משיגים את הטוקן?</summary>
          <ol className={styles.steps}>
            <li>פתחו את האתר (<code>bolao.365scores.com</code>) בדפדפן, כשאתם מחוברים.</li>
            <li>פתחו את כלי המפתחים: <b>F12</b> (או קליק ימני ואז Inspect), ועברו ללשונית <b>Network</b>.</li>
            <li>רעננו את העמוד. ברשימת הבקשות, לחצו על כל בקשה אל <code>wcg-il.365scores.com</code>.</li>
            <li>פתחו <b>Headers</b> → <b>Request Headers</b> ומצאו את <code>Authorization</code>.</li>
            <li>העתיקו את הערך המלא (מתחיל ב-<code>Bearer eyJ...</code>) והדביקו אותו למעלה.</li>
          </ol>
          <p className={styles.note}>
            הטוקן נשמר רק בדפדפן שלכם (localStorage) — הוא לא נשלח לשום מקום מלבד ה-API של Bolão.
          </p>
        </details>

        <p className={styles.note}>
          טיפ: הנתונים נטענים בבקשה אחת לכל חבר בקבוצה, כך שככל שהקבוצה גדולה יותר — הטעינה אורכת יותר זמן.
          לחוויה חלקה מומלץ קבוצות עם פחות מ-~1,000 חברים.
        </p>

        {error && <p className={styles.error}>{error}</p>}

        <button className={styles.btn} onClick={save}>שמור</button>
      </div>
    </div>
  );
}
