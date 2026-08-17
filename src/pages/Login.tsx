import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { useAuth } from '../providers/AuthProvider';
import { Shield, CheckCircle, Smartphone, AlertCircle, Activity, RefreshCw, PieChart, Server, Globe, Brain, Loader2, Cloud } from 'lucide-react';
import { LoginButton } from '../components/common/LoginButton';

interface MappedError {
  title: string;
  message: string;
  instructions: string[];
}

const landingFeatures = [
  {
    title: 'Multi-Cloud Cost Optimization',
    description: 'Track spending across Azure, AWS, and Google Cloud. Analyze resource sizing and receive automated recommendations to optimize your cloud budget.',
    icon: PieChart,
    gradient: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)'
  },
  {
    title: 'Real-Time Cloud Monitoring',
    description: 'Monitor health metrics, analyze live request activity, and stream logs directly from your multi-cloud infrastructure.',
    icon: Activity,
    gradient: 'linear-gradient(135deg, #10B981 0%, #047857 100%)'
  },
  {
    title: 'Security & Compliance',
    description: 'Automated compliance scans, SOC dashboard insights, vulnerability warnings, and secure multi-factor controls across all providers.',
    icon: Shield,
    gradient: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)'
  },
  {
    title: 'Multi-Cloud Resource Discovery',
    description: 'Automatic background scanning of all connected accounts, indexing resources dynamically into your secure unified ledger.',
    icon: Server,
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)'
  },
  {
    title: 'Multi-Tenant Operations',
    description: 'Manage multiple directories and enterprise environments from a unified command center with strict role isolation.',
    icon: Globe,
    gradient: 'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)'
  },
  {
    title: 'AI-Powered Cloud Insights',
    description: 'Receive smart recommendations, resource drift analysis, and automated troubleshooting logs powered by cloud AI services.',
    icon: Brain,
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
  }
];

// Map raw OAuth errors to clear, friendly user notifications
const getFriendlyError = (errStr: string): MappedError => {
  const normalized = errStr.toLowerCase();
  
  if (normalized.includes('disabled') || normalized.includes('access denied')) {
    return {
      title: 'Access Denied: Account Disabled',
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
      title: 'Microsoft Redirect URI Mismatch (AADSTS50011)',
      message: `The redirect URI specified in the request does not match the redirect URIs configured for the application.`,
      instructions: [
        `Register the following URI in Microsoft Entra ID Authentication under SPA:`,
        `${attemptedUri}`,
        `Steps to fix in Azure Portal:`,
        `1. Open Microsoft Entra Admin Center > App registrations.`,
        `2. Select your application > Manage > Authentication.`,
        `3. Under Single-page application (SPA), click "Add URI" and paste the URI.`,
        `4. Save and retry the login.`
      ]
    };
  }
  
  if (normalized.includes('invalid_client') || normalized.includes('client not found') || normalized.includes('401')) {
    return {
      title: 'Google OAuth Client Missing',
      message: 'The Google OAuth Client ID configured is invalid or was not found.',
      instructions: [
        'Verify your VITE_GOOGLE_CLIENT_ID matches the Client ID in the Google Cloud Console.',
        `Ensure Authorized JavaScript Origins contains: ${window.location.origin}`,
        `Ensure Authorized Redirect URIs contains: ${window.location.origin}`,
        'Restart the frontend server if you edited the .env file.'
      ]
    };
  }
  
  if (normalized.includes('timed_out') || normalized.includes('timeout') || normalized.includes('popup_closed') || normalized.includes('user_cancelled')) {
    return {
      title: 'Popup Timed Out / Closed',
      message: 'The login popup was closed or timed out before authentication was completed.',
      instructions: [
        'Allow popups for this origin in your browser settings.',
        'Click the sign-in button again and keep the popup open.',
        'Complete the authentication flow in the popup window.'
      ]
    };
  }
  
  if (normalized.includes('configuration') || normalized.includes('missing') || normalized.includes('not configured')) {
    return {
      title: 'Configuration Required',
      message: 'Some OAuth configuration parameters are missing or invalid.',
      instructions: [
        'Open the .env file in your project root.',
        'Ensure VITE_AZURE_CLIENT_ID and VITE_AZURE_TENANT_ID are defined.',
        'Ensure VITE_GOOGLE_CLIENT_ID is defined.',
        'Restart the frontend and backend servers.'
      ]
    };
  }

  return {
    title: 'Authentication Error',
    message: errStr,
    instructions: [
      'Check the browser console logs for additional technical details.',
      'Check backend connection and database connectivity.'
    ]
  };
};

