import styles from './Pager.module.css';

export default function Pager({
  page,
  pageCount,
  total,
  perPage,
  onPrev,
  onNext,
}: {
  page: number;
  pageCount: number;
  total: number;
  perPage: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const from = page * perPage + 1;
  const to = Math.min((page + 1) * perPage, total);

  return (
    <div className={styles.pager}>
      <button className={styles.btn} onClick={onPrev} disabled={page === 0}>
        הקודמים
      </button>
      <span className={styles.info}>
        {from}–{to} מתוך {total} · עמוד {page + 1}/{pageCount}
      </span>
      <button className={styles.btn} onClick={onNext} disabled={page >= pageCount - 1}>
        הבאים
      </button>
    </div>
  );
}
