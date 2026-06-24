import { useState } from 'react';
import GroupDashboard from './components/GroupDashboard';
import TokenSetup from './components/TokenSetup';
import { isConfigured, getGroupId, getGroupName, clearGroup } from './api';
import styles from './App.module.css';

export default function App() {
  const [configured, setConfigured] = useState(isConfigured());

  if (!configured) {
    return <TokenSetup onDone={() => setConfigured(true)} />;
  }

  const groupID = getGroupId();
  const groupName = getGroupName();

  function switchGroup() {
    clearGroup();
    setConfigured(false);
  }

  return (
    <div className={styles.app}>
      <div className={styles.header}>
        <span className={styles.title}>Bolão Mundial 2026 🏆</span>
        <span className={styles.groupName}>
          {groupName || `#${groupID}`}
          <button className={styles.resetBtn} onClick={switchGroup} title="החלף קבוצה">
            החלף קבוצה
          </button>
        </span>
      </div>
      <main className={styles.main}>
        <GroupDashboard groupID={groupID} />
      </main>
    </div>
  );
}
