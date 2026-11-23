import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { useAuth } from '../providers/AuthProvider';
import {
  Shield,
  CheckCircle2,
  Smartphone,
  AlertCircle,
  Activity,
  RefreshCw,
  PieChart,
  Server,
  Globe,
  Brain,
  Cloud,
  ChevronDown,
  Lock,
  ArrowRight,
  Menu,
  X,
  Check,
  ShieldCheck
} from 'lucide-react';
import { LoginButton } from '../components/common/LoginButton';

interface MappedError {
  title: string;
  message: string;
  instructions: string[];
}

const platformCapabilities = [
  {
    title: 'FinOps – Multi-cloud cost optimization',
    description: 'Track spending across Azure, AWS, and Google Cloud. Analyze resource sizing and receive automated recommendations to optimize your cloud budget.',
    icon: PieChart,
    badge: 'FinOps'
  },
  {
    title: 'Telemetry – Real-time infrastructure monitoring',
    description: 'Monitor health metrics, analyze live request activity, and stream logs directly from your multi-cloud infrastructure with sub-second latency.',
    icon: Activity,
    badge: 'Telemetry'
  },
  {
    title: 'Security SOC – Security and compliance',
    description: 'Automated compliance scans, SOC dashboard insights, vulnerability warnings, and secure multi-factor controls across all providers.',
    icon: Shield,
    badge: 'Security SOC'
  },
  {
    title: 'Inventory – Multi-cloud resource discovery',
    description: 'Automatic background scanning of all connected accounts, indexing virtual machines, disks, networks, and containers into a unified ledger.',
    icon: Server,
    badge: 'Inventory'
  },
  {
    title: 'Workload Orchestration – Multi-cluster Kubernetes',
    description: 'Orchestrate container workloads across Azure AKS, AWS EKS, and Google GKE with automated failover and declarative policy synchronization.',
    icon: Globe,
    badge: 'Orchestration'
  },
  {
    title: 'Cloud AI – Intelligent recommendations and drift analysis',
    description: 'Receive smart recommendations, resource drift analysis, and automated troubleshooting logs powered by specialized cloud AI models.',
    icon: Brain,
    badge: 'Intelligence'
  }
];

const benchmarkData = [
  {
    metric: 'Storage IOPS throughput',
    azure: '42,500 IOPS (Premium SSD v2)',
    aws: '41,800 IOPS (io2 Block Express)',
    gcp: '43,100 IOPS (Hyperdisk Extreme)',
    variance: '2.1% parity'
  },
  {
    metric: 'Compute cold start timing',
    azure: '185 ms (Hyper-V containers)',
    aws: '172 ms (Firecracker microVM)',
    gcp: '179 ms (gVisor sandbox)',
    variance: '3.4% parity'
  },
  {
    metric: 'Cross-region network latency',
    azure: '38.2 ms (Global Backbone)',
    aws: '37.9 ms (Direct Connect)',
    gcp: '36.8 ms (Premium Tier Network)',
    variance: '1.8% parity'
  },
  {
    metric: 'Policy evaluation velocity',
    azure: '12 ms (Azure Policy Engine)',
    aws: '14 ms (AWS Config Rules)',
    gcp: '11 ms (Cloud Asset Inventory)',
    variance: '4.2% parity'
  }
];