// Provider status indicator component
function ProviderStatusIndicator({ 
  name, 
  configured, 
  loading, 
  error 
}: { 
  name: string; 
  configured: boolean; 
  loading: boolean; 
  error: string | null;
}) {
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)', padding: '6px 0' }}>
        <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
        <span>Initializing {name} Authentication...</span>
      </div>
    );
  }
  
  if (configured) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#10B981', padding: '6px 0' }}>
        <CheckCircle size={14} />
        <span>{name} — Ready</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#F59E0B', padding: '6px 0' }}>
        <AlertCircle size={14} />
        <span>{name} — Not configured</span>
      </div>
    );
  }
  
  return null;
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, isAuthenticated, isLoading, msalRedirectError, user, providersConfig, providersLoading, retryProvidersFetch, backendUnavailable, backendErrorType } = useAuth();
  const { inProgress } = useMsal();

  const isMicrosoftConfigured = providersConfig?.microsoft?.configured ?? false;
  const isGoogleConfigured = providersConfig?.google?.configured ?? false;
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState('');

  // Redirection on successful authentication
  useEffect(() => {
    if (isAuthenticated) {
      // Route to provider-specific dashboard
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

  // Surface any error that occurred during the Microsoft redirect callback.
  useEffect(() => {
    if (msalRedirectError) {
      setError(msalRedirectError);
    }
  }, [msalRedirectError]);


  const handleMicrosoftLogin = async () => {
    if (!isMicrosoftConfigured) {
      setError('Configuration Required: Microsoft Entra ID is not configured. Please check your environment variables.');
      return;
    }
    if (isSigningIn || inProgress !== 'none') {
      return; // Prevent double clicks and nested popups
    }
    setIsSigningIn(true);
    setError('');
    try {
      await login();
    } catch (err: any) {
      setError(err.message || 'Entra ID login failed.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!isGoogleConfigured) {
      setError('Configuration Required: Google OAuth is not configured. Please check your environment variables.');
      return;
    }
    setIsSigningIn(true);
    setError('');
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Google Sign-in failed.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const friendlyError = error ? getFriendlyError(error) : null;

  return (
    <div className="login-page-container" style={{ width: '100%', minHeight: '100vh', background: 'var(--bg-app)', color: 'var(--text-primary)', overflowY: 'auto', fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}>
      {/* Primary landing & Login Area */}
      <div className="login-page" style={{ display: 'flex', minHeight: '100vh', width: '100%', flexWrap: 'wrap', borderBottom: '1px solid var(--border-subtle)' }}>
        {/* Left panel — Branding */}
        <div className="login-left" style={{ flex: 1, minWidth: 320, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 48, background: 'var(--brand-wash)', borderRight: '1px solid var(--border-subtle)' }}>
          <div className="login-logo" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
            <div className="login-logo-icon" style={{ width: 28, height: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }} aria-hidden="true">
              <span style={{ background: '#0078d4', borderRadius: 2 }} />
              <span style={{ background: '#00B7C3', borderRadius: 2 }} />
              <span style={{ background: '#107C10', borderRadius: 2 }} />
              <span style={{ background: '#FFB900', borderRadius: 2 }} />
            </div>
            <div>
              <div className="login-logo-text" style={{ fontSize: 18, fontWeight: 800 }}>CloudOps Enterprise</div>
              <div className="login-logo-sub" style={{ fontSize: 10, letterSpacing: 1.5, color: '#0078d4' }}>MULTI-CLOUD CONTROL</div>
            </div>
          </div>

          <h1 className="login-tagline" style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.2, margin: '0 0 24px 0' }}>
            Intelligent Cloud<br />
            Operations for<br />
            <span style={{ color: '#0078d4' }}>Enterprise Teams</span>
          </h1>

          <p className="login-desc" style={{ color: 'var(--text-secondary)', fontSize: 16, lineHeight: 1.6, margin: '0 0 32px 0', maxWidth: 460 }}>
            Production-grade multi-tenant workspace with RBAC, automated compliance policies, real-time alerts, and cost optimization across Azure, AWS, and Google Cloud.
          </p>

        </div>

        {/* Right panel — Sign in card */}
        <div className="login-right" style={{ flex: 1, minWidth: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div className="login-card" style={{ width: '100%', maxWidth: 420, background: 'var(--bg-surface)', padding: 32, borderRadius: 16, border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-xl)' }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: 'linear-gradient(135deg, #0078d4, #00B7C3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                boxShadow: '0 8px 24px rgba(0,120,212,0.3)'
              }} aria-hidden="true">
                <Shield size={26} color="white" />
              </div>
              <h2 className="login-card-title" style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Enterprise Platform Login</h2>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '8px 0 0' }}>Sign in with your identity provider</p>
            </div>

            {/* Friendly Error Message Container */}
            {friendlyError && (
              <div style={{
                background: 'rgba(209, 52, 56, 0.12)',
                color: 'var(--danger-700)',
                padding: 16,
                borderRadius: 10,
                fontSize: 13,
                marginBottom: 20,
                border: '1px solid rgba(209, 52, 56, 0.25)',
                lineHeight: 1.5,
                textAlign: 'left'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <strong style={{ display: 'block', fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                      {friendlyError.title}
                    </strong>
                    <div>{friendlyError.message}</div>
                  </div>
                </div>
                
                <div style={{ marginTop: 12, borderTop: '1px solid rgba(209,52,56,0.2)', paddingTop: 10 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Setup Instructions:
                  </div>
                  <ul style={{ paddingLeft: 16, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {friendlyError.instructions.map((inst, index) => (
                      <li key={index} style={{ color: 'var(--text-secondary)' }}>{inst}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {backendUnavailable && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.12)',
                color: 'var(--danger-700)',
                padding: 16,
                borderRadius: 10,
                fontSize: 13,
                marginBottom: 20,
                border: '1px solid rgba(239, 68, 68, 0.25)',
                lineHeight: 1.5,
                textAlign: 'left'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                  <div>
                    <strong style={{ display: 'block', fontSize: 14, fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>
                      Backend Service Offline
                    </strong>
                    <div>
                      {backendErrorType === 'unreachable' && 'The frontend cannot connect to the backend API server. Please check if the backend is running.'}
                      {backendErrorType === 'server_error' && 'The backend API server returned an internal server error (500). Please check backend logs.'}
                      {backendErrorType === 'network_error' && 'A network transmission error occurred while querying the backend services.'}
                      {!backendErrorType && 'The backend API service is currently unavailable.'}
                    </div>
                    <button
                      onClick={() => retryProvidersFetch()}
                      style={{
                        marginTop: 12, padding: '6px 16px', borderRadius: 6, border: '1px solid var(--border-default)',
                        background: 'var(--bg-surface-secondary)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, fontSize: 12,
                        display: 'inline-flex', alignItems: 'center', gap: 6
                      }}
                    >
                      <RefreshCw size={12} /> Retry Connection
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Provider Status Indicators */}
            <div style={{ 
              background: 'var(--bg-surface-secondary)', padding: '8px 12px', borderRadius: 8, marginBottom: 20,
              border: '1px solid var(--border-subtle)'
            }}>
              <ProviderStatusIndicator 
                name="Microsoft" 
                configured={isMicrosoftConfigured} 
                loading={providersLoading} 
                error={providersConfig?.microsoft?.error || null}
              />
              <ProviderStatusIndicator 
                name="Google" 
                configured={isGoogleConfigured} 
                loading={providersLoading} 
                error={providersConfig?.google?.error || null}
              />
              {providersLoading && (
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                  Connecting to authentication server...
                </div>
              )}
              {!providersLoading && backendUnavailable && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#EF4444', padding: '4px 0' }}>
                  <AlertCircle size={14} />
                  <span>Unable to reach authentication server</span>
                  <button 
                    onClick={() => retryProvidersFetch()}
                    style={{ background: 'none', border: 'none', color: 'var(--text-link)', cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: 0 }}
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>

            {/* Identity Provider Sign-In Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              <LoginButton provider="microsoft" onFailure={(err) => setError(err)} />
              <LoginButton provider="google" onFailure={(err) => setError(err)} />
            </div>

            {/* Connect cloud accounts hint */}
            <div style={{ 
              background: 'rgba(0, 120, 212, 0.08)', 
              border: '1px solid rgba(0, 120, 212, 0.2)', 
              borderRadius: 8, padding: '10px 12px', marginBottom: 20,
              display: 'flex', alignItems: 'flex-start', gap: 8
            }}>
              <Cloud size={16} style={{ color: '#0078d4', flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Connect cloud accounts after signing in.</span>{' '}
                Link your Azure, AWS, and Google Cloud accounts from the dashboard without logging out.
              </div>
            </div>

            {/* Device indicators */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 16, color: 'var(--text-secondary)', fontSize: 12 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Smartphone size={14} /> Mobile ready</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={14} /> MFA Ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Landing Feature Sections */}
      <section className="landing-sections" aria-label="Enterprise Cloud Capabilities" style={{ padding: '80px 24px', background: 'var(--bg-surface-secondary)', borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, textAlign: 'center', marginBottom: 16 }}>Enterprise Cloud Capabilities</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16, textAlign: 'center', maxWidth: 600, margin: '0 auto 60px', lineHeight: 1.6 }}>
            Explore the production-ready tools built to monitor, secure, and optimize your cloud resources across Azure, AWS, and Google Cloud.
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32 }}>
            {landingFeatures.map((f, i) => (
              <article key={i} style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 16,
                padding: 28,
                textAlign: 'left',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <div style={{
                  width: 48, height: 48,
                  borderRadius: 12,
                  background: f.gradient,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 20,
                  boxShadow: '0 8px 16px rgba(0,0,0,0.2)'
                }} aria-hidden="true">
                  <f.icon size={22} color="white" />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>{f.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{f.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
