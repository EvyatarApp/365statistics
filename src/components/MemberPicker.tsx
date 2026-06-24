import { useState } from 'react';
import styles from './MemberPicker.module.css';

export interface PickItem {
  userID: number;
  name: string;
}

/**
 * A search box to add specific members to a capped chart, plus removable chips
 * for the ones already added. Render this only when there are more members than
 * the chart's cap (otherwise everyone is shown and there's nothing to add).
 */
export default function MemberPicker({
  addable,
  pinned,
  onAdd,
  onRemove,
}: {
  addable: PickItem[];
  pinned: PickItem[];
  onAdd: (id: number) => void;
  onRemove: (id: number) => void;
}) {
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const matches = query
    ? addable.filter((m) => m.name.toLowerCase().includes(query)).slice(0, 8)
    : [];

  return (
    <div className={styles.picker}>
      <div className={styles.inputWrap}>
        <input
          className={styles.input}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="חיפוש שחקן להוספה לגרף…"
        />
        {matches.length > 0 && (
          <div className={styles.menu}>
            {matches.map((m) => (
              <button
                key={m.userID}
                className={styles.option}
                onClick={() => {
                  onAdd(m.userID);
                  setQ('');
                }}
              >
                {m.name}
              </button>
            ))}
          </div>
        )}
      </div>
      {pinned.length > 0 && (
        <div className={styles.chips}>
          {pinned.map((m) => (
            <button
              key={m.userID}
              className={styles.chip}
              onClick={() => onRemove(m.userID)}
              title="הסר מהגרף"
            >
              {m.name} ✕
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