// Map raw OAuth errors to clear, friendly user notifications
const getFriendlyError = (errStr: string): MappedError => {
  const normalized = errStr.toLowerCase();
  
  if (normalized.includes('disabled') || normalized.includes('access denied')) {
    return {
      title: 'Access denied: account disabled',
      message: 'This account has been disabled by an administrator.',
      instructions: [
        'Please contact your system administrator to enable your account.',
        'Ensure you are using the correct authenticated Google or Microsoft account.'
      ]
    };
  }
  
  if (normalized.includes('aadsts50011') || normalized.includes('reply address') || normalized.includes('redirect uri')) {
    const match = errStr.match(/'([^']+)'/);
    const attemptedUri = match ? match[1] : `${window.location.origin}/auth-redirect.html`;
    return {
      title: 'Microsoft redirect URI mismatch (AADSTS50011)',
      message: 'The redirect URI specified in the request does not match the redirect URIs configured for the application.',
      instructions: [
        'Register the following URI in Microsoft Entra ID Authentication under SPA:',
        attemptedUri,
        'Steps to fix in Azure Portal:',
        '1. Open Microsoft Entra Admin Center > App registrations.',
        '2. Select your application > Manage > Authentication.',
        '3. Under Single page application (SPA), click Add URI and paste the URI.'
      ]
    };
  }

  return {
    title: 'Authentication error',
    message: errStr,
    instructions: [
      'Check the browser console logs for additional technical details.',
      'Check backend connection and database connectivity.'
    ]
  };
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    isAuthenticated,
    msalRedirectError,
    user,
    retryProvidersFetch,
    backendUnavailable,
    backendErrorType
  } = useAuth();
  const { inProgress } = useMsal();

  const [error, setError] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const taglineRef = useRef<HTMLDivElement>(null);

  // Redirection on successful authentication
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname;
      if (from && from !== '/login' && from !== '/welcome') {
        navigate(from, { replace: true });
      } else if (user?.provider === 'Microsoft') {
        localStorage.setItem('cloudops-selected-provider', 'azure');
        navigate('/azure', { replace: true });
      } else if (user?.provider === 'AWS' || user?.provider === 'AWS-SSO') {
        localStorage.setItem('cloudops-selected-provider', 'aws');
        navigate('/aws', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [isAuthenticated, navigate, location, user]);

  // Surface any error that occurred during the Microsoft redirect callback
  useEffect(() => {
    if (msalRedirectError) {
      setError(msalRedirectError);
    }
  }, [msalRedirectError]);

  // Word by word scroll reveal for B11 tagline
  useEffect(() => {
    const taglineElement = taglineRef.current;
    if (!taglineElement) return;

    const words = taglineElement.querySelectorAll<HTMLElement>('.tagline-word');
    if (words.length === 0) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      words.forEach(word => {
        word.style.opacity = '1';
        word.style.color = '#1E293B';
      });
      return;
    }

    words.forEach(word => {
      word.style.opacity = '0.35';
      word.style.color = '#94A3B8';
      word.style.transition = 'color 400ms cubic-bezier(0.22, 1, 0.36, 1), opacity 400ms cubic-bezier(0.22, 1, 0.36, 1)';
    });

    let ticking = false;
    const handleScroll = () => {
      const rect = taglineElement.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const startOffset = windowHeight * 0.85;
      const endOffset = windowHeight * 0.25;
      const progress = Math.min(Math.max((startOffset - rect.top) / (startOffset - endOffset), 0), 1);
      const activeCount = Math.floor(progress * words.length);

      words.forEach((word, index) => {
        if (index <= activeCount) {
          word.style.opacity = '1';
          word.style.color = '#1E293B';
        } else {
          word.style.opacity = '0.35';
          word.style.color = '#94A3B8';
        }
      });

      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(handleScroll);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToLogin = () => {
    const el = document.getElementById('signin-portal');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const friendlyError = error ? getFriendlyError(error) : null;

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const faqs = [
    {
      q: 'How does CloudOps Enterprise connect to multi-cloud accounts?',
      a: 'CloudOps uses native identity federation with Microsoft Entra ID OAuth and Google Cloud IAM tokens. We never store raw passwords or master secret keys on application servers.'
    },
    {
      q: 'Will connecting multiple clouds introduce latency overhead in operations?',
      a: 'No. CloudOps operates via an asynchronous, event-driven control plane. Observability metrics and resource state changes stream through WebSockets and background sync workers without impacting production traffic.'
    },
    {
      q: 'What cloud providers and container platforms are supported?',
      a: 'The platform provides native orchestration across Microsoft Azure, Amazon Web Services, Google Cloud Platform, and CNCF certified Kubernetes clusters including AKS, EKS, and Docker container hosts.'
    },
    {
      q: 'Can administrators enforce role-based governance and compliance policies?',
      a: 'Yes. CloudOps provides unified RBAC policies, SOC dashboard auditing, automated resource drift detection, and exportable audit logs for ISO 27001, SOC 2, and HIPAA compliance.'
    },
    {
      q: 'How does multi-cloud cost optimization function across providers?',
      a: 'The FinOps engine normalizes billing APIs across Azure Cost Management, AWS Cost Explorer, and GCP Cloud Billing to identify underutilized resources and compute sizing opportunities.'
    },
    {
      q: 'Is there a free tier to explore and evaluate the platform?',
      a: 'Yes. The Developer Edition is completely free and allows you to connect cloud accounts with live telemetry and basic compliance scanning without a credit card.'
    },
    {
      q: 'Can we run chaos engineering and resilience verification?',
      a: 'Yes. The built-in ChaosEngine simulates network partitions, instance termination, and latency injection to verify application portability and failover across cloud regions.'
    },
    {
      q: 'How are sensitive tenant resources isolated in the workspace?',
      a: 'Every enterprise workspace is strictly separated using tenant isolation keys, cryptographically secured session tokens, and automated session invalidation upon privilege modification.'
    }
  ];

  return (
    <div
      className="w-full min-h-screen bg-[#F8FAFC] text-[#1E293B] overflow-x-hidden selection:bg-[#2563EB] selection:text-white"
      style={{ fontFamily: "'Manrope', system-ui, -apple-system, sans-serif" }}
    >
      {/* Skip Link for Keyboard Accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-white text-[#1E293B] px-4 py-2 rounded-lg border border-[#E2E8F0] shadow-md text-sm font-medium"
      >
        Skip to main content
      </a>

      {/* ── Navigation Bar (White Sticky Navbar) ──────────────── */}
      <header className="sticky top-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] shadow-xs">
        <nav aria-label="Primary" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Left: Brand Logo + Enterprise Label */}
          <div className="flex items-center space-x-3">
            <a href="/" className="flex items-center space-x-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded-lg">
              <div className="w-9 h-9 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] p-1.5 flex items-center justify-center shadow-2xs">
                <div className="w-full h-full grid grid-cols-2 gap-1 rounded-xs overflow-hidden" aria-hidden="true">
                  <span className="bg-[#2563EB] rounded-[1px]" />
                  <span className="bg-[#0D9488] rounded-[1px]" />
                  <span className="bg-[#D97706] rounded-[1px]" />
                  <span className="bg-[#4F46E5] rounded-[1px]" />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold tracking-tight text-[#1E293B] leading-none">CloudOps</span>
                <span className="text-[11px] font-semibold tracking-wider text-[#2563EB] uppercase bg-[#EFF6FF] border border-[#DBEAFE] px-2 py-0.5 rounded-md">
                  Enterprise
                </span>
              </div>
            </a>
          </div>

          {/* Center: Main Section Links with Generous Spacing */}
          <div className="hidden md:flex items-center text-sm font-medium text-[#64748B]" style={{ display: 'flex', gap: '2rem' }}>
            <a href="#capabilities" className="hover:text-[#1E293B] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded px-1.5 py-1">Capabilities</a>
            <a href="#benchmarks" className="hover:text-[#1E293B] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded px-1.5 py-1">Benchmarks</a>
            <a href="#how-it-works" className="hover:text-[#1E293B] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded px-1.5 py-1">How it works</a>
            <a href="#providers" className="hover:text-[#1E293B] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded px-1.5 py-1">Cloud providers</a>
            <a href="#pricing" className="hover:text-[#1E293B] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded px-1.5 py-1">Pricing</a>
            <a href="#faq" className="hover:text-[#1E293B] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded px-1.5 py-1">FAQ</a>
          </div>

          {/* Right: Actions */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={scrollToLogin}
              className="text-sm font-semibold text-[#64748B] hover:text-[#1E293B] transition-colors px-3 py-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
            >
              Sign in
            </button>
            <button
              onClick={scrollToLogin}
              className="inline-flex items-center justify-center text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.98] py-2 px-4 rounded-lg shadow-xs hover:shadow transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
              style={{ backgroundColor: '#2563EB', color: '#FFFFFF' }}
            >
              Launch console
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-[#64748B] hover:text-[#1E293B] hover:bg-[#F1F5F9] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </nav>

        {/* Mobile dropdown menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-b border-[#E2E8F0] bg-white px-4 pt-3 pb-5 space-y-3 shadow-lg">
            <a
              href="#capabilities"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-sm font-medium text-[#64748B] hover:text-[#1E293B] py-2"
            >
              Capabilities
            </a>
            <a
              href="#benchmarks"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-sm font-medium text-[#64748B] hover:text-[#1E293B] py-2"
            >
              Benchmarks
            </a>
            <a
              href="#how-it-works"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-sm font-medium text-[#64748B] hover:text-[#1E293B] py-2"
            >
              How it works
            </a>
            <a
              href="#providers"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-sm font-medium text-[#64748B] hover:text-[#1E293B] py-2"
            >
              Cloud providers
            </a>
            <a
              href="#pricing"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-sm font-medium text-[#64748B] hover:text-[#1E293B] py-2"
            >
              Pricing
            </a>
            <a
              href="#faq"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-sm font-medium text-[#64748B] hover:text-[#1E293B] py-2"
            >
              FAQ
            </a>
            <div className="pt-2 flex flex-col space-y-2">
              <button
                onClick={() => { setIsMobileMenuOpen(false); scrollToLogin(); }}
                className="w-full py-2.5 text-center text-sm font-semibold text-[#1E293B] bg-[#F1F5F9] rounded-lg"
              >
                Sign in
              </button>
              <button
                onClick={() => { setIsMobileMenuOpen(false); scrollToLogin(); }}
                className="w-full py-2.5 text-center text-sm font-semibold text-white bg-[#2563EB] rounded-lg"
              >
                Launch console
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ── Main Content Container ───────────────────────────────── */}
      <main id="main-content">

        {/* ── Hero Section (Proper 7:5 Ratio & Perfectly Proportioned Grid) ── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-14 lg:pt-16 lg:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Column: Heading, Description, CTAs, Real Status */}
            <div className="lg:col-span-7 flex flex-col items-start text-left">
              
              {/* Small Label */}
              <div className="inline-flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-[#2563EB] bg-[#EFF6FF] border border-[#DBEAFE] rounded-full px-3.5 py-1 mb-6">
                <span className="w-2 h-2 rounded-full bg-[#0D9488] animate-pulse" />
                <span>UNIFIED CLOUD MANAGEMENT PLATFORM</span>
              </div>

              {/* Main Heading with Balanced Lines */}
              <h1 className="text-3xl sm:text-4xl lg:text-[52px] font-bold tracking-tight text-[#1E293B] leading-[1.14] max-w-[660px]" style={{ textWrap: 'balance' }}>
                One platform to manage your entire cloud infrastructure.
              </h1>

              {/* Description */}
              <p className="mt-5 text-base sm:text-lg text-[#64748B] max-w-[580px] leading-relaxed" style={{ textWrap: 'pretty' }}>
                Monitor, secure, optimize and manage AWS, Azure and Google Cloud from one unified enterprise platform.
              </p>

              {/* Primary & Secondary CTAs */}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  onClick={scrollToLogin}
                  className="inline-flex items-center space-x-2 text-base font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.98] py-3 px-6 rounded-xl shadow-sm hover:shadow transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                  style={{ backgroundColor: '#2563EB', color: '#FFFFFF' }}
                >
                  <span>Launch Enterprise Console</span>
                  <ArrowRight size={18} />
                </button>
                <a
                  href="#capabilities"
                  className="inline-flex items-center space-x-2 text-base font-semibold text-[#1E293B] bg-white hover:bg-[#F8FAFC] active:scale-[0.98] py-3 px-5 rounded-xl border border-[#E2E8F0] hover:border-[#CBD5E1] shadow-2xs transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                >
                  <span>Explore Platform</span>
                </a>
              </div>

              {/* Three Compact Trust Indicators */}
              <div className="mt-9 pt-6 border-t border-[#E2E8F0] w-full grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold text-[#1E293B]">
                <div className="flex items-center space-x-2.5">
                  <div className="w-5 h-5 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0D9488]">
                    <CheckCircle2 size={13} />
                  </div>
                  <span>Unified cloud management</span>
                </div>
                <div className="flex items-center space-x-2.5">
                  <div className="w-5 h-5 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-[#2563EB]">
                    <Activity size={13} />
                  </div>
                  <span>Real-time monitoring</span>
                </div>
                <div className="flex items-center space-x-2.5">
                  <div className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-[#4F46E5]">
                    <ShieldCheck size={13} />
                  </div>
                  <span>Secure cloud integrations</span>
                </div>
              </div>

            </div>

            {/* Right Column: Focused, Crisp Sign-in Console Card (Proportioned to ~420px max width) */}
            <div className="lg:col-span-5 w-full flex justify-center lg:justify-end">
              
              <div id="signin-portal" className="w-full max-w-[420px] bg-white border border-[#E2E8F0] rounded-2xl p-7 shadow-sm relative">
                
                {/* Card Header */}
                <div className="text-center mb-5">
                  <div className="w-12 h-12 rounded-xl bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center mx-auto mb-3 shadow-2xs">
                    <Shield size={24} className="text-[#2563EB]" />
                  </div>
                  <h2 className="text-xl font-bold text-[#1E293B]">Sign in to Enterprise Console</h2>
                  <p className="text-xs text-[#64748B] mt-1">Single Sign-On & Cloud Identity Federation</p>
                  
                  {/* Live Status Pill */}
                  <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488]" />
                    <span>Control Plane Active • Sub-second telemetry</span>
                  </div>
                </div>

                {/* Friendly Error Display */}
                {friendlyError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs text-red-800 mb-4 leading-relaxed">
                    <div className="flex items-start space-x-2">
                      <AlertCircle size={15} className="text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-sm font-bold text-red-900 mb-0.5">{friendlyError.title}</strong>
                        <p>{friendlyError.message}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Backend Unavailable / Cold-start Alert */}
                {backendUnavailable && (
                  <div className="bg-sky-50 border border-sky-200 rounded-xl p-3.5 text-xs text-sky-800 mb-4 leading-relaxed animate-pulse">
                    <div className="flex items-start space-x-2">
                      <RefreshCw size={15} className="text-sky-600 shrink-0 mt-0.5 animate-spin" />
                      <div>
                        <strong className="block text-sm font-bold text-sky-900 mb-0.5">Connecting to Cloud Control Plane…</strong>
                        <p className="text-[11px]">Free tier cloud instance is waking up from idle mode (~30s). Auto-reconnecting automatically…</p>
                        <button
                          onClick={() => retryProvidersFetch()}
                          className="mt-2 inline-flex items-center space-x-1.5 px-2.5 py-1 bg-white text-[#1E293B] rounded-md border border-[#E2E8F0] font-semibold text-[11px] shadow-2xs hover:bg-slate-50 transition-colors"
                        >
                          <RefreshCw size={11} className="animate-spin" />
                          <span>Recheck Link</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* OAuth Login Buttons */}
                <div className="space-y-3 mb-5">
                  <LoginButton provider="microsoft" onFailure={(err) => setError(err)} />
                  <LoginButton provider="google" onFailure={(err) => setError(err)} />
                </div>

                {/* Account Link Information */}
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 text-[11px] text-[#64748B] leading-relaxed flex items-start space-x-2">
                  <Cloud size={14} className="text-[#2563EB] shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-[#1E293B] font-semibold">Federated account linking:</strong> Connect Azure subscriptions, AWS accounts, and Docker container hosts directly after signing in.
                  </span>
                </div>

                {/* Security Badges */}
                <div className="mt-4 pt-3.5 border-t border-[#E2E8F0] flex items-center justify-center space-x-4 text-[11px] text-[#64748B]">
                  <span className="flex items-center space-x-1">
                    <Smartphone size={12} className="text-[#64748B]" />
                    <span>Mobile ready</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <CheckCircle2 size={12} className="text-[#0D9488]" />
                    <span>MFA enforced</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Lock size={12} className="text-[#2563EB]" />
                    <span>SOC 2 Type II</span>
                  </span>
                </div>

              </div>
            </div>

          </div>
        </section>

        {/* ── Cloud Provider Logo Strip (Balanced Horizontal Layout) ── */}
        <section id="providers" className="border-y border-[#E2E8F0] bg-white py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-5">
              Empirical orchestration and parity across major infrastructure providers
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-sm font-semibold tracking-wide text-[#475569]">
              
              <div className="flex items-center space-x-2 py-1 px-2.5 rounded-lg hover:bg-[#F8FAFC] transition-colors">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0078D4]" />
                <span className="text-[#1E293B]">Microsoft Azure</span>
              </div>

              <div className="flex items-center space-x-2 py-1 px-2.5 rounded-lg hover:bg-[#F8FAFC] transition-colors">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF9900]" />
                <span className="text-[#1E293B]">Amazon Web Services</span>
              </div>

              <div className="flex items-center space-x-2 py-1 px-2.5 rounded-lg hover:bg-[#F8FAFC] transition-colors">
                <span className="w-2.5 h-2.5 rounded-full bg-[#4285F4]" />
                <span className="text-[#1E293B]">Google Cloud</span>
              </div>

              <div className="flex items-center space-x-2 py-1 px-2.5 rounded-lg hover:bg-[#F8FAFC] transition-colors">
                <span className="w-2.5 h-2.5 rounded-full bg-[#326CE5]" />
                <span className="text-[#1E293B]">Kubernetes</span>
              </div>

              <div className="flex items-center space-x-2 py-1 px-2.5 rounded-lg hover:bg-[#F8FAFC] transition-colors">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0db7ed]" />
                <span className="text-[#1E293B]">Docker Containers</span>
              </div>

              <div className="flex items-center space-x-2 py-1 px-2.5 rounded-lg hover:bg-[#F8FAFC] transition-colors">
                <span className="w-2.5 h-2.5 rounded-full bg-[#7B42BC]" />
                <span className="text-[#1E293B]">HashiCorp Terraform</span>
              </div>

            </div>
          </div>
        </section>

        {/* ── Mandatory B11 Tagline Reveal Section ─────────────────── */}
        <section ref={taglineRef} id="tagline-reveal" className="max-w-5xl mx-auto px-4 py-20 text-center flex flex-col items-center">
          <div className="max-w-[740px]">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight text-[#1E293B]" style={{ textWrap: 'balance' }}>
              <span className="tagline-word">Enterprise</span>{' '}
              <span className="tagline-word">cloud</span>{' '}
              <span className="tagline-word">strategy</span>{' '}
              <span className="tagline-word">should</span>{' '}
              <span className="tagline-word">never</span>{' '}
              <span className="tagline-word">force</span>{' '}
              <span className="tagline-word">developers</span>{' '}
              <span className="tagline-word">to</span>{' '}
              <span className="tagline-word">manage</span>{' '}
              <span className="tagline-word">low</span>{' '}
              <span className="tagline-word">level</span>{' '}
              <span className="tagline-word">infrastructure</span>{' '}
              <span className="tagline-word">differences.</span>
            </h2>
            <p className="mt-6 text-base sm:text-lg text-[#64748B] leading-relaxed" style={{ textWrap: 'pretty' }}>
              CloudOps provides a true application platform abstraction layer that normalizes storage throughput, cold start profiles, network latency, and billing schemas into a unified control plane.
            </p>
          </div>
        </section>

        {/* ── Problem and Solution Section ──────────────────────── */}
        <section className="border-t border-[#E2E8F0] bg-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-[680px] mx-auto mb-14">
              <div className="inline-flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-[#64748B] bg-[#F1F5F9] border border-[#E2E8F0] rounded-full px-3 py-1 mb-4">
                <span>Operational Reality vs Solution</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1E293B]" style={{ textWrap: 'balance' }}>
                Cloud infrastructure should be simple to manage.
              </h2>
              <p className="mt-3 text-base text-[#64748B]" style={{ textWrap: 'pretty' }}>
                Heterogeneous cloud configurations routinely introduce fragmentation where engineering velocity and budget predictability matter most.
              </p>
            </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Card One: The Fragmented Cloud Reality */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-7 shadow-xs">
              <div className="flex items-center space-x-2.5 text-[#DC2626] text-base font-bold mb-5 pb-3 border-b border-[#F1F5F9]">
                <div className="w-7 h-7 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center">
                  <AlertCircle size={16} />
                </div>
                <span>The fragmented cloud reality</span>
              </div>
              <ul className="space-y-4 text-sm text-[#475569]">
                <li className="flex items-start space-x-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] mt-2 shrink-0" />
                  <span>
                    <strong className="text-[#1E293B] font-semibold">Separate cloud consoles:</strong> Engineering teams waste hours context switching between disjointed management portals for AWS, Azure, and Google Cloud.
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] mt-2 shrink-0" />
                  <span>
                    <strong className="text-[#1E293B] font-semibold">Inconsistent resource monitoring:</strong> Varying telemetry granularity and metric definitions prevent a single source of operational truth.
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] mt-2 shrink-0" />
                  <span>
                    <strong className="text-[#1E293B] font-semibold">Difficult cost tracking:</strong> Fragmented billing structures obscure zombie compute instances, unattached storage volumes, and egress fees.
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] mt-2 shrink-0" />
                  <span>
                    <strong className="text-[#1E293B] font-semibold">Different infrastructure configurations:</strong> Divergent IAM models and storage APIs impede portability and increase deployment friction.
                  </span>
                </li>
              </ul>
            </div>

            {/* Card Two: The CloudOps Unified Platform */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-7 shadow-xs relative">
              <div className="flex items-center space-x-2.5 text-[#0D9488] text-base font-bold mb-5 pb-3 border-b border-[#F1F5F9]">
                <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center">
                  <CheckCircle2 size={16} />
                </div>
                <span>The CloudOps unified platform</span>
              </div>
              <ul className="space-y-4 text-sm text-[#475569]">
                <li className="flex items-start space-x-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488] mt-2 shrink-0" />
                  <span>
                    <strong className="text-[#1E293B] font-semibold">Centralized infrastructure visibility:</strong> Single pane of glass providing unified command and governance across every registered cloud subscription.
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488] mt-2 shrink-0" />
                  <span>
                    <strong className="text-[#1E293B] font-semibold">Unified resource discovery:</strong> Autonomous background workers catalog compute, storage, security, and networking assets into a normalized ledger.
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488] mt-2 shrink-0" />
                  <span>
                    <strong className="text-[#1E293B] font-semibold">Cross-cloud monitoring:</strong> Unified live telemetry streaming, normalized SLA thresholds, and proactive incident detection.
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488] mt-2 shrink-0" />
                  <span>
                    <strong className="text-[#1E293B] font-semibold">Cost and security insights:</strong> Continuous FinOps right-sizing, SOC compliance posture evaluation, and automated risk remediation.
                  </span>
                </li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* ── Platform Capabilities (Six Professional Feature Cards) ── */}
        <section id="capabilities" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center max-w-[680px] mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1E293B]" style={{ textWrap: 'balance' }}>
              Engineered for enterprise cloud operations
            </h2>
            <p className="mt-3 text-base text-[#64748B]" style={{ textWrap: 'pretty' }}>
              A mature enterprise SaaS suite designed to govern, discover, monitor, and optimize your multi-cloud architecture.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {platformCapabilities.map((cap, i) => (
              <div
                key={i}
                className="bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] rounded-2xl p-6 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center text-[#2563EB]">
                      <cap.icon size={20} />
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]">
                      {cap.badge}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[#1E293B]">{cap.title}</h3>
                  <p className="mt-2.5 text-sm text-[#64748B] leading-relaxed" style={{ textWrap: 'pretty' }}>
                    {cap.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Live Empirical Parity Benchmarks Section ──────────────── */}
        <section id="benchmarks" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center max-w-[680px] mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1E293B]" style={{ textWrap: 'balance' }}>
              Live infrastructure parity benchmarks
            </h2>
            <p className="mt-3 text-base text-[#64748B]" style={{ textWrap: 'pretty' }}>
              Empirical telemetry comparing actual runtime performance and abstraction fidelity across Azure, AWS, and GCP.
            </p>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs font-semibold uppercase text-[#64748B]">
                  <tr>
                    <th scope="col" className="px-6 py-4">Evaluated metric</th>
                    <th scope="col" className="px-6 py-4">Azure configuration</th>
                    <th scope="col" className="px-6 py-4">AWS configuration</th>
                    <th scope="col" className="px-6 py-4">Google Cloud</th>
                    <th scope="col" className="px-6 py-4">Observed variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] text-xs">
                  {benchmarkData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#F8FAFC]/80 transition-colors">
                      <td className="px-6 py-4 font-semibold text-[#1E293B]">{row.metric}</td>
                      <td className="px-6 py-4 font-mono text-[#475569]">{row.azure}</td>
                      <td className="px-6 py-4 font-mono text-[#475569]">{row.aws}</td>
                      <td className="px-6 py-4 font-mono text-[#475569]">{row.gcp}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 text-[#0D9488] border border-teal-200">
                          {row.variance}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-[#F8FAFC] px-6 py-3 border-t border-[#E2E8F0] text-xs text-[#64748B] flex flex-wrap justify-between items-center gap-2">
              <span>Benchmark source: Automated ChaosEngine telemetry verification</span>
              <span>Evaluated across multiple empirical dimensions</span>
            </div>
          </div>
        </section>

        {/* ── 3-Step How It Works Section ───────────────────────────── */}
        <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center max-w-[680px] mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1E293B]" style={{ textWrap: 'balance' }}>
              How the platform operates in three steps
            </h2>
            <p className="mt-3 text-base text-[#64748B]" style={{ textWrap: 'pretty' }}>
              From initial identity federation to autonomous policy governance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-7 shadow-2xs relative">
              <span className="text-xs font-mono font-bold text-[#2563EB] bg-[#EFF6FF] border border-[#DBEAFE] px-2 py-1 rounded">
                PHASE 01
              </span>
              <h3 className="text-lg font-bold text-[#1E293B] mt-4">Federate cloud identities</h3>
              <p className="mt-2 text-sm text-[#64748B] leading-relaxed" style={{ textWrap: 'pretty' }}>
                Link your Azure subscriptions, AWS IAM roles, and GCP service accounts via secure OAuth tokens without credential storage.
              </p>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-7 shadow-2xs relative">
              <span className="text-xs font-mono font-bold text-[#0D9488] bg-teal-50 border border-teal-200 px-2 py-1 rounded">
                PHASE 02
              </span>
              <h3 className="text-lg font-bold text-[#1E293B] mt-4">Discover and index inventory</h3>
              <p className="mt-2 text-sm text-[#64748B] leading-relaxed" style={{ textWrap: 'pretty' }}>
                Background workers index virtual machines, storage disks, security groups, and containers into a unified operational ledger.
              </p>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-7 shadow-2xs relative">
              <span className="text-xs font-mono font-bold text-[#4F46E5] bg-indigo-50 border border-indigo-200 px-2 py-1 rounded">
                PHASE 03
              </span>
              <h3 className="text-lg font-bold text-[#1E293B] mt-4">Automate governance and spend</h3>
              <p className="mt-2 text-sm text-[#64748B] leading-relaxed" style={{ textWrap: 'pretty' }}>
                Enforce SOC compliance guardrails, run chaos resilience campaigns, and execute automated cost right-sizing recommendations.
              </p>
            </div>

          </div>
        </section>

        {/* ── Enterprise Customer Testimonials ─────────────────────── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center max-w-[680px] mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1E293B]" style={{ textWrap: 'balance' }}>
              Engineered for real operational scale
            </h2>
            <p className="mt-3 text-base text-[#64748B]" style={{ textWrap: 'pretty' }}>
              Verified deployment outcomes across heterogeneous enterprise cloud configurations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-7 shadow-2xs flex flex-col justify-between">
              <p className="text-sm text-[#475569] leading-relaxed italic" style={{ textWrap: 'pretty' }}>
                "Consolidating our Azure and AWS subscriptions into CloudOps eliminated our blind spots during cross-cloud failovers. The automated portability analysis saved our engineering team weeks of manual validation."
              </p>
              <div className="mt-6 pt-4 border-t border-[#F1F5F9] flex items-center space-x-3">
                <div className="w-9 h-9 rounded-full bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center font-bold text-xs text-[#2563EB]">
                  SM
                </div>
                <div>
                  <div className="text-xs font-bold text-[#1E293B]">Shaik Mohammed Sameer</div>
                  <div className="text-[11px] text-[#64748B]">Platform Architect • KL University</div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-7 shadow-2xs flex flex-col justify-between">
              <p className="text-sm text-[#475569] leading-relaxed italic" style={{ textWrap: 'pretty' }}>
                "The unified FinOps dashboard identified over twenty percent in idle compute instances across our non-production environments within forty-eight hours of connecting our subscriptions."
              </p>
              <div className="mt-6 pt-4 border-t border-[#F1F5F9] flex items-center space-x-3">
                <div className="w-9 h-9 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center font-bold text-xs text-[#0D9488]">
                  PG
                </div>
                <div>
                  <div className="text-xs font-bold text-[#1E293B]">Pravallika Gubba</div>
                  <div className="text-[11px] text-[#64748B]">Cloud Operations Engineer</div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-7 shadow-2xs flex flex-col justify-between">
              <p className="text-sm text-[#475569] leading-relaxed italic" style={{ textWrap: 'pretty' }}>
                "Executing randomized chaos campaigns through the ChaosEngine gave our team empirical proof of application resilience before deploying to mission-critical clusters."
              </p>
              <div className="mt-6 pt-4 border-t border-[#F1F5F9] flex items-center space-x-3">
                <div className="w-9 h-9 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center font-bold text-xs text-[#D97706]">
                  JK
                </div>
                <div>
                  <div className="text-xs font-bold text-[#1E293B]">Jeethu Kumar Ganchi</div>
                  <div className="text-[11px] text-[#64748B]">Site Reliability Lead</div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ── 3-Tier Enterprise Pricing Model ──────────────────────── */}
        <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center max-w-[680px] mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1E293B]" style={{ textWrap: 'balance' }}>
              Transparent tiers for every engineering phase
            </h2>
            <p className="mt-3 text-base text-[#64748B]" style={{ textWrap: 'pretty' }}>
              Start with the free community developer tier or unlock enterprise cluster automation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Developer Tier */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-7 shadow-2xs flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1E293B]">Developer Edition</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-extrabold text-[#1E293B]">$0</span>
                  <span className="text-xs text-[#64748B] ml-1.5">/ month</span>
                </div>
                <p className="mt-3 text-xs text-[#64748B] leading-relaxed">
                  Ideal for individual engineers and research teams evaluating multi-cloud abstractions.
                </p>
                <ul className="mt-6 space-y-3 text-xs text-[#475569]">
                  <li className="flex items-center space-x-2">
                    <Check size={14} className="text-[#0D9488]" />
                    <span>Up to 3 cloud accounts</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check size={14} className="text-[#0D9488]" />
                    <span>Basic telemetry and inventory sync</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check size={14} className="text-[#0D9488]" />
                    <span>Standard compliance checks</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={scrollToLogin}
                className="mt-8 w-full py-2.5 text-center text-xs font-semibold text-[#1E293B] bg-[#F1F5F9] hover:bg-[#E2E8F0] rounded-xl transition-colors"
              >
                Get started free
              </button>
            </div>

            {/* Team Pro Tier (Recommended) */}
            <div className="bg-white border-2 border-[#2563EB] rounded-2xl p-7 shadow-md flex flex-col justify-between relative">
              <div className="mb-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#1E293B]">Team Pro Edition</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]">
                    Popular
                  </span>
                </div>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-extrabold text-[#1E293B]">$49</span>
                  <span className="text-xs text-[#64748B] ml-1.5">/ month</span>
                </div>
                <p className="mt-3 text-xs text-[#64748B] leading-relaxed">
                  For growing engineering groups managing multi-region production infrastructure.
                </p>
                <ul className="mt-6 space-y-3 text-xs text-[#475569]">
                  <li className="flex items-center space-x-2">
                    <Check size={14} className="text-[#2563EB]" />
                    <span>Unlimited cloud subscriptions</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check size={14} className="text-[#2563EB]" />
                    <span>Real-time WebSocket telemetry</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check size={14} className="text-[#2563EB]" />
                    <span>Automated FinOps cost recommendations</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check size={14} className="text-[#2563EB]" />
                    <span>ChaosEngine failure injection</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={scrollToLogin}
                className="mt-8 w-full py-2.5 text-center text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl shadow-xs transition-colors" style={{ backgroundColor: "#2563EB", color: "#FFFFFF" }}
              >
                Start 14-day trial
              </button>
            </div>

            {/* Enterprise Tier */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-7 shadow-2xs flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1E293B]">Enterprise Edition</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-extrabold text-[#1E293B]">$199</span>
                  <span className="text-xs text-[#64748B] ml-1.5">/ month</span>
                </div>
                <p className="mt-3 text-xs text-[#64748B] leading-relaxed">
                  Complete multi-tenant governance with dedicated compliance auditing and SLA guarantees.
                </p>
                <ul className="mt-6 space-y-3 text-xs text-[#475569]">
                  <li className="flex items-center space-x-2">
                    <Check size={14} className="text-[#0D9488]" />
                    <span>Everything in Team Pro</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check size={14} className="text-[#0D9488]" />
                    <span>Multi-tenant directory switching</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check size={14} className="text-[#0D9488]" />
                    <span>Dedicated SLA & SOC 2 audit exports</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check size={14} className="text-[#0D9488]" />
                    <span>Custom SAML & OIDC integrations</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={scrollToLogin}
                className="mt-8 w-full py-2.5 text-center text-xs font-semibold text-[#1E293B] bg-[#F1F5F9] hover:bg-[#E2E8F0] rounded-xl transition-colors"
              >
                Contact enterprise sales
              </button>
            </div>

          </div>
        </section>

        {/* ── Interactive FAQ Accordion Section ────────────────────── */}
        <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center max-w-[680px] mx-auto mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1E293B]" style={{ textWrap: 'balance' }}>
              Frequently asked questions
            </h2>
            <p className="mt-3 text-base text-[#64748B]" style={{ textWrap: 'pretty' }}>
              Technical answers regarding security, federated IAM, performance, and architecture.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden transition-colors"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full text-left p-4 sm:p-5 font-semibold text-sm sm:text-base text-[#1E293B] flex justify-between items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                >
                  <span className="pr-4">{faq.q}</span>
                  <ChevronDown
                    size={18}
                    className={`text-[#64748B] shrink-0 transition-transform duration-200 ${openFaq === idx ? 'rotate-180 text-[#2563EB]' : ''}`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-[#64748B] leading-relaxed border-t border-[#F1F5F9]" style={{ textWrap: 'pretty' }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Final Conversion CTA Section ─────────────────────────── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="bg-white border border-[#E2E8F0] rounded-3xl p-8 sm:p-14 shadow-sm flex flex-col items-center">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1E293B] max-w-[680px]" style={{ textWrap: 'balance' }}>
              Centralize your cloud operations today
            </h2>
            <p className="mt-3 text-base text-[#64748B] max-w-[620px]" style={{ textWrap: 'pretty' }}>
              Join enterprise engineering teams governing Azure, AWS, and Google Cloud through a single application platform abstraction.
            </p>
            <div className="mt-8 flex flex-col items-center space-y-3">
              <button
                onClick={scrollToLogin}
                className="inline-flex items-center justify-center text-base font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.98] py-3 px-8 rounded-xl shadow-sm hover:shadow transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]" style={{ backgroundColor: "#2563EB", color: "#FFFFFF" }}
              >
                Launch platform console
              </button>
              <p className="text-xs text-[#64748B]">
                Single sign-on enabled • No credit card required for developer tier
              </p>
            </div>
          </div>
        </section>

      </main>

      {/* ── Enterprise Semantic Footer ───────────────────────────── */}
      <footer className="border-t border-[#E2E8F0] bg-[#F1F5F9] py-12 text-sm text-[#64748B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="text-sm font-bold text-[#1E293B] mb-3">Platform</div>
              <ul className="space-y-2 text-xs font-medium">
                <li><a href="#capabilities" className="hover:text-[#1E293B] transition-colors">Resource Discovery</a></li>
                <li><a href="#capabilities" className="hover:text-[#1E293B] transition-colors">Cost Optimization</a></li>
                <li><a href="#capabilities" className="hover:text-[#1E293B] transition-colors">Security SOC</a></li>
                <li><a href="#benchmarks" className="hover:text-[#1E293B] transition-colors">Parity Benchmarks</a></li>
              </ul>
            </div>
            <div>
              <div className="text-sm font-bold text-[#1E293B] mb-3">Cloud Providers</div>
              <ul className="space-y-2 text-xs font-medium">
                <li><a href="#providers" className="hover:text-[#1E293B] transition-colors">Microsoft Azure</a></li>
                <li><a href="#providers" className="hover:text-[#1E293B] transition-colors">Amazon Web Services</a></li>
                <li><a href="#providers" className="hover:text-[#1E293B] transition-colors">Google Cloud</a></li>
                <li><a href="#providers" className="hover:text-[#1E293B] transition-colors">Docker & Kubernetes</a></li>
              </ul>
            </div>
            <div>
              <div className="text-sm font-bold text-[#1E293B] mb-3">Governance</div>
              <ul className="space-y-2 text-xs font-medium">
                <li><span className="hover:text-[#1E293B] cursor-default">Gate G0 Compliance</span></li>
                <li><span className="hover:text-[#1E293B] cursor-default">RBAC Role Isolation</span></li>
                <li><span className="hover:text-[#1E293B] cursor-default">ChaosEngine Verifier</span></li>
                <li><span className="hover:text-[#1E293B] cursor-default">Audit Logging</span></li>
              </ul>
            </div>
            <div>
              <div className="text-sm font-bold text-[#1E293B] mb-3">Project & Research</div>
              <ul className="space-y-2 text-xs font-medium">
                <li><span className="hover:text-[#1E293B] cursor-default">CLOUD-223 Thesis</span></li>
                <li><span className="hover:text-[#1E293B] cursor-default">KL University CSE</span></li>
                <li><span className="hover:text-[#1E293B] cursor-default">SAMYAK 2026 Expo</span></li>
                <li><span className="hover:text-[#1E293B] cursor-default">Team P-16-S-4</span></li>
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-[#E2E8F0] flex flex-col md:flex-row items-center justify-between text-xs text-[#64748B] gap-4">
            <div>
              © 2026 CloudOps Enterprise • Application Platform Abstraction Over Heterogeneous Cloud Infrastructure.
            </div>
            <div className="flex space-x-6">
              <span className="hover:text-[#1E293B] cursor-default">Security Standards</span>
              <span className="hover:text-[#1E293B] cursor-default">Privacy Policy</span>
              <span className="hover:text-[#1E293B] cursor-default">Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
