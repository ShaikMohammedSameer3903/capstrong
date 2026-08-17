// ============================================================
// Multi-Cloud QuickSight-style Analytics Dashboard
// React-based interactive cloud cost intelligence dashboard
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  BarChart3, Calendar, Cloud, Layers, Activity, TrendingUp, AlertCircle,
  FileText, Download, RefreshCw, Filter, ShieldCheck, HelpCircle,
  DollarSign, ChevronDown, Trash2, ArrowUpRight, Search, ZoomIn
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, LineChart, Line, BarChart, Bar
} from 'recharts';
import { api } from '../../services/api';
import { fmtCurrency, fmtPercent } from '../../utils/formatters';

interface ResourceData {
  id: string;
  name: string;
  provider: string;
  type: string;
  location: string;
  environment: string; // Prod, Dev, Staging
  cost: number;
  cpu: number;
  memory: number;
}

const REGION_NAMES: Record<string, string> = {
  eastus: 'US East (Virginia)',
  westus2: 'US West (Oregon)',
  'us-east-1': 'AWS N. Virginia',
  'us-west-2': 'AWS Oregon',
  'us-central1': 'GCP Iowa',
  eastus2: 'US East 2 (Virginia)'
};

const PROVIDER_COLORS: Record<string, string> = {
  azure: '#0078d4',
  aws: '#FF9900',
  gcp: '#4285F4',
};

// Seed dataset for QuickSight Analytics
const SEED_ANALYTICS_RESOURCES: ResourceData[] = [
  { id: '1', name: 'vm-prod-app-01', provider: 'azure', type: 'Virtual Machines', location: 'eastus', environment: 'Production', cost: 340.00, cpu: 78, memory: 82 },
  { id: '2', name: 'vm-prod-app-02', provider: 'azure', type: 'Virtual Machines', location: 'eastus', environment: 'Production', cost: 340.00, cpu: 81, memory: 85 },
  { id: '3', name: 'ec2-payment-gateway', provider: 'aws', type: 'Virtual Machines', location: 'us-east-1', environment: 'Production', cost: 420.00, cpu: 89, memory: 90 },
  { id: '4', name: 'ec2-payment-worker', provider: 'aws', type: 'Virtual Machines', location: 'us-east-1', environment: 'Production', cost: 210.00, cpu: 45, memory: 55 },
  { id: '5', name: 'cosmos-payments-db', provider: 'azure', type: 'Databases', location: 'eastus2', environment: 'Production', cost: 980.00, cpu: 32, memory: 40 },
  { id: '6', name: 'sql-customer-ledger', provider: 'gcp', type: 'Databases', location: 'us-central1', environment: 'Production', cost: 460.00, cpu: 55, memory: 65 },
  { id: '7', name: 's3-payment-receipts', provider: 'aws', type: 'Storage', location: 'us-east-1', environment: 'Production', cost: 320.00, cpu: 10, memory: 12 },
  { id: '8', name: 's3-raw-logs-archive', provider: 'aws', type: 'Storage', location: 'us-west-2', environment: 'Staging', cost: 180.00, cpu: 5, memory: 5 },
  { id: '9', name: 'blob-backup-store', provider: 'azure', type: 'Storage', location: 'eastus', environment: 'Production', cost: 150.00, cpu: 8, memory: 8 },
  { id: '10', name: 'k8s-prod-cluster-01', provider: 'aws', type: 'Containers', location: 'us-east-1', environment: 'Production', cost: 1120.00, cpu: 72, memory: 78 },
  { id: '11', name: 'k8s-dev-nodes', provider: 'aws', type: 'Containers', location: 'us-west-2', environment: 'Development', cost: 450.00, cpu: 15, memory: 25 },
  { id: '12', name: 'vm-staging-web', provider: 'azure', type: 'Virtual Machines', location: 'eastus', environment: 'Staging', cost: 160.00, cpu: 8, memory: 14 },
  { id: '13', name: 'vm-dev-sandbox', provider: 'azure', type: 'Virtual Machines', location: 'eastus', environment: 'Development', cost: 80.00, cpu: 2, memory: 10 },
  { id: '14', name: 'rds-aurora-dev', provider: 'aws', type: 'Databases', location: 'us-east-1', environment: 'Development', cost: 190.00, cpu: 12, memory: 18 },
  { id: '15', name: 'gke-ingress-controller', provider: 'gcp', type: 'Containers', location: 'us-central1', environment: 'Production', cost: 280.00, cpu: 64, memory: 70 },
  { id: '16', name: 'alb-dev-internal', provider: 'aws', type: 'Network', location: 'us-east-1', environment: 'Development', cost: 45.00, cpu: 1, memory: 1 },
  { id: '17', name: 'vm-prod-reporting', provider: 'azure', type: 'Virtual Machines', location: 'eastus2', environment: 'Production', cost: 120.00, cpu: 98, memory: 94 },
  { id: '18', name: 'db-prod-metrics', provider: 'gcp', type: 'Databases', location: 'us-central1', environment: 'Production', cost: 350.00, cpu: 42, memory: 50 },
  { id: '19', name: 'cdn-static-media', provider: 'azure', type: 'Network', location: 'westus2', environment: 'Production', cost: 110.00, cpu: 20, memory: 15 }
];

