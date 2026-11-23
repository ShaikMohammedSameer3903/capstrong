// ============================================================
// Auth Provider - MSAL + Google Authentication
// Local Admin REMOVED — Enterprise Identity Providers Only
// ============================================================

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { useMsal } from '@azure/msal-react';
import { InteractionRequiredAuthError, InteractionStatus, EventType } from '@azure/msal-browser';
import { loginRequest, popupRedirectUri } from '../config/msalConfig';
import type { User } from '../types';
import { api } from '../services/api';
import { useGoogleAuth } from './GoogleAuthProvider';
import { API_BASE_URL } from '../config/environment';
import { useAppStore } from '../store/appStore';
import { useCloudStore } from '../store/cloudStore';
import { useOperationStore } from '../store/operationStore';

export interface ProviderInfo {
  configured: boolean;
  clientId: string | null;
  tenantId?: string;
  error: string | null;
  missing?: string[];
}

export interface ProvidersConfig {
  microsoft: ProviderInfo;
  azure?: ProviderInfo;
  google: ProviderInfo;
  aws: { configured: boolean };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  msalRedirectError: string | null;
  login: (method?: 'popup' | 'redirect') => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithAwsIam: (credentials: { accessKeyId: string, secretAccessKey: string, sessionToken?: string, roleArn?: string }) => Promise<any>;
  startAwsSsoLogin: () => Promise<any>;
  pollAwsSsoToken: (deviceCode: string, clientId: string, clientSecret: string) => Promise<any>;
  finalizeAwsSsoLogin: (accessToken: string, accountId: string, roleName: string) => Promise<any>;
  logout: () => void;
  getAzureToken: () => Promise<string | null>;
  azureConsentMissing: boolean;
  grantAzureConsent: () => Promise<string | null>;
  providersConfig: ProvidersConfig;
  providersLoading: boolean;
  retryProvidersFetch: () => void;
  backendUnavailable: boolean;
  backendErrorType: 'unreachable' | 'server_error' | 'network_error' | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { instance, inProgress } = useMsal();
  const { googleLogin } = useGoogleAuth();

  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('cloudops-local-user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch { return null; }
  });
  const [providersConfig, setProvidersConfig] = useState<ProvidersConfig>({
    microsoft: { configured: false, clientId: null, tenantId: 'common', error: null },
    google: { configured: false, clientId: null, error: null },
    aws: { configured: true },
  });
  const [providersLoading, setProvidersLoading] = useState(true);
  const [backendUnavailable, setBackendUnavailable] = useState(false);
  const [backendErrorType, setBackendErrorType] = useState<'unreachable' | 'server_error' | 'network_error' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('cloudops-local-token');
  });
  const [msalRedirectError, setMsalRedirectError] = useState<string | null>(null);
  const [azureConsentMissing, setAzureConsentMissing] = useState(false);

  // Fetch authentication providers configuration dynamically from the backend
  const fetchProvidersRef = useRef<() => void>(() => {});
  const retryCountRef = useRef(0);

  const fetchProviders = useCallback(async () => {
    setProvidersLoading(true);
    try {
      // 45s timeout to gracefully accommodate Render / cloud free-tier cold starts
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000);

      const response = await fetch(`${API_BASE_URL}/api/auth/providers`, {
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        setProvidersConfig(data);
        setBackendUnavailable(false);
        setBackendErrorType(null);
        retryCountRef.current = 0;
      } else {
        // Fallback to client-side env variables so authentication buttons remain operational
        const isMicrosoftConfigured = !!(import.meta.env.VITE_AZURE_CLIENT_ID || import.meta.env.VITE_ENTRA_CLIENT_ID);
        const isGoogleConfigured = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;
        setProvidersConfig({
          microsoft: { configured: isMicrosoftConfigured, clientId: import.meta.env.VITE_AZURE_CLIENT_ID || null, tenantId: import.meta.env.VITE_AZURE_TENANT_ID || 'common', error: null },
          azure: { configured: isMicrosoftConfigured, clientId: import.meta.env.VITE_AZURE_CLIENT_ID || null, tenantId: import.meta.env.VITE_AZURE_TENANT_ID || 'common', error: null },
          google: { configured: isGoogleConfigured, clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || null, missing: [], error: null },
          aws: { configured: true }
        });
        if (response.status !== 429) {
          setBackendUnavailable(true);
          setBackendErrorType('server_error');
        } else {
          setBackendUnavailable(false);
          setBackendErrorType(null);
        }
      }
    } catch (err: any) {
      console.warn('[AuthProvider] Backend warming up or unreachable:', err.message || err);
      setBackendUnavailable(true);
      if (err.name === 'AbortError') {
        setBackendErrorType('network_error');
      } else {
        setBackendErrorType('unreachable');
      }

      // Continuous auto-retry for cloud instances waking up (up to 12 retries, every 4s)
      if (retryCountRef.current < 12) {
        retryCountRef.current++;
        setTimeout(() => fetchProviders(), 4000);
      }
    } finally {
      setProvidersLoading(false);
    }
  }, []);

  fetchProvidersRef.current = fetchProviders;

  const retryProvidersFetch = useCallback(() => {
    retryCountRef.current = 0;
    fetchProviders();
  }, [fetchProviders]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  // Track whether we already ran the initial MSAL session sync
  const hasSyncedRef = useRef(false);

  const isAuthenticated = !!token;

  // ── 1. Listen for MSAL login events to set active account ────────────────
  useEffect(() => {
    const callbackId = instance.addEventCallback((event) => {
      if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
        const account = (event.payload as any).account;
        if (account) {
          instance.setActiveAccount(account);
        }
      }
      if (event.eventType === EventType.ACQUIRE_TOKEN_FAILURE && event.error) {
        console.error('[AuthProvider] MSAL acquire token failure:', event.error);
      }
    });

    return () => {
      if (callbackId) instance.removeEventCallback(callbackId);
    };
  }, [instance]);

  // ── 2. Session sync — runs ONCE when MSAL interaction settles ───────────
  useEffect(() => {
    if (inProgress !== InteractionStatus.None) return;
    if (hasSyncedRef.current) return;
    hasSyncedRef.current = true;

    let cancelled = false;

    const syncSession = async () => {
      const activeAccount =
        instance.getActiveAccount() || (instance.getAllAccounts()[0] ?? null);

      if (activeAccount && !localStorage.getItem('cloudops-local-token')) {
        setIsLoading(true);
        try {
          console.log('[MSAL] syncSession acquireTokenSilent. Redirect URI:', popupRedirectUri);
          const result = await instance.acquireTokenSilent({
            ...loginRequest,
            account: activeAccount,
            redirectUri: popupRedirectUri,
          });

          if (result?.idToken && !cancelled) {
            const exchangeResponse = await fetch(`${API_BASE_URL}/api/auth/entra-login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                idToken:     result.idToken,
                email:       result.account.username,
                displayName: result.account.name || result.account.username,
                tenantId:    result.account.tenantId,
                oid:         result.account.localAccountId || result.account.homeAccountId,
              }),
            });

            if (exchangeResponse.ok) {
              const data = await exchangeResponse.json();
              localStorage.setItem('cloudops-local-token', data.token);
              if (data.refreshToken) localStorage.setItem('cloudops-local-refresh-token', data.refreshToken);
              localStorage.setItem('cloudops-local-user', JSON.stringify(data.user));
              localStorage.setItem('cloudops-selected-provider', 'azure');
              localStorage.setItem('cloudops-login-timestamp', Date.now().toString());
              if (!cancelled) {
                setToken(data.token);
                setUser(data.user);
                setMsalRedirectError(null);
              }
            } else {
              const errData = await exchangeResponse.json().catch(() => ({}));
              if (!cancelled) {
                setMsalRedirectError(errData.error || 'Access Denied: Pre-approval check failed.');
              }
            }
          }
        } catch (err: any) {
          if (!cancelled) {
            if (!(err instanceof InteractionRequiredAuthError)) {
              setMsalRedirectError(err.message || 'Failed to establish platform session.');
            }
          }
        } finally {
          if (!cancelled) setIsLoading(false);
        }
      } else {
        if (!cancelled) setIsLoading(false);
      }
    };

    syncSession();

    return () => { cancelled = true; };
  }, [inProgress]);

  const logoutRef = useRef<() => void>(() => {});

  // ── 3. 2-Hour Automatic Session Lifetime & Auto Logout ───────────────────
  useEffect(() => {
    if (!isAuthenticated) return;

    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

    const checkSessionExpiry = () => {
      const loginTimeStr = localStorage.getItem('cloudops-login-timestamp');
      if (loginTimeStr) {
        const loginTime = parseInt(loginTimeStr, 10);
        if (isNaN(loginTime) || loginTime <= 0) {
          localStorage.setItem('cloudops-login-timestamp', Date.now().toString());
          return false;
        }
        if (Date.now() - loginTime >= TWO_HOURS_MS) {
          console.warn('[AuthProvider] 2-hour session duration reached. Auto-logging out all accounts...');
          if (logoutRef.current) logoutRef.current();
          return true;
        }
      } else {
        localStorage.setItem('cloudops-login-timestamp', Date.now().toString());
      }
      return false;
    };

    checkSessionExpiry();

    const interval = setInterval(async () => {
      if (checkSessionExpiry()) return;

      const currentToken = localStorage.getItem('cloudops-local-token');
      const currentRefreshToken = localStorage.getItem('cloudops-local-refresh-token');
      if (!currentRefreshToken) return;

      // Only refresh when JWT access token is nearing expiration (< 20 minutes remaining)
      let needsRefresh = false;
      if (currentToken) {
        try {
          const parts = currentToken.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            const expMs = (payload.exp || 0) * 1000;
            if (expMs > 0 && expMs - Date.now() < 20 * 60 * 1000) {
              needsRefresh = true;
            }
          }
        } catch (_) {
          needsRefresh = false;
        }
      }

      if (!needsRefresh) return;

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: currentRefreshToken })
        });
        if (response.ok) {
          const data = await response.json();
          localStorage.setItem('cloudops-local-token', data.token);
          localStorage.setItem('cloudops-local-refresh-token', data.refreshToken || currentRefreshToken);
          localStorage.setItem('cloudops-local-user', JSON.stringify(data.user));
          setToken(data.token);
          setUser(data.user);
        } else if (response.status === 401 || response.status === 403) {
          console.warn('[AuthProvider] Refresh rejected by server. Logging out expired session.');
          if (logoutRef.current) logoutRef.current();
        }
      } catch (err) {
        console.error('[AuthProvider] Auto-refresh session failed:', err);
      }
    }, 60 * 1000); // Check token age every 1 minute

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // ── 4. Login — Microsoft Entra ID Only ──────────────────────────────────
  const login = useCallback(async (method: 'popup' | 'redirect' = 'popup') => {
    setIsLoading(true);
    setMsalRedirectError(null);
    try {
      // ── Microsoft Entra ID login ──
      if (inProgress !== InteractionStatus.None) {
        throw new Error('Another sign-in is already in progress. Please wait a moment and try again.');
      }

      if (method === 'popup') {
        try {
          console.log('[MSAL] loginPopup. Redirect URI:', popupRedirectUri);
          const result = await instance.loginPopup({
            ...loginRequest,
            prompt: 'select_account',
            redirectUri: popupRedirectUri,
          });

          if (result?.account && result.idToken) {
            instance.setActiveAccount(result.account);
            await exchangeEntraToken(result);
          }
        } catch (err: any) {
          if (err?.errorCode === 'popup_window_error' || err?.errorCode === 'empty_window_error') {
            throw new Error('Popup was blocked by the browser. Please allow popups for this site.', { cause: err });
          }
          if (err?.errorCode === 'user_cancelled') {
            throw new Error('Sign-in was cancelled.', { cause: err });
          }
          throw err;
        }
      } else {
        console.log('[MSAL] loginRedirect. Redirect URI:', popupRedirectUri);
        await instance.loginRedirect({
          ...loginRequest,
          prompt: 'select_account',
          redirectUri: popupRedirectUri,
        });
      }
    } catch (error) {
      console.error('[AuthProvider] Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [instance, inProgress]);

  // Helper: exchange an MSAL token result for a local session
  const exchangeEntraToken = async (result: { idToken: string; account: any }) => {
    let exchangeResponse: Response;
    try {
      exchangeResponse = await fetch(`${API_BASE_URL}/api/auth/entra-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken:     result.idToken,
          email:       result.account.username,
          displayName: result.account.name || result.account.username,
          tenantId:    result.account.tenantId,
          oid:         result.account.localAccountId || result.account.homeAccountId,
        }),
      });
    } catch (networkErr: any) {
      console.error('[AuthProvider] Network error during Entra token exchange:', networkErr);
      throw new Error(
        'Unable to reach the authentication server. This may be a CORS or network issue. ' +
        'Please ensure the backend is running and your origin is allowed.',
        { cause: networkErr }
      );
    }

    if (!exchangeResponse.ok) {
      const errData = await exchangeResponse.json().catch(() => ({}));
      const errorMsg = errData.error || 'Access Denied: Pre-approval check failed.';
      const errorCode = errData.code || '';
      throw new Error(errorCode ? `${errorMsg} (${errorCode})` : errorMsg);
    }

    const data = await exchangeResponse.json();
    localStorage.setItem('cloudops-local-token', data.token);
    if (data.refreshToken) localStorage.setItem('cloudops-local-refresh-token', data.refreshToken);
    localStorage.setItem('cloudops-local-user', JSON.stringify(data.user));
    localStorage.setItem('cloudops-selected-provider', 'azure');
    localStorage.setItem('cloudops-login-timestamp', Date.now().toString());
    setToken(data.token);
    setUser(data.user);
    setMsalRedirectError(null);
  };

  // ── 5. Google login ───────────────────────────────────────────────────────
  const loginWithGoogle = useCallback(async () => {
    setIsLoading(true);
    try {
      const googleProfile = await googleLogin();

      const exchangeResponse = await fetch(`${API_BASE_URL}/api/auth/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(googleProfile)
      });

      if (!exchangeResponse.ok) {
        const errData = await exchangeResponse.json().catch(() => ({}));
        throw new Error(errData.error || 'Access Denied: Google login failed validation.');
      }

      const data = await exchangeResponse.json();
      localStorage.setItem('cloudops-local-token', data.token);
      if (data.refreshToken) localStorage.setItem('cloudops-local-refresh-token', data.refreshToken);
      localStorage.setItem('cloudops-local-user', JSON.stringify(data.user));
      localStorage.setItem('cloudops-selected-provider', 'all');
      localStorage.setItem('cloudops-login-timestamp', Date.now().toString());
      setToken(data.token);
      setUser(data.user);
    } catch (error) {
      console.error('[AuthProvider] Google login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [googleLogin]);

  // ── 5.5. AWS Account Connection (NOT login — these connect a cloud account) ─
  const loginWithAwsIam = useCallback(async (credentials: any) => {
    // This now connects an AWS account to the user's existing session
    try {
      const response = await fetch(`${API_BASE_URL}/api/cloud-accounts/connect/aws-iam`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('cloudops-local-token')}`
        },
        body: JSON.stringify(credentials)
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'AWS IAM connection failed.');
      }
      return response.json();
    } catch (err) {
      // Fallback: try old endpoint for backward compatibility
      const response = await fetch(`${API_BASE_URL}/api/auth/aws-iam-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'AWS IAM connection failed.', { cause: err });
      }
      return response.json();
    }
  }, []);

  const startAwsSsoLogin = useCallback(async () => {
    const startUrl = import.meta.env.VITE_AWS_SSO_START_URL;
    const region = import.meta.env.VITE_AWS_SSO_REGION || 'us-east-1';
    if (!startUrl) {
      throw new Error('AWS SSO is not configured for this deployment.');
    }
    const response = await fetch(`${API_BASE_URL}/api/auth/aws-sso/device-auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startUrl, region })
    });
    if (!response.ok) throw new Error('Failed to start AWS SSO Device Auth');
    return response.json();
  }, []);

  const pollAwsSsoToken = useCallback(async (deviceCode: string, clientId: string, clientSecret: string) => {
    const region = import.meta.env.VITE_AWS_SSO_REGION || 'us-east-1';
    const response = await fetch(`${API_BASE_URL}/api/auth/aws-sso/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceCode, clientId, clientSecret, region })
    });
    if (response.status === 202) return { status: 'pending' };
    if (!response.ok) throw new Error('Failed to acquire token. Please verify code.');
    return response.json();
  }, []);

  const finalizeAwsSsoLogin = useCallback(async (accessToken: string, accountId: string, roleName: string) => {
    const region = import.meta.env.VITE_AWS_SSO_REGION || 'us-east-1';
    const response = await fetch(`${API_BASE_URL}/api/auth/aws-sso/finalize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken, accountId, roleName, region })
    });
    if (!response.ok) throw new Error('Failed to finalize SSO login');
    return response.json();
  }, []);

  // ── 6. Logout ─────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    // Call server-side logout to audit log the event
    fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('cloudops-local-token')}`
      }
    }).catch(() => {});

    // Exhaustive session cleanup & cache destruction
    try {
      localStorage.clear();
      sessionStorage.clear();
      if (typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB.databases) {
        window.indexedDB.databases().then(dbs => {
          dbs.forEach(db => { if (db.name) window.indexedDB.deleteDatabase(db.name); });
        }).catch(() => {});
      }
      if (typeof window !== 'undefined' && 'caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('[Logout Cleanup] Error clearing storage caches:', e);
    }

    // Reset all Zustand application state stores
    useAppStore.getState().clearAllState();
    useCloudStore.getState().clearAllState();
    useOperationStore.setState({ operations: [], activeOperationId: null });
    setToken(null);
    setUser(null);
    hasSyncedRef.current = false;

    // Prevent browser back button from restoring protected pages
    window.history.replaceState(null, '', '/login');

    if (instance.getAllAccounts().length > 0) {
      const postLogoutUri = window.location.origin + '/login';
      console.log('[MSAL] logoutRedirect. Post-Logout Redirect URI:', postLogoutUri);
      instance.logoutRedirect({
        postLogoutRedirectUri: postLogoutUri,
        account: instance.getActiveAccount() || instance.getAllAccounts()[0]
      }).catch((err) => {
        console.error('[AuthProvider] MSAL logoutRedirect failed:', err);
        window.location.href = '/login';
      });
    } else {
      window.location.href = '/login';
    }
  }, [instance]);

  useEffect(() => {
    logoutRef.current = logout;
    api.setOnUnauthorized(() => {
      if (window.location.pathname === '/login') return; // Prevent reload loops on login page
      console.warn('[AuthProvider] Received 401/403 session authorization failure. Purging stale credentials and redirecting to login...');
      logout();
    });
  }, [logout]);

  // ── 7. Get current token for API calls ───────────────────────────────────
  const getAzureToken = useCallback(async (): Promise<string | null> => {
    if (user?.provider === 'Microsoft') {
      try {
        const activeAccount = instance.getActiveAccount() || instance.getAllAccounts()[0];
        if (activeAccount) {
          const result = await instance.acquireTokenSilent({
            scopes: ['https://management.azure.com/user_impersonation'],
            account: activeAccount,
          });
          return result?.accessToken || null;
        }
      } catch (err: any) {
        console.warn('[AuthProvider] Failed to acquire Azure management token silently:', err);
        const errStr = (err?.message || err?.errorMessage || '').toLowerCase();
        if (errStr.includes('aadsts65001') || errStr.includes('consent') || err?.name === 'InteractionRequiredAuthError') {
          setAzureConsentMissing(true);
        }
      }
    }
    return localStorage.getItem('cloudops-local-token');
  }, [user, instance]);

  const getAzureManagementToken = useCallback(async (): Promise<string | null> => {
    if (user?.provider !== 'Microsoft') {
      return null;
    }
    try {
      const activeAccount = instance.getActiveAccount() || instance.getAllAccounts()[0];
      if (!activeAccount) return null;
      const result = await instance.acquireTokenSilent({
        scopes: ['https://management.azure.com/user_impersonation'],
        account: activeAccount,
      });
      return result?.accessToken || null;
    } catch (err: any) {
      console.warn('[AuthProvider] Failed to acquire Azure management token silently:', err);
      const errStr = (err?.message || err?.errorMessage || '').toLowerCase();
      if (errStr.includes('aadsts65001') || errStr.includes('consent') || err?.name === 'InteractionRequiredAuthError') {
        setAzureConsentMissing(true);
      }
      return null;
    }
  }, [user, instance]);

  const grantAzureConsent = useCallback(async (): Promise<string | null> => {
    try {
      const activeAccount = instance.getActiveAccount() || instance.getAllAccounts()[0];
      if (!activeAccount) throw new Error('No active account found for consent grant.');
      
      console.log('[MSAL] acquireTokenPopup (Azure consent). Redirect URI:', popupRedirectUri);
      const result = await instance.acquireTokenPopup({
        scopes: ['https://management.azure.com/user_impersonation'],
        account: activeAccount,
        redirectUri: popupRedirectUri,
      });
      
      if (result?.accessToken) {
        setAzureConsentMissing(false);
        return result.accessToken;
      }
      return null;
    } catch (err: any) {
      console.error('[AuthProvider] Failed to acquire Azure consent interactively:', err);
      throw err;
    }
  }, [instance]);

  // Wire API interceptors
  useEffect(() => { api.setTokenProvider(getAzureToken); }, [getAzureToken]);
  useEffect(() => { api.setAzureTokenProvider(getAzureManagementToken); }, [getAzureManagementToken]);
  useEffect(() => { api.setOnUnauthorized(logout); }, [logout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        msalRedirectError,
        login,
        loginWithGoogle,
        loginWithAwsIam,
        startAwsSsoLogin,
        pollAwsSsoToken,
        finalizeAwsSsoLogin,
        logout,
        getAzureToken,
        azureConsentMissing,
        grantAzureConsent,
        providersConfig,
        providersLoading,
        retryProvidersFetch,
        backendUnavailable,
        backendErrorType,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
