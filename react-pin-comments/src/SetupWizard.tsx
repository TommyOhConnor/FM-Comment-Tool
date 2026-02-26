import { useState } from 'react';
import { DatabaseIcon, HardDriveIcon, CheckIcon, CopyIcon, CloseIcon } from './icons';
import { CommentAPI } from './api';
import type { SupabaseConfig } from './types';

interface SetupWizardProps {
  storagePrefix: string;
  tableName: string;
  onComplete: (config: SupabaseConfig | null) => void;
  onCancel: () => void;
}

type Step = 'choose' | 'supabase-credentials' | 'supabase-sql' | 'supabase-test' | 'done';

const SETUP_SQL = (tableName: string) => `-- Run this in your Supabase SQL Editor
-- (Dashboard > SQL Editor > New Query)

create table if not exists ${tableName} (
  id text primary key,
  x numeric not null,
  y numeric not null,
  text text not null,
  page text not null default '/',
  author text,
  replies jsonb default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table ${tableName} enable row level security;

create policy "Allow public access"
  on ${tableName} for all
  using (true)
  with check (true);`;

export function SetupWizard({ storagePrefix, tableName, onComplete, onCancel }: SetupWizardProps) {
  const [step, setStep] = useState<Step>('choose');
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopySQL = () => {
    navigator.clipboard.writeText(SETUP_SQL(tableName));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const api = new CommentAPI({ url: url.replace(/\/$/, ''), anonKey }, tableName);
    const result = await api.testConnection();
    setTestResult(result);
    setTesting(false);

    if (result.ok) {
      const config: SupabaseConfig = { url: url.replace(/\/$/, ''), anonKey };
      localStorage.setItem(`${storagePrefix}supabase-config`, JSON.stringify(config));
      // Short delay to show success state
      setTimeout(() => onComplete(config), 800);
    }
  };

  const handleLocalOnly = () => {
    localStorage.setItem(`${storagePrefix}mode`, 'local');
    onComplete(null);
  };

  const modalStyle: React.CSSProperties = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 10002,
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '2rem',
    width: '480px',
    maxWidth: '90vw',
    maxHeight: '85vh',
    overflowY: 'auto',
    boxShadow: '0 24px 48px rgba(0, 0, 0, 0.2)',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  };

  const backdropStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 10001,
  };

  return (
    <>
      <div style={backdropStyle} onClick={onCancel} />
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button
          onClick={onCancel}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.5rem',
            borderRadius: '0.25rem',
            color: '#525252',
          }}
        >
          <CloseIcon />
        </button>

        {step === 'choose' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#0f62fe',
                color: 'white',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
                fontSize: '24px',
              }}>
                <svg width="28" height="28" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1c3.9 0 7 2.7 7 6s-3.1 6-7 6c-.5 0-1-.1-1.5-.2L3 14.5v-3.3C1.8 10.2 1 8.7 1 7c0-3.3 3.1-6 7-6z"/>
                </svg>
              </div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#161616' }}>
                Set Up Pin Comments
              </h2>
              <p style={{ margin: '0.5rem 0 0', fontSize: '14px', color: '#525252' }}>
                Choose how you'd like to store your comments.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                onClick={() => setStep('supabase-credentials')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1.25rem',
                  border: '2px solid #e0e0e0',
                  borderRadius: '12px',
                  background: 'white',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#0f62fe';
                  e.currentTarget.style.backgroundColor = '#f0f4ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e0e0e0';
                  e.currentTarget.style.backgroundColor = 'white';
                }}
              >
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  backgroundColor: '#3ecf8e20',
                  color: '#3ecf8e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <DatabaseIcon />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '15px', color: '#161616' }}>
                    Connect Supabase
                  </div>
                  <div style={{ fontSize: '13px', color: '#525252', marginTop: '0.25rem' }}>
                    Shared, persistent comments synced across users and devices. Free tier available.
                  </div>
                </div>
              </button>

              <button
                onClick={handleLocalOnly}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1.25rem',
                  border: '2px solid #e0e0e0',
                  borderRadius: '12px',
                  background: 'white',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#0f62fe';
                  e.currentTarget.style.backgroundColor = '#f0f4ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e0e0e0';
                  e.currentTarget.style.backgroundColor = 'white';
                }}
              >
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  backgroundColor: '#39393920',
                  color: '#393939',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <HardDriveIcon />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '15px', color: '#161616' }}>
                    Local Storage Only
                  </div>
                  <div style={{ fontSize: '13px', color: '#525252', marginTop: '0.25rem' }}>
                    Comments stored in this browser only. Great for personal use or testing.
                  </div>
                </div>
              </button>
            </div>
          </>
        )}

        {step === 'supabase-credentials' && (
          <>
            <h2 style={{ margin: '0 0 0.5rem', fontSize: '18px', fontWeight: 700, color: '#161616' }}>
              Connect to Supabase
            </h2>
            <p style={{ margin: '0 0 1.5rem', fontSize: '13px', color: '#525252' }}>
              Find these in your Supabase dashboard under <strong>Settings &gt; API</strong>.
              Don't have a project?{' '}
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#0f62fe' }}
              >
                Create one free
              </a>
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#161616', marginBottom: '0.25rem' }}>
                Project URL
              </label>
              <input
                className="pin-comment-input"
                placeholder="https://your-project.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                autoFocus
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#161616', marginBottom: '0.25rem' }}>
                Anon / Public Key
              </label>
              <input
                className="pin-comment-input"
                placeholder="eyJhbGciOiJIUzI1NiIs..."
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                type="password"
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between' }}>
              <button
                className="pin-comment-button pin-comment-button-ghost pin-comment-button-sm"
                onClick={() => setStep('choose')}
                style={{ boxShadow: 'none' }}
              >
                Back
              </button>
              <button
                className="pin-comment-button pin-comment-button-primary pin-comment-button-sm"
                onClick={() => setStep('supabase-sql')}
                disabled={!url.trim() || !anonKey.trim()}
              >
                Next: Create Table
              </button>
            </div>
          </>
        )}

        {step === 'supabase-sql' && (
          <>
            <h2 style={{ margin: '0 0 0.5rem', fontSize: '18px', fontWeight: 700, color: '#161616' }}>
              Create the Comments Table
            </h2>
            <p style={{ margin: '0 0 1rem', fontSize: '13px', color: '#525252' }}>
              Copy this SQL and run it in your{' '}
              <a
                href={`${url}/project/default/sql/new`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#0f62fe' }}
              >
                Supabase SQL Editor
              </a>
              . Skip this step if you've already done it.
            </p>

            <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
              <pre style={{
                backgroundColor: '#161616',
                color: '#c6c6c6',
                padding: '1rem',
                borderRadius: '8px',
                fontSize: '11.5px',
                lineHeight: '1.5',
                overflowX: 'auto',
                margin: 0,
                whiteSpace: 'pre',
              }}>
                {SETUP_SQL(tableName)}
              </pre>
              <button
                onClick={handleCopySQL}
                style={{
                  position: 'absolute',
                  top: '0.5rem',
                  right: '0.5rem',
                  background: '#393939',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '0.35rem 0.6rem',
                  cursor: 'pointer',
                  color: 'white',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                {copied ? <><CheckIcon /> Copied</> : <><CopyIcon /> Copy</>}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between' }}>
              <button
                className="pin-comment-button pin-comment-button-ghost pin-comment-button-sm"
                onClick={() => setStep('supabase-credentials')}
                style={{ boxShadow: 'none' }}
              >
                Back
              </button>
              <button
                className="pin-comment-button pin-comment-button-primary pin-comment-button-sm"
                onClick={handleTestConnection}
              >
                Test Connection
              </button>
            </div>
          </>
        )}

        {(step === 'supabase-test' || testing || testResult) && step !== 'choose' && step !== 'supabase-credentials' && (
          <>
            {testing && (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  border: '3px solid #e0e0e0',
                  borderTopColor: '#0f62fe',
                  borderRadius: '50%',
                  margin: '0 auto 1rem',
                  animation: 'pin-comment-spin 0.8s linear infinite',
                }} />
                <style>{`@keyframes pin-comment-spin { to { transform: rotate(360deg); } }`}</style>
                <p style={{ margin: 0, fontSize: '14px', color: '#525252' }}>Testing connection...</p>
              </div>
            )}

            {testResult && !testing && (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                {testResult.ok ? (
                  <>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      backgroundColor: '#defbe6',
                      color: '#198038',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '1rem',
                    }}>
                      <svg width="28" height="28" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M6.5 12.5l-4-4 1.4-1.4 2.6 2.6 5.6-5.6 1.4 1.4z"/>
                      </svg>
                    </div>
                    <h3 style={{ margin: '0 0 0.5rem', fontSize: '18px', fontWeight: 700, color: '#161616' }}>
                      Connected!
                    </h3>
                    <p style={{ margin: 0, fontSize: '13px', color: '#525252' }}>
                      Pin Comments is ready to use. Click anywhere to start commenting.
                    </p>
                  </>
                ) : (
                  <>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      backgroundColor: '#fff1f1',
                      color: '#da1e28',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '1rem',
                    }}>
                      <CloseIcon />
                    </div>
                    <h3 style={{ margin: '0 0 0.5rem', fontSize: '18px', fontWeight: 700, color: '#161616' }}>
                      Connection Failed
                    </h3>
                    <p style={{
                      margin: '0 0 1rem',
                      fontSize: '13px',
                      color: '#da1e28',
                      backgroundColor: '#fff1f1',
                      padding: '0.75rem',
                      borderRadius: '6px',
                      textAlign: 'left',
                    }}>
                      {testResult.error}
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button
                        className="pin-comment-button pin-comment-button-ghost pin-comment-button-sm"
                        onClick={() => { setTestResult(null); setStep('supabase-sql'); }}
                        style={{ boxShadow: 'none' }}
                      >
                        Back to SQL
                      </button>
                      <button
                        className="pin-comment-button pin-comment-button-primary pin-comment-button-sm"
                        onClick={handleTestConnection}
                      >
                        Retry
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
