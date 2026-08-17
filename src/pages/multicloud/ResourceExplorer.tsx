// ============================================================
// Multi-Cloud Resource Explorer — Cross-Cloud Portal
// Unified search & filtering across Azure, AWS, and GCP
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { 
  Server, Search, Filter, RefreshCw, Cloud, Cpu, Database, 
  Globe, MapPin, Tag, Layers, ExternalLink, Activity
} from 'lucide-react';
import { api } from '../../services/api';
import { useCloudStore, type CloudProvider } from '../../store/cloudStore';
import { fmtNumber } from '../../utils/formatters';

const PROVIDER_COLORS: Record<string, string> = {
  azure: '#0078d4',
  aws: '#FF9900',
  gcp: '#4285F4',
};

export default function ResourceExplorer() {
  const { cloudAccounts } = useCloudStore();
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Filters
  const [selectedProvider, setSelectedProvider] = useState<CloudProvider>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const fetchResources = async () => {
    setRefreshing(true);
    try {
      const data = await api.get<any[]>('/api/resources');
      setResources(data || []);
    } catch (err) {
      console.error('[ResourceExplorer] Failed to fetch resources:', err);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  // Compute unique regions & types for filter dropdowns
  const availableRegions = useMemo(() => {
    const set = new Set<string>();
    resources.forEach(r => { if (r.location || r.region) set.add(r.location || r.region); });
    return Array.from(set).sort();
  }, [resources]);

  const availableTypes = useMemo(() => {
    const set = new Set<string>();
    resources.forEach(r => {
      const typeStr = (r.type || 'Unknown').split('/').pop()?.replace('Microsoft.', '') || 'Unknown';
      set.add(typeStr);
    });
    return Array.from(set).sort();
  }, [resources]);

  // Filtered resources
  const filteredResources = useMemo(() => {
    return resources.filter(r => {
      const providerStr = (r.provider || 'azure').toLowerCase();
      if (selectedProvider !== 'all' && providerStr !== selectedProvider) return false;

      const loc = r.location || r.region || '';
      if (selectedRegion !== 'all' && loc !== selectedRegion) return false;

      const typeStr = (r.type || 'Unknown').split('/').pop()?.replace('Microsoft.', '') || 'Unknown';
      if (selectedType !== 'all' && typeStr !== selectedType) return false;

      const statusStr = (r.status || 'Running').toLowerCase();
      if (selectedStatus !== 'all' && statusStr !== selectedStatus.toLowerCase()) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (r.name || '').toLowerCase().includes(q);
        const matchId = (r.id || '').toLowerCase().includes(q);
        const matchGroup = (r.resourceGroup || r.resource_group || '').toLowerCase().includes(q);
        const matchType = (r.type || '').toLowerCase().includes(q);
        if (!matchName && !matchId && !matchGroup && !matchType) return false;
      }

      return true;
    });
  }, [resources, selectedProvider, selectedRegion, selectedType, selectedStatus, searchQuery]);

  return (
    <div style={{ padding: 24, fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div className="page-header-content">
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(0,120,212,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🔍</span>
            Multi-Cloud Resource Explorer
          </h1>
          <p className="page-subtitle">
            Cross-cloud inventory search and filtering for Azure, AWS, and Google Cloud Platform resources.
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary btn-sm" onClick={fetchResources} disabled={refreshing}>
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh Inventory'}
          </button>
        </div>
      </div>

      {/* Provider Selector Tabs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {[
          { id: 'all', label: 'All Providers', icon: Globe, count: resources.length },
          { id: 'azure', label: 'Azure', icon: Cloud, count: resources.filter(r => (r.provider || 'azure').toLowerCase() === 'azure').length, color: PROVIDER_COLORS.azure },
          { id: 'aws', label: 'AWS', icon: Cpu, count: resources.filter(r => (r.provider || '').toLowerCase() === 'aws').length, color: PROVIDER_COLORS.aws },
          { id: 'gcp', label: 'GCP', icon: Database, count: resources.filter(r => (r.provider || '').toLowerCase() === 'gcp').length, color: PROVIDER_COLORS.gcp },
        ].map(p => (
          <button
            key={p.id}
            onClick={() => setSelectedProvider(p.id as CloudProvider)}
            style={{
              background: selectedProvider === p.id ? 'var(--accent-color, #0078d4)' : 'var(--bg-surface)',
              color: selectedProvider === p.id ? '#ffffff' : 'var(--text-primary)',
              border: '1px solid var(--border-default)',
              padding: '10px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
              transition: 'all 0.2s'
            }}
          >
            <p.icon size={16} color={selectedProvider === p.id ? '#ffffff' : p.color || 'var(--text-secondary)'} />
            <span>{p.label}</span>
            <span style={{
              background: selectedProvider === p.id ? 'rgba(255,255,255,0.2)' : 'var(--bg-surface-secondary)',
              padding: '2px 6px', borderRadius: 10, fontSize: 11
            }}>
              {fmtNumber(p.count)}
            </span>
          </button>
        ))}
      </div>

      {/* Filters Bar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center',
        background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
        borderRadius: 12, padding: 16, marginBottom: 24
      }}>
        {/* Search */}
        <div style={{ flex: '1 1 240px', position: 'relative' }}>
          <Search size={16} color="var(--text-tertiary)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search resource name, ID, or resource group..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px 8px 36px',
              borderRadius: 8, border: '1px solid var(--border-subtle)',
              background: 'var(--bg-surface-secondary)', color: 'var(--text-primary)',
              fontSize: 13
            }}
          />
        </div>

        {/* Region Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <MapPin size={14} color="var(--text-tertiary)" />
          <select
            value={selectedRegion}
            onChange={e => setSelectedRegion(e.target.value)}
            style={{
              padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)',
              background: 'var(--bg-surface-secondary)', color: 'var(--text-primary)', fontSize: 13
            }}
          >
            <option value="all">All Regions ({availableRegions.length})</option>
            {availableRegions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* Type Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Layers size={14} color="var(--text-tertiary)" />
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            style={{
              padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)',
              background: 'var(--bg-surface-secondary)', color: 'var(--text-primary)', fontSize: 13
            }}
          >
            <option value="all">All Resource Types ({availableTypes.length})</option>
            {availableTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Activity size={14} color="var(--text-tertiary)" />
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            style={{
              padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)',
              background: 'var(--bg-surface-secondary)', color: 'var(--text-primary)', fontSize: 13
            }}
          >
            <option value="all">All Statuses</option>
            <option value="running">Running / Active</option>
            <option value="stopped">Stopped</option>
            <option value="healthy">Healthy</option>
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      {cloudAccounts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-surface)', borderRadius: 16, border: '1px solid var(--border-default)' }}>
          <Cloud size={48} color="var(--text-tertiary)" style={{ marginBottom: 16 }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>No Cloud Accounts Connected</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 20, maxWidth: 480, margin: '0 auto 20px', lineHeight: 1.5 }}>
            Connect an Azure, AWS, or GCP account under Settings to inspect resources across your multicloud environment.
          </p>
          <button className="btn btn-primary" onClick={() => window.location.href = '/settings/cloud-accounts'}>
            Connect Cloud Account
          </button>
        </div>
      ) : filteredResources.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-surface)', borderRadius: 16, border: '1px solid var(--border-default)' }}>
          <Server size={48} color="var(--text-tertiary)" style={{ marginBottom: 16 }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>No Resources Found</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 20, maxWidth: 480, margin: '0 auto 20px', lineHeight: 1.5 }}>
            No discovered resources match your filter criteria or discovery is currently running in the background.
          </p>
          <button className="btn btn-secondary" onClick={fetchResources}>
            <RefreshCw size={14} style={{ marginRight: 6 }} /> Reset Filters & Refresh
          </button>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Showing {fmtNumber(filteredResources.length)} of {fmtNumber(resources.length)} Discovered Resources
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface-secondary)', borderBottom: '1px solid var(--border-default)' }}>
                  <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>Provider</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>Resource Name</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>Resource Type</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>Resource Group / VPC</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>Location / Region</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredResources.slice(0, 100).map((r, idx) => {
                  const prov = (r.provider || 'azure').toLowerCase();
                  const pColor = PROVIDER_COLORS[prov] || '#0078d4';
                  const typeShort = (r.type || 'Unknown').split('/').pop()?.replace('Microsoft.', '') || 'Unknown';
                  const loc = r.location || r.region || 'global';
                  const status = r.status || 'Running';

                  return (
                    <tr key={`${r.id || 'res'}-${idx}`} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 150ms' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4,
                          background: `${pColor}18`, color: pColor, textTransform: 'uppercase'
                        }}>
                          {prov}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {r.name}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                        {typeShort}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-tertiary)' }}>
                        {r.resourceGroup || r.resource_group || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-tertiary)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={12} /> {loc}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 12,
                          background: status.toLowerCase() === 'running' || status.toLowerCase() === 'healthy' || status.toLowerCase() === 'succeeded' ? 'rgba(16,124,16,0.12)' : 'rgba(209,52,56,0.12)',
                          color: status.toLowerCase() === 'running' || status.toLowerCase() === 'healthy' || status.toLowerCase() === 'succeeded' ? '#107C10' : '#D13438'
                        }}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
