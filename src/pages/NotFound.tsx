import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Home, ArrowLeft, Search, Compass, ShieldAlert } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      background: 'radial-gradient(ellipse at top, rgba(37, 99, 235, 0.08) 0%, transparent 70%)'
    }}>
      <div style={{
        maxWidth: '560px',
        width: '100%',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: '16px',
        padding: '3rem 2.5rem',
        boxShadow: 'var(--shadow-xl)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Ambient Top Glow Beam */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #ef4444, #f59e0b, #3b82f6)'
        }} />

        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '20px',
          background: 'rgba(239, 68, 68, 0.1)',
          color: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
          boxShadow: '0 0 20px rgba(239, 68, 68, 0.15)'
        }}>
          <ShieldAlert size={36} />
        </div>

        <h1 style={{
          fontSize: '4.5rem',
          fontWeight: 900,
          letterSpacing: '-2px',
          lineHeight: 1,
          margin: '0 0 0.5rem',
          background: 'linear-gradient(135deg, var(--text-primary), var(--text-tertiary))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          404
        </h1>

        <h2 style={{
          fontSize: '1.25rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: '0.75rem'
        }}>
          Resource Page Not Found
        </h2>

        <p style={{
          fontSize: '0.925rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          marginBottom: '2rem'
        }}>
          The requested cloud path or enterprise endpoint does not exist or has been moved. Check your navigation parameters or return to the main dashboard.
        </p>

        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              borderRadius: '10px',
              border: '1px solid var(--border-strong)',
              background: 'var(--bg-surface-secondary)',
              color: 'var(--text-primary)',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <ArrowLeft size={18} />
            Go Back
          </button>

          <button
            onClick={() => navigate('/')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
              transition: 'all 0.2s ease'
            }}
          >
            <Home size={18} />
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
