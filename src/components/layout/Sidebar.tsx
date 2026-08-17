// ============================================================
// Premium Enterprise SaaS Sidebar — Light Theme Edition
// ============================================================

import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Server, Activity, Zap, FileBarChart, Settings,
  ChevronLeft, ChevronRight, LogOut, Cloud, ShieldAlert, ShieldCheck,
  BarChart3, HardDrive, DollarSign, Globe, Cpu, Database, Crosshair,
  BookOpen, Layers, GitBranch, ArrowRightLeft, Sparkles, Scale, RefreshCw,
  Gauge, Radio, Shield, HelpCircle, Bot
} from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import { useAppStore } from '../../store/appStore';

interface NavGroup {
  title: string;
  items: Array<{
    id: string;
    label: string;
    icon: any;
    path: string;
    badge?: number;
  }>;
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const {
    sidebarCollapsed, toggleSidebar,
    mobileSidebarOpen, setMobileSidebarOpen,
    incidents,
  } = useAppStore();
  const location = useLocation();

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const effectivelyCollapsed = isMobile ? false : sidebarCollapsed;
  const openIncidents = incidents.filter(i => i.status !== 'Closed' && i.status !== 'Resolved').length;
  const initials = user?.displayName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  const navGroups: NavGroup[] = [
    {
      title: 'Overview',
      items: [
        { id: 'overview', label: 'Executive Overview', icon: LayoutDashboard, path: '/' },
        { id: 'applications', label: 'Applications', icon: Layers, path: '/applications' },
        { id: 'deployments', label: 'Deployments', icon: GitBranch, path: '/deployments' }
      ]
    },
    {
      title: 'Infrastructure',
      items: [
        { id: 'providers', label: 'Providers', icon: Cloud, path: '/infrastructure-providers' },
        { id: 'resources', label: 'Resources', icon: Server, path: '/infrastructure-resources' }
      ]
    },
    {
      title: 'Observability',
      items: [
        { id: 'monitoring', label: 'Monitoring', icon: Activity, path: '/application-monitoring' },
        { id: 'performance', label: 'Performance', icon: Gauge, path: '/multicloud/benchmark' },
        { id: 'telemetry', label: 'Telemetry', icon: Radio, path: '/azure/monitoring' }
      ]
    },
    {
      title: 'Governance & Security',
      items: [
        { id: 'security', label: 'Security', icon: Shield, path: '/azure/security' },
        { id: 'compliance', label: 'Compliance', icon: ShieldCheck, path: '/compliance-center' },
        { id: 'soc', label: 'Security SOC', icon: ShieldAlert, path: '/security-soc', badge: openIncidents }
      ]
    },
    {
      title: 'FinOps & Analytics',
      items: [
        { id: 'finops', label: 'FinOps', icon: DollarSign, path: '/cost-management' },
        { id: 'optimization', label: 'Platform Optimization', icon: Zap, path: '/ai-optimization' },
        { id: 'portability', label: 'Portability Analysis', icon: ArrowRightLeft, path: '/portability-analysis' },
        { id: 'reports', label: 'Reports', icon: FileBarChart, path: '/reports' }
      ]
    },
    {
      title: 'Intelligence & Admin',
      items: [
        { id: 'ai-assistant', label: 'AI Assistant', icon: Bot, path: '/ai' },
        { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' }
      ]
    }
  ];

  return (
    <>
      {mobileSidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setMobileSidebarOpen(false)} />
      )}
      <aside className={`sidebar light-sidebar ${sidebarCollapsed ? ' collapsed' : ''}${mobileSidebarOpen ? ' mobile-open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <span className="b1" /><span className="b2" />
            <span className="b3" /><span className="b4" />
          </div>
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">CloudOps</span>
            <span className="sidebar-brand-sub">Enterprise Platform</span>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="sidebar-nav">
          {navGroups.map((group, idx) => (
            <div key={idx} className="sidebar-group">
              <div className="sidebar-section-title">{group.title}</div>
              {group.items.map(item => (
                <NavLink
                  key={item.id}
                  to={item.path}
                  className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
                  end={item.path === '/'}
                  title={effectivelyCollapsed ? item.label : undefined}
                  aria-label={`Navigate to ${item.label}`}
                  onClick={() => setMobileSidebarOpen(false)}
                >
                  <span className="sidebar-item-icon">
                    <item.icon size={18} strokeWidth={1.8} />
                  </span>
                  <span className="sidebar-item-label">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="sidebar-item-badge">{item.badge}</span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Collapse toggle */}
        {!isMobile && (
          <button
            className="sidebar-collapse-btn"
            onClick={toggleSidebar}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!sidebarCollapsed}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed
              ? <ChevronRight size={16} />
              : <><ChevronLeft size={16} /><span>Collapse</span></>
            }
          </button>
        )}

        {/* User Footer */}
        <div className="sidebar-footer">
          <div
            className="sidebar-user"
            onClick={logout}
            title="Sign out"
            role="button"
            aria-label="Sign out"
            tabIndex={0}
            onKeyDown={(e) => { if(e.key === 'Enter' || e.key === ' ') logout(); }}
          >
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.displayName || 'User'}</div>
              <div className="sidebar-user-role">{user?.role || 'Viewer'}</div>
            </div>
            <LogOut size={14} style={{ color: 'var(--text-secondary)', minWidth: 14 }} />
          </div>
        </div>
      </aside>
    </>
  );
}
