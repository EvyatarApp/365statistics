import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchGroupData } from '../api';
import type { GroupData } from '../types';
import type { RoundKey } from '../rounds';
import { buildRoundMap, availableRounds, filterDataByRound } from '../rounds';
import Tabs from './Tabs';
import StatCards from './StatCards';
import RankingTab from './RankingTab';
import ByMatchTab from './ByMatchTab';
import AccuracyTab from './AccuracyTab';
import ScoringRulesTab from './ScoringRulesTab';
import TrendsTab from './TrendsTab';
import TopScorersTab from './TopScorersTab';
import styles from './GroupDashboard.module.css';

const SUB_TABS = [
  { key: 'ranking', label: 'דירוג' },
  { key: 'bymatch', label: 'לפי משחק' },
  { key: 'accuracy', label: 'דיוק' },
  { key: 'trends', label: 'מגמות' },
  { key: 'topscorers', label: 'מלך שערים' },
  { key: 'rules', label: 'טבלת ניקוד' },
];

// Tabs whose data is meaningful per-round (get a round selector + round-scoped data).
const ROUND_AWARE_TABS = new Set(['ranking', 'bymatch', 'accuracy', 'trends']);

const POLL_INTERVAL = 60_000;

export default function GroupDashboard({ groupID }: { groupID: number }) {
  const [data, setData] = useState<GroupData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subTab, setSubTab] = useState('ranking');
  const [round, setRound] = useState<RoundKey>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const roundMap = useMemo(() => buildRoundMap(data?.games ?? []), [data]);
  const roundTabs = useMemo(
    () => availableRounds(data?.games ?? [], roundMap),
    [data, roundMap],
  );

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const d = await fetchGroupData(groupID);
      setData(d);
      setLastUpdated(new Date());
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setRefreshing(false);
    }
  }, [groupID]);

  // initial load
  useEffect(() => {
    setData(null);
    setError(null);
    load();
  }, [load]);

  // auto-poll when any game is live
  useEffect(() => {
    if (!data) return;
    const hasLive = data.games.some((g) => g.status === 2);
    if (!hasLive) return;
    const id = setInterval(() => load(), POLL_INTERVAL);
    return () => clearInterval(id);
  }, [data, load]);

  const hasLive = data?.games.some((g) => g.status === 2) ?? false;

  if (error) return <div className={styles.error}>שגיאה בטעינה: {error}</div>;
  if (!data) return (
    <div className={styles.loading}>
      <div className={styles.spinner} />
      טוען נתונים...
    </div>
  );

  const roundData = filterDataByRound(data, round, roundMap);

  return (
    <div className={styles.wrap}>
      <div className={styles.content}>
        <StatCards data={data} />
        <div className={styles.toolbar}>
          <Tabs tabs={SUB_TABS} active={subTab} onChange={setSubTab} />
          <div className={styles.toolbarRight}>
            {hasLive && <span className={styles.livePill}><span className={styles.liveDot} />LIVE — מתרענן אוטומטית</span>}
            {lastUpdated && (
              <span className={styles.updated}>
                עודכן {lastUpdated.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
            <button
              className={styles.refreshBtn}
              onClick={() => load(true)}
              disabled={refreshing}
            >
              {refreshing ? '...' : '↻ רענן'}
            </button>
          </div>
        </div>
        <div className={styles.subTabContent}>
          {ROUND_AWARE_TABS.has(subTab) && roundTabs.length > 1 && (
            <div className={styles.roundBar}>
              <span className={styles.roundLabel}>מחזור:</span>
              <div className={styles.roundPills}>
                {roundTabs.map((r) => (
                  <button
                    key={r.key}
                    className={`${styles.roundPill} ${round === r.key ? styles.roundPillActive : ''}`}
                    onClick={() => setRound(r.key)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {subTab === 'ranking' && <RankingTab data={roundData} />}
          {subTab === 'bymatch' && <ByMatchTab data={roundData} />}
          {subTab === 'accuracy' && <AccuracyTab data={roundData} />}
          {subTab === 'trends' && <TrendsTab data={roundData} />}
          {subTab === 'topscorers' && <TopScorersTab data={data} />}
          {subTab === 'rules' && <ScoringRulesTab />}
        </div>
      </div>
    </div>
  );
}
