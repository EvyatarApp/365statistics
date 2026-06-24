import styles from './Tabs.module.css';

interface Tab {
  key: string;
  label: string;
}

interface Props {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
  large?: boolean;
}

export default function Tabs({ tabs, active, onChange, large }: Props) {
  return (
    <div className={styles.tabBar}>
      {tabs.map((t) => (
        <button
          key={t.key}
          className={[styles.tab, large ? styles.tabLarge : '', active === t.key ? styles.tabActive : ''].join(' ')}
          onClick={() => onChange(t.key)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