export default function QuickSightAnalytics() {
  const [resources, setResources] = useState<ResourceData[]>(SEED_ANALYTICS_RESOURCES);
  
  // Filter States
  const [providerFilter, setProviderFilter] = useState<string>('All');
  const [regionFilter, setRegionFilter] = useState<string>('All');
  const [envFilter, setEnvFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Drilldown / Selected Element tracking
  const [selectedBar, setSelectedBar] = useState<string | null>(null);
  const [selectedHeatDay, setSelectedHeatDay] = useState<string | null>(null);

  // Statistics derived from active configurations
  const filteredResources = resources.filter(res => {
    const matchesProvider = providerFilter === 'All' || res.provider.toLowerCase() === providerFilter.toLowerCase();
    const matchesRegion = regionFilter === 'All' || res.location === regionFilter;
    const matchesEnv = envFilter === 'All' || res.environment === envFilter;
    const matchesType = typeFilter === 'All' || res.type === typeFilter;
    const matchesSearch = res.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          res.type.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Bar drilldown filter
    const matchesBarDrill = !selectedBar || res.type === selectedBar;
    // Heatmap day drilldown filter
    const matchesHeatDrill = !selectedHeatDay || (selectedHeatDay === 'Weekend' ? (res.environment === 'Staging' || res.environment === 'Development') : res.environment === 'Production');

    return matchesProvider && matchesRegion && matchesEnv && matchesType && matchesSearch && matchesBarDrill && matchesHeatDrill;
  });

  const totalSpend = filteredResources.reduce((sum, r) => sum + r.cost, 0);
  const totalCount = filteredResources.length;
  const avgCpu = filteredResources.length > 0 ? Math.round(filteredResources.reduce((sum, r) => sum + r.cpu, 0) / filteredResources.length) : 0;
  const avgMemory = filteredResources.length > 0 ? Math.round(filteredResources.reduce((sum, r) => sum + r.memory, 0) / filteredResources.length) : 0;

  // Potential savings calculations based on filtered recommendations
  const potentialSavings = filteredResources.reduce((sum, r) => {
    if (r.cpu < 10) return sum + (r.cost * 0.45); // Downsizing VM
    if (r.cpu > 90) return sum - (r.cost * 0.2); // Sizing expansion (cost increase)
    if (r.type === 'Storage' && r.cost > 100) return sum + (r.cost * 0.53); // Lifecycle tiering
    if (r.type === 'Network' && r.cpu < 5) return sum + r.cost; // Orphaned resource deletion
    return sum + (r.cost * 0.25); // Reserved Instances baseline
  }, 0);

  const optimizationScore = Math.max(45, Math.min(99, 100 - Math.round((potentialSavings / (totalSpend || 1)) * 40)));

  // Reset all filters
  const resetFilters = () => {
    setProviderFilter('All');
    setRegionFilter('All');
    setEnvFilter('All');
    setTypeFilter('All');
    setSearchQuery('');
    setSelectedBar(null);
    setSelectedHeatDay(null);
  };

  // Stacked bar chart data (Cost per service type by provider)
  const getServiceBreakdownData = () => {
    const types = ['Virtual Machines', 'Databases', 'Storage', 'Containers', 'Network'];
    return types.map(t => {
      const azureCost = resources.filter(r => r.type === t && r.provider === 'azure').reduce((s, r) => s + r.cost, 0);
      const awsCost = resources.filter(r => r.type === t && r.provider === 'aws').reduce((s, r) => s + r.cost, 0);
      const gcpCost = resources.filter(r => r.type === t && r.provider === 'gcp').reduce((s, r) => s + r.cost, 0);
      return {
        name: t,
        Azure: azureCost,
        AWS: awsCost,
        GCP: gcpCost
      };
    });
  };

  const serviceBreakdown = getServiceBreakdownData();

  // Cost trends and 3-Month Forecast data
  const getForecastData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
    // Let's model cost trajectory
    return months.map((month, idx) => {
      const isHistorical = idx <= 5; // Jan to Jun are historical
      const historicalCost = totalSpend * (0.85 + (idx * 0.03) + (Math.sin(idx) * 0.05));
      
      const forecastBaseline = totalSpend * (1.03 + (idx - 6) * 0.04);
      
      return {
        month,
        Historical: isHistorical ? parseFloat(historicalCost.toFixed(2)) : null,
        ForecastBaseline: !isHistorical ? parseFloat(forecastBaseline.toFixed(2)) : null,
        ForecastOptimistic: !isHistorical ? parseFloat((forecastBaseline - potentialSavings).toFixed(2)) : null,
        ForecastPessimistic: !isHistorical ? parseFloat((forecastBaseline * 1.15).toFixed(2)) : null,
      };
    });
  };

  const forecastData = getForecastData();

  // Custom 7x24 grid simulation for Heatmap (Hour-of-day cost peaks)
  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

  // Generate heatmap matrix details
  const getHeatValue = (day: string, hourIdx: number) => {
    const isWeekend = day === 'Saturday' || day === 'Sunday';
    const isPeakBusiness = hourIdx >= 9 && hourIdx <= 18 && !isWeekend;
    
    let baseLoad: number;
    if (isPeakBusiness) baseLoad = 120 + (Math.sin(hourIdx) * 20);
    else if (isWeekend) baseLoad = 25 + (Math.cos(hourIdx) * 10);
    else baseLoad = 35 + (Math.sin(hourIdx) * 12);
    
    // Scale slightly with current filtered resources count relative to total
    const filterScale = filteredResources.length / resources.length;
    return parseFloat((baseLoad * filterScale * (0.9 + Math.random() * 0.2)).toFixed(2));
  };

  // Spreadsheet Export
  const handleExportExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      
      // Sheet 1: Executive KPI Summary
      const summaryRows = [
        { Metric: 'Total Configured Monthly Spend', Value: fmtCurrency(totalSpend) },
        { Metric: 'Active Cloud Assets Monitored', Value: totalCount },
        { Metric: 'Overall Sizing Optimization Score', Value: `${optimizationScore}/100` },
        { Metric: 'Potential Monthly Cloud Savings', Value: fmtCurrency(potentialSavings) },
        { Metric: 'Average CPU Utilization', Value: `${avgCpu}%` },
        { Metric: 'Average Memory Allocation', Value: `${avgMemory}%` }
      ];
      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);

      // Sheet 2: Monitored Cloud Resources Inventory
      const detailRows = filteredResources.map(r => ({
        'Resource Name': r.name,
        'Cloud Provider': r.provider.toUpperCase(),
        'Asset Type': r.type,
        Region: REGION_NAMES[r.location] || r.location,
        Environment: r.environment,
        'Current Monthly Cost ($)': r.cost,
        'Average CPU (%)': r.cpu,
        'Average Memory (%)': r.memory
      }));
      const wsDetail = XLSX.utils.json_to_sheet(detailRows);

      // Assemble spreadsheet workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Executive Stats');
      XLSX.utils.book_append_sheet(wb, wsDetail, 'Inventory Detail');

      XLSX.writeFile(wb, `QuickSight_Cost_Analytics_${Date.now()}.xlsx`);
    } catch (err) {
      console.error('Excel library loading failed:', err);
    }
  };

  // PDF Layout Export
  const handleExportPdf = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('Amazon QuickSight-style Cloud Analytics', 15, 20);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated At: ${new Date().toLocaleString()} | Env: ${envFilter} | Provider: ${providerFilter}`, 15, 26);
      
      // Executive KPIs Block
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text('1. Executive Performance Indicators', 15, 38);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(`- Monthly Running Spend: ${fmtCurrency(totalSpend)}`, 20, 46);
      doc.text(`- Asset Inventory Count: ${totalCount} Active Resources`, 20, 52);
      doc.text(`- Optimization Rating Score: ${optimizationScore}/100`, 20, 58);
      doc.text(`- Estimated Re-sizing Savings: ${fmtCurrency(potentialSavings)} / month`, 20, 64);
      doc.text(`- Telemetry Averages: CPU: ${avgCpu}%, Memory: ${avgMemory}%`, 20, 70);

      // Table details
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('2. Discovered Assets Details Inventory', 15, 84);
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Resource Name', 16, 92);
      doc.text('Provider', 65, 92);
      doc.text('Asset Class', 90, 92);
      doc.text('Region', 125, 92);
      doc.text('Monthly Spend', 165, 92);
      
      doc.setFont('Helvetica', 'normal');
      let y = 98;
      filteredResources.slice(0, 20).forEach(r => {
        if (y < 280) {
          doc.text(r.name, 16, y);
          doc.text(r.provider.toUpperCase(), 65, y);
          doc.text(r.type, 90, y);
          doc.text(r.location, 125, y);
          doc.text(fmtCurrency(r.cost), 165, y);
          y += 8;
        }
      });

      doc.save(`QuickSight_Cloud_Analytics_Report_${Date.now()}.pdf`);
    } catch (err) {
      console.error('PDF Library loading failed:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="printable-compliance-view">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-content">
          <h1 className="page-title">QuickSight Analytics Dashboard</h1>
          <p className="page-subtitle">SaaS Cloud Cost Intelligence — Interactive widgets, forecast analysis, hourly cost heatmaps, and detailed drill-downs</p>
        </div>
        <div className="no-print" style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary btn-sm" onClick={handleExportPdf}>
            <FileText size={14} /> Export PDF
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleExportExcel}>
            <Download size={14} /> Export Excel
          </button>
        </div>
      </div>

      {/* QuickSight Control Filters Panel */}
      <div className="card no-print" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 8 }}>
        <div className="card-body" style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700 }}>
              <Filter size={14} /> Filters:
            </div>
            
            {/* Filter 1: Provider */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <select
                value={providerFilter}
                onChange={(e) => { setProviderFilter(e.target.value); setSelectedBar(null); }}
                style={{ padding: '6px 12px', fontSize: 12, borderRadius: 4, border: '1px solid var(--border-strong)', background: 'var(--bg-surface-secondary)', color: 'var(--text-primary)', outline: 'none' }}
              >
                <option value="All">Provider: All</option>
                <option value="AWS">AWS</option>
                <option value="Azure">Azure</option>
                <option value="GCP">GCP</option>
              </select>
            </div>

            {/* Filter 2: Region */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                style={{ padding: '6px 12px', fontSize: 12, borderRadius: 4, border: '1px solid var(--border-strong)', background: 'var(--bg-surface-secondary)', color: 'var(--text-primary)', outline: 'none' }}
              >
                <option value="All">Region: All</option>
                <option value="eastus">US East (Azure)</option>
                <option value="eastus2">US East 2 (Azure)</option>
                <option value="westus2">US West (Azure)</option>
                <option value="us-east-1">us-east-1 (AWS)</option>
                <option value="us-west-2">us-west-2 (AWS)</option>
                <option value="us-central1">us-central1 (GCP)</option>
              </select>
            </div>

            {/* Filter 3: Environment */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <select
                value={envFilter}
                onChange={(e) => { setEnvFilter(e.target.value); setSelectedHeatDay(null); }}
                style={{ padding: '6px 12px', fontSize: 12, borderRadius: 4, border: '1px solid var(--border-strong)', background: 'var(--bg-surface-secondary)', color: 'var(--text-primary)', outline: 'none' }}
              >
                <option value="All">Environment: All</option>
                <option value="Production">Production</option>
                <option value="Staging">Staging</option>
                <option value="Development">Development</option>
              </select>
            </div>

            {/* Filter 4: Asset Type */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                style={{ padding: '6px 12px', fontSize: 12, borderRadius: 4, border: '1px solid var(--border-strong)', background: 'var(--bg-surface-secondary)', color: 'var(--text-primary)', outline: 'none' }}
              >
                <option value="All">Class: All</option>
                <option value="Virtual Machines">Virtual Machines</option>
                <option value="Databases">Databases</option>
                <option value="Storage">Storage</option>
                <option value="Containers">Containers</option>
                <option value="Network">Network</option>
              </select>
            </div>

            {/* Text Search Box */}
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input
                type="text"
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ padding: '6px 10px 6px 30px', fontSize: 12, borderRadius: 4, border: '1px solid var(--border-strong)', background: 'var(--bg-surface-secondary)', color: 'var(--text-primary)', width: 180, outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {(providerFilter !== 'All' || regionFilter !== 'All' || envFilter !== 'All' || typeFilter !== 'All' || searchQuery !== '' || selectedBar || selectedHeatDay) && (
              <button
                onClick={resetFilters}
                style={{ background: 'transparent', border: 'none', color: 'var(--azure-600)', fontSize: 11, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
              >
                <Trash2 size={12} /> Clear Filters
              </button>
            )}
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              Showing {totalCount} of {resources.length} assets
            </span>
          </div>

        </div>
      </div>

      {/* Active Drilldown Badges */}
      {(selectedBar || selectedHeatDay) && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: -12 }} className="no-print">
          <span style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--text-secondary)' }}>Active Chart Drill-downs:</span>
          {selectedBar && (
            <span className="severity-badge p2" style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} onClick={() => setSelectedBar(null)}>
              Class: {selectedBar} <span style={{ fontWeight: 800 }}>×</span>
            </span>
          )}
          {selectedHeatDay && (
            <span className="severity-badge p4" style={{ background: 'rgba(0,120,212,0.15)', color: 'var(--azure-600)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} onClick={() => setSelectedHeatDay(null)}>
              Load Wave: {selectedHeatDay} <span style={{ fontWeight: 800 }}>×</span>
            </span>
          )}
        </div>
      )}

      {/* Executive KPI Grid */}
      <div className="kpi-grid">
        {/* KPI 1: Cost Spend */}
        <div className="kpi-card" style={{ cursor: 'default' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 800 }}>RUNNING MONTHLY SPEND</span>
            <DollarSign size={16} color="var(--azure-600)" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 900 }}>{fmtCurrency(totalSpend)}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 11 }}>
            <span style={{ color: 'var(--danger-500)', fontWeight: 700 }}>+4.2%</span>
            <span style={{ color: 'var(--text-tertiary)' }}>vs last month baseline</span>
          </div>
        </div>

        {/* KPI 2: Budget Variance */}
        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 800 }}>BUDGET VARIANCE</span>
            <TrendingUp size={16} color="var(--azure-600)" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: totalSpend > 3200 ? 'var(--warning-600)' : 'var(--success-600)' }}>
            {totalSpend > 3200 ? '+12.8%' : '-3.5%'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 11, color: 'var(--text-tertiary)' }}>
            <span>Monthly limit of $5,000</span>
          </div>
        </div>

        {/* KPI 3: Optimization Score */}
        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 800 }}>OPTIMIZATION SCORE</span>
            <ShieldCheck size={16} color="var(--success-500)" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--azure-600)' }}>{optimizationScore}/100</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 11, color: 'var(--text-tertiary)' }}>
            <span>Based on sizing heuristics</span>
          </div>
        </div>

        {/* KPI 4: Potential Savings */}
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--success-500)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 800 }}>POTENTIAL SAVINGS</span>
            <ArrowUpRight size={16} color="var(--success-500)" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--success-600)' }}>{fmtCurrency(potentialSavings)}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 11 }}>
            <span style={{ color: 'var(--success-600)', fontWeight: 700 }}>
              {((potentialSavings / (totalSpend || 1)) * 100).toFixed(1)}% Saved
            </span>
            <span style={{ color: 'var(--text-tertiary)' }}>via rightsizing</span>
          </div>
        </div>
      </div>

      {/* Main Charts & Utilization Section */}
      <div className="dashboard-grid">
        {/* Left Side: Forecasting Area Chart */}
        <div className="card col-span-2">
          <div className="card-header" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <div className="card-title">
              <TrendingUp size={16} color="var(--azure-600)" />
              Cost Trend Analysis & 90-Day Predictive Forecasts ($)
            </div>
          </div>
          <div className="card-body">
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Historical spend trends tracked from Jan to Jun, with optimistic/pessimistic models forecast through Sep.
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={forecastData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" name="Historical Spend" dataKey="Historical" stroke="var(--azure-600)" fill="var(--azure-50)" fillOpacity={0.1} strokeWidth={2.5} />
                <Area type="monotone" name="Forecast (Baseline)" dataKey="ForecastBaseline" stroke="var(--text-tertiary)" strokeDasharray="5 5" fill="none" strokeWidth={2} />
                <Area type="monotone" name="Forecast (Optimistic Savings)" dataKey="ForecastOptimistic" stroke="var(--success-500)" fill="none" strokeWidth={2} />
                <Area type="monotone" name="Forecast (Pessimistic Growth)" dataKey="ForecastPessimistic" stroke="var(--danger-500)" fill="none" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Side: Service Breakdown Chart (Drill-down active) */}
        <div className="card">
          <div className="card-header" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <div className="card-title">
              <BarChart3 size={16} color="var(--azure-600)" />
              Spend by Service Class & Provider
            </div>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              Click any bar to drill down and filter the detailed asset list below.
            </p>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart
                data={serviceBreakdown}
                onClick={(data: any) => {
                  if (data && typeof data.activeLabel === 'string') {
                    const label = data.activeLabel;
                    setSelectedBar(prev => prev === label ? null : label);
                  }
                }}
                margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
                style={{ cursor: 'pointer' }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--text-secondary)' }} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--text-secondary)' }} />
                <Tooltip formatter={(value) => [`$${value}`, 'Cost']} contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 11 }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="AWS" stackId="a" fill={PROVIDER_COLORS.aws} radius={[0, 0, 0, 0]} />
                <Bar dataKey="Azure" stackId="a" fill={PROVIDER_COLORS.azure} radius={[0, 0, 0, 0]} />
                <Bar dataKey="GCP" stackId="a" fill={PROVIDER_COLORS.gcp} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Hourly Cost Heatmap Grid */}
      <div className="card no-print">
        <div className="card-header" style={{ borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="card-title">
            <Calendar size={16} color="var(--azure-600)" />
            SaaS Cloud Resource Heatmap Grid (Hourly Cost peaks)
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            Click Day group to filter inventory:
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', border: '1px solid var(--border-subtle)', padding: '2px 8px', borderRadius: 4, background: selectedHeatDay === 'Production' ? 'var(--azure-50)' : 'transparent' }} onClick={() => setSelectedHeatDay(prev => prev === 'Production' ? null : 'Production')}>
              Weekdays
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', border: '1px solid var(--border-subtle)', padding: '2px 8px', borderRadius: 4, background: selectedHeatDay === 'Weekend' ? 'var(--azure-50)' : 'transparent' }} onClick={() => setSelectedHeatDay(prev => prev === 'Weekend' ? null : 'Weekend')}>
              Weekends
            </span>
          </span>
        </div>
        <div className="card-body">
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Visualizes resource load peaks. Hover over a grid block to inspect cost per hour.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, overflowX: 'auto', paddingBottom: 8 }}>
            {/* Heatmap Header (Hours) */}
            <div style={{ display: 'flex', gap: 4, marginLeft: 84 }}>
              {hours.map((h, idx) => (
                <div key={h} style={{ width: 34, fontSize: 9, textAlign: 'center', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                  {idx}h
                </div>
              ))}
            </div>

            {/* Heatmap Rows (Days) */}
            {weekdays.map(day => {
              const isWeekend = day === 'Saturday' || day === 'Sunday';
              return (
                <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {/* Day Label */}
                  <div style={{ width: 80, fontSize: 11, fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                    {day.substring(0, 3)}
                  </div>
                  
                  {/* Hours block */}
                  {hours.map((h, hourIdx) => {
                    const val = getHeatValue(day, hourIdx);
                    // Determine color coding
                    let background: string;
                    let color: string;
                    if (val > 100) {
                      background = 'rgba(0,120,212,0.85)';
                      color = '#fff';
                    } else if (val > 60) {
                      background = 'rgba(0,120,212,0.5)';
                      color = 'var(--text-primary)';
                    } else if (val > 25) {
                      background = 'rgba(0,120,212,0.2)';
                      color = 'var(--text-primary)';
                    } else {
                      background = 'rgba(0,120,212,0.06)';
                      color = 'var(--text-secondary)';
                    }

                    return (
                      <div
                        key={hourIdx}
                        className="heatmap-cell"
                        style={{
                          width: 34,
                          height: 28,
                          background,
                          color,
                          borderRadius: 3,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 9,
                          fontWeight: 'bold',
                          fontFamily: 'var(--font-mono)',
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                        title={`${day} @ ${h}\nCost Rate: $${val}/hr\nResource load: ${Math.round(val / 1.5)}%`}
                      >
                        ${Math.round(val)}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, marginTop: 12, fontSize: 10, color: 'var(--text-secondary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, background: 'rgba(0,120,212,0.06)', borderRadius: 2 }} /> Minimal load (&lt;$25/h)</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, background: 'rgba(0,120,212,0.2)', borderRadius: 2 }} /> Normal load ($25-$60/h)</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, background: 'rgba(0,120,212,0.5)', borderRadius: 2 }} /> Peak activity ($60-$100/h)</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, background: 'rgba(0,120,212,0.85)', borderRadius: 2 }} /> Critical spike (&gt;$100/h)</span>
          </div>

        </div>
      </div>

      {/* Drill-down Detail Data Table */}
      <div className="card">
        <div className="card-header" style={{ borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="card-title">
            <Layers size={16} color="var(--azure-600)" />
            Granular Resources Cost Inventory (Drill-down table)
          </div>
          {(selectedBar || selectedHeatDay) && (
            <span style={{ fontSize: 11, color: 'var(--azure-600)', fontStyle: 'italic' }}>
              Filtered dynamically by active chart drill-downs
            </span>
          )}
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-default)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Resource Name</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Cloud Provider</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Service Category</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Location Region</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Environment</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'center' }}>CPU Avg</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'center' }}>Memory Avg</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Monthly Cost</th>
              </tr>
            </thead>
            <tbody>
              {filteredResources.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                    No resource entries match selected filter paths. Click "Clear Filters" to restore.
                  </td>
                </tr>
              ) : (
                filteredResources.map((res, index) => {
                  const provColor = res.provider === 'azure' ? PROVIDER_COLORS.azure : res.provider === 'aws' ? PROVIDER_COLORS.aws : PROVIDER_COLORS.gcp;
                  return (
                    <tr key={res.id} style={{ borderBottom: '1px solid var(--border-subtle)', background: index % 2 === 0 ? 'transparent' : 'var(--bg-surface-secondary)' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 700 }}>{res.name}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ color: provColor, fontWeight: 800, fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                          {res.provider}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>{res.type}</td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                        {REGION_NAMES[res.location] || res.location}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span className={`severity-badge ${res.environment === 'Production' ? 'p1' : res.environment === 'Staging' ? 'p2' : 'p4'}`}>
                          {res.environment}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 'bold' }}>
                        <span style={{ color: res.cpu > 85 ? 'var(--danger-600)' : res.cpu < 10 ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                          {res.cpu}%
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 'bold' }}>
                        {res.memory}%
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 800 }}>
                        {fmtCurrency(res.cost)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
