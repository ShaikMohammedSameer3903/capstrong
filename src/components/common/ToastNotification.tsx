import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { CheckCircle2, AlertTriangle, XCircle, Info, ShieldAlert, X, Sparkles } from 'lucide-react';

export function ToastNotification() {
  const { notifications, removeNotification } = useAppStore();

  if (!notifications || notifications.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      maxWidth: '440px',
      width: 'calc(100vw - 48px)',
      pointerEvents: 'none'
    }}>
      {notifications.slice(0, 5).map((n) => (
        <ToastItem key={n.id} notification={n} onClose={() => removeNotification(n.id)} />
      ))}
    </div>
  );
}

function ToastItem({ notification, onClose }: { notification: any; onClose: () => void }) {
  const type = notification.type || 'info';
  const DURATION_MS = 6000;
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 250);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  const configMap: Record<string, { bg: string; border: string; glow: string; color: string; icon: any; label: string }> = {
    success: {
      bg: 'rgba(16, 185, 129, 0.08)',
      border: 'rgba(16, 185, 129, 0.4)',
      glow: '0 0 20px rgba(16, 185, 129, 0.25)',
      color: '#10b981',
      icon: CheckCircle2,
      label: 'SUCCESS'
    },
    warning: {
      bg: 'rgba(245, 158, 11, 0.08)',
      border: 'rgba(245, 158, 11, 0.4)',
      glow: '0 0 20px rgba(245, 158, 11, 0.25)',
      color: '#f59e0b',
      icon: AlertTriangle,
      label: 'WARNING'
    },
    error: {
      bg: 'rgba(239, 68, 68, 0.08)',
      border: 'rgba(239, 68, 68, 0.4)',
      glow: '0 0 20px rgba(239, 68, 68, 0.25)',
      color: '#ef4444',
      icon: XCircle,
      label: 'ERROR'
    },
    azure_503: {
      bg: 'rgba(249, 115, 22, 0.1)',
      border: 'rgba(249, 115, 22, 0.5)',
      glow: '0 0 20px rgba(249, 115, 22, 0.3)',
      color: '#f97316',
      icon: ShieldAlert,
      label: 'SERVICE ALERT'
    },
    info: {
      bg: 'rgba(59, 130, 246, 0.08)',
      border: 'rgba(59, 130, 246, 0.4)',
      glow: '0 0 20px rgba(59, 130, 246, 0.25)',
      color: '#3b82f6',
      icon: Info,
      label: 'SYSTEM INFO'
    }
  };

  const styleConfig = configMap[type] || configMap.info;
  const Icon = styleConfig.icon;

  return (
    <div style={{
      pointerEvents: 'auto',
      background: 'var(--bg-surface-raised, rgba(15, 23, 42, 0.85))',
      border: `1px solid ${styleConfig.border}`,
      borderRadius: '16px',
      padding: '16px 18px',
      boxShadow: `0 12px 32px -4px rgba(0, 0, 0, 0.28), ${styleConfig.glow}`,
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '14px',
      animation: isExiting
        ? 'toastExit 0.25s cubic-bezier(0.4, 0, 1, 1) forwards'
        : 'toastSlideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Subtle Gradient Overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `linear-gradient(135deg, ${styleConfig.bg}, transparent 70%)`,
        pointerEvents: 'none',
        borderRadius: '16px'
      }} />

      {/* Glowing Icon Container */}
      <div style={{
        background: `rgba(255, 255, 255, 0.05)`,
        border: `1px solid ${styleConfig.border}`,
        borderRadius: '12px',
        padding: '10px',
        color: styleConfig.color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0 0 12px ${styleConfig.color}33`,
        flexShrink: 0,
        marginTop: '2px',
        position: 'relative',
        zIndex: 1
      }}>
        <Icon size={22} />
      </div>

      {/* Main Notification Content */}
      <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '4px'
        }}>
          <span style={{
            fontSize: '0.65rem',
            fontWeight: 800,
            letterSpacing: '0.08em',
            padding: '2px 8px',
            borderRadius: '20px',
            background: `${styleConfig.color}22`,
            color: styleConfig.color,
            border: `1px solid ${styleConfig.color}44`,
            textTransform: 'uppercase'
          }}>
            {styleConfig.label}
          </span>
          <span style={{
            fontSize: '0.875rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            lineHeight: 1.2
          }}>
            {notification.title || 'System Notification'}
          </span>
        </div>

        <div style={{
          fontSize: '0.825rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.45,
          wordBreak: 'break-word',
          marginTop: '4px'
        }}>
          {notification.message}
        </div>

        {notification.timestamp && (
          <div style={{
            fontSize: '0.7rem',
            color: 'var(--text-tertiary)',
            marginTop: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <Sparkles size={11} style={{ opacity: 0.7 }} />
            {new Date(notification.timestamp).toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Dismiss Button */}
      <button
        onClick={handleClose}
        style={{
          color: 'var(--text-tertiary)',
          padding: '6px',
          borderRadius: '8px',
          cursor: 'pointer',
          border: '1px solid transparent',
          background: 'rgba(255, 255, 255, 0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          position: 'relative',
          zIndex: 1
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--text-primary)';
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--text-tertiary)';
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
        }}
      >
        <X size={16} />
      </button>

      {/* Animated Progress Countdown Bar */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '3px',
        background: `rgba(255, 255, 255, 0.1)`,
        overflow: 'hidden',
        borderBottomLeftRadius: '16px',
        borderBottomRightRadius: '16px'
      }}>
        <div style={{
          height: '100%',
          width: '100%',
          background: `linear-gradient(90deg, ${styleConfig.color}, #60a5fa)`,
          animation: `toastProgressCountdown ${DURATION_MS}ms linear forwards`,
          boxShadow: `0 0 8px ${styleConfig.color}`
        }} />
      </div>
    </div>
  );
}
