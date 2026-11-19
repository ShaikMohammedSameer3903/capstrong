import { useState, useEffect, useRef } from 'react';
import { useOperationStore } from '../../store/operationStore';
import { useAppStore } from '../../store/appStore';
import { useCloudStore } from '../../store/cloudStore';
import { Activity, Play, Terminal, CheckCircle2, AlertCircle, Clock, Loader2, Sparkles, Search } from 'lucide-react';
import { api } from '../../services/api';

type FilterTab = 'All' | 'Deployments' | 'Security' | 'Costs' | 'Backups' | 'Discovery';

export default function ActivityPanel() {
  const { operations } = useOperationStore();
  const { isRefreshing, lastResourceSync, activityPanelCollapsed, subscriptions, activeSubscriptionId, resources } = useAppStore();
  const { cloudAccounts, selectedProvider } = useCloudStore();
  const [dbOps, setDbOps] = useState<any[]>([]);
  const [scanDuration, setScanDuration] = useState(4.2);
  const [filterQuery, setFilterQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('All');

  const loadPastOperations = async () => {
    try {
      const data = await api.get<any[]>('/api/audit', {
        params: { provider: selectedProvider }
      });
      setDbOps(data || []);
    } catch (e) {
      console.error('[ACTIVITY_PANEL] Failed to fetch audit logs:', e);
    }
  };

  useEffect(() => {
    loadPastOperations();
    // Auto refresh every 10 seconds
    const interval = setInterval(loadPastOperations, 10000);

    const handleScanComplete = (e: any) => {
      if (e.detail?.duration) {
        setScanDuration(parseFloat(e.detail.duration));
      }
    };
    window.addEventListener('cloudops-scan-complete', handleScanComplete);
    const saved = localStorage.getItem('cloudops-last-scan-duration');
    if (saved) setScanDuration(parseFloat(saved));

    return () => {
      clearInterval(interval);
      window.removeEventListener('cloudops-scan-complete', handleScanComplete);
    };
  }, []);

  // Sync when store operations change (e.g. immediate deployment triggers)
  useEffect(() => {
    loadPastOperations();
  }, [operations]);

  const activeSub = subscriptions.find(s => s.id === activeSubscriptionId);

  // Determine active cloud account to show in Discovery widget
  let activeCloudAccount: any = null;
  if (selectedProvider === 'aws') {
    activeCloudAccount = cloudAccounts.find(a => a.provider === 'aws');
  } else if (selectedProvider === 'azure' || selectedProvider === 'all') {
    activeCloudAccount = cloudAccounts.find(a => a.provider === 'azure');
  } else if (selectedProvider === 'gcp') {
    activeCloudAccount = cloudAccounts.find(a => a.provider === 'gcp');
  }

  // Fallback to activeSubscriptionId if cloudAccounts is empty but subscriptions exists
  if (!activeCloudAccount && activeSub) {
    activeCloudAccount = {
      id: activeSub.id,
      provider: 'azure',
      accountId: activeSub.subscriptionId || activeSub.id,
      accountName: activeSub.name,
      status: activeSub.status
    };
  } else if (activeCloudAccount) {
    activeCloudAccount = {
      id: activeCloudAccount.id,
      provider: activeCloudAccount.provider,
      accountId: activeCloudAccount.account_id || activeCloudAccount.subscription_id || activeCloudAccount.id,
      accountName: activeCloudAccount.account_name || activeCloudAccount.name,
      status: activeCloudAccount.status
    };
  }

  const getProviderLabel = () => {
    if (!activeCloudAccount) return 'Standby';
    return `${activeCloudAccount.provider.toUpperCase()} Ready`;
  };

  const getActionTitle = (action: string) => {
    if (!action) return 'System Action';
    return action
      .toLowerCase()
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getStatusColor = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('fail') || act.includes('critical') || act.includes('threat') || act.includes('deny') || act.includes('block')) {
      return '#DC2626'; // Error red
    }
    if (act.includes('success') || act.includes('login') || act.includes('complete') || act.includes('remediat') || act.includes('provision')) {
      return '#0D9488'; // Success teal
    }
    return '#2563EB'; // Primary blue
  };

  // Perform categorized filtering
  const filteredOps = dbOps.filter(log => {
    const actionStr = (log.action || '').toLowerCase();
    const typeStr = (log.resource_type || '').toLowerCase();
    const userStr = (log.user_email || '').toLowerCase();
    
    const matchesSearch = 
      actionStr.includes(filterQuery.toLowerCase()) ||
      typeStr.includes(filterQuery.toLowerCase()) ||
      userStr.includes(filterQuery.toLowerCase());
      
    if (!matchesSearch) return false;
    
    if (activeTab === 'All') return true;
    if (activeTab === 'Deployments') {
      return actionStr.includes('create') || actionStr.includes('deploy') || actionStr.includes('delete') || actionStr.includes('provision') || actionStr.includes('remediat');
    }
    if (activeTab === 'Security') {
      return actionStr.includes('security') || actionStr.includes('threat') || actionStr.includes('remediat') || typeStr.includes('security') || typeStr.includes('governance');
    }
    if (activeTab === 'Costs') {
      return actionStr.includes('cost') || actionStr.includes('budget') || typeStr.includes('cost');
    }
    if (activeTab === 'Backups') {
      return actionStr.includes('backup') || actionStr.includes('restore') || typeStr.includes('backup');
    }
    if (activeTab === 'Discovery') {
      return actionStr.includes('discover') || actionStr.includes('scan') || actionStr.includes('poll');
    }
    return true;
  });

  return (
    <div style={{
      width: activityPanelCollapsed ? 0 : 320,
      opacity: activityPanelCollapsed ? 0 : 1,
      pointerEvents: activityPanelCollapsed ? 'none' : 'auto',
      visibility: activityPanelCollapsed ? 'hidden' : 'visible',
      transition: 'width 0.3s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s ease, visibility 0.3s ease',
      background: 'var(--bg-surface, #FFFFFF)',
      borderLeft: activityPanelCollapsed ? 'none' : '1px solid var(--border-default, #E2E8F0)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflowY: 'auto',
      flexShrink: 0,
      fontFamily: "'Manrope', system-ui, -apple-system, sans-serif",
      color: 'var(--text-primary, #1E293B)'
    }}>
      {/* 1. Discovery Scan Status Panel */}
      {cloudAccounts.length > 0 && (
        <div style={{
          padding: 16,
          borderBottom: '1px solid var(--border-subtle, #E2E8F0)',
          background: 'var(--bg-surface-secondary, #F8FAFC)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={14} color="#2563EB" />
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#1E293B' }}>
                Discovery Scan Status
              </span>
            </div>
            {isRefreshing && (
              <span style={{
                fontSize: 9,
                background: '#EFF6FF',
                color: '#2563EB',
                border: '1px solid #DBEAFE',
                padding: '1px 6px',
                borderRadius: 4,
                fontWeight: 700
              }}>
                Scanning...
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11.5, background: '#FFFFFF', border: '1px solid #E2E8F0', padding: 10, borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Last Scan:</span>
              <span style={{ fontWeight: 600, color: '#1E293B' }}>
                {lastResourceSync ? new Date(lastResourceSync).toLocaleTimeString() : '17:23:12'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Duration:</span>
              <span style={{ fontWeight: 600, color: '#1E293B' }}>{isRefreshing ? 'Running...' : `${scanDuration}s`}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Resources:</span>
              <span style={{ fontWeight: 600, color: '#1E293B' }}>{activeCloudAccount ? resources.length : '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>{activeCloudAccount?.provider === 'aws' ? 'Account:' : 'Subscription:'}</span>
              <span style={{ fontWeight: 600, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1E293B' }} title={activeCloudAccount ? activeCloudAccount.accountName : 'Not Connected'}>
                {activeCloudAccount ? activeCloudAccount.accountName : 'Not Connected'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748B' }}>Status:</span>
              <span style={{
                fontWeight: 700,
                fontSize: 9.5,
                color: isRefreshing ? '#D97706' : (activeCloudAccount ? '#0D9488' : '#DC2626'),
                textTransform: 'uppercase'
              }}>
                {isRefreshing ? 'Running' : getProviderLabel()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Enterprise Activity Timeline */}
      <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <Clock size={14} color="#D97706" />
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#1E293B' }}>
            Enterprise Activity Log
          </span>
        </div>

        {/* Search input */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input 
            type="text" 
            placeholder="Search logs..." 
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px 6px 26px',
              fontSize: 11.5,
              borderRadius: 6,
              border: '1px solid #E2E8F0',
              background: '#FFFFFF',
              color: '#1E293B',
              outline: 'none'
            }}
          />
        </div>

        {/* Category Filters tabs */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          marginBottom: 12
        }}>
          {(['All', 'Deployments', 'Security', 'Costs', 'Backups', 'Discovery'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                fontSize: 10,
                padding: '3px 8px',
                borderRadius: 4,
                background: activeTab === tab ? '#2563EB' : '#F1F5F9',
                color: activeTab === tab ? '#FFFFFF' : '#64748B',
                fontWeight: 600,
                border: activeTab === tab ? '1px solid #2563EB' : '1px solid #E2E8F0',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* List of audit log timeline items */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          overflowY: 'auto',
          flex: 1,
          paddingRight: 2
        }}>
          {cloudAccounts.length === 0 ? (
            <div style={{ fontSize: 11.5, color: '#64748B', textAlign: 'center', marginTop: 20 }}>
              No Activity Yet<br/><br/>
              Connect a cloud account to begin monitoring.
            </div>
          ) : filteredOps.length > 0 ? (
            filteredOps.map((log) => {
              const color = getStatusColor(log.action);
              return (
                <div key={log.id} style={{
                  position: 'relative',
                  paddingLeft: 14,
                  borderLeft: `2px solid ${color}`
                }}>
                  <div style={{
                    position: 'absolute',
                    left: -5,
                    top: 4,
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: color
                  }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: '#1E293B' }}>{getActionTitle(log.action)}</span>
                    <span style={{ fontSize: 9, color: '#94A3B8' }}>
                      {log.created_at ? new Date(log.created_at).toLocaleTimeString() : ''}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>
                    {log.resource_type || 'System'} • User: {log.user_email}
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ fontSize: 11.5, color: '#64748B', textAlign: 'center', marginTop: 20 }}>
              No matching activity recorded.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
