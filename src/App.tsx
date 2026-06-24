import { useState } from 'react';
import GroupDashboard from './components/GroupDashboard';
import TokenSetup from './components/TokenSetup';
import { isConfigured, getGroupId, getGroupName, clearConfig } from './api';
import styles from './App.module.css';

export default function App() {
  const [configured, setConfigured] = useState(isConfigured());

  if (!configured) {
    return <TokenSetup onDone={() => setConfigured(true)} />;
  }

  const groupID = getGroupId();
  const groupName = getGroupName();

  function reset() {
    clearConfig();
    setConfigured(false);
  }

  return (
    <div className={styles.app}>
      <div className={styles.header}>
        <span className={styles.title}>Bolão Mundial 2026 🏆</span>
        <span className={styles.groupName}>
          {groupName || `#${groupID}`}
          <button className={styles.resetBtn} onClick={reset} title="Change group / token">
            ⚙︎
          </button>
        </span>
      </div>
      <main className={styles.main}>
        <GroupDashboard groupID={groupID} />
      </main>
    </div>
  );
}
