/**
 * react-pin-comments v1.0.0
 * 
 * Drop-in visual commenting system for React apps.
 * Zero dependencies beyond React. Supports Supabase persistence or localStorage-only mode.
 *
 * INSTALLATION:
 *   1. Copy this file into your project (e.g. src/components/CommentWidget.tsx)
 *   2. Import and render:
 *        import { CommentWidget } from './components/CommentWidget';
 *        <CommentWidget />
 *   3. The parent container needs `position: relative` for pins to scroll with content.
 *   4. Click "Add Comments" — the setup wizard will guide you through connecting Supabase
 *      or choosing local-only mode.
 *
 * PROPS (all optional):
 *   supabaseUrl      — skip wizard by providing Supabase project URL
 *   supabaseAnonKey  — skip wizard by providing Supabase anon key
 *   tableName        — Supabase table name (default: 'pin_comments')
 *   storagePrefix    — localStorage key prefix (default: 'pin-comments:')
 *   position         — FAB position: 'bottom-right' | 'bottom-left'
 */

import { useState, useEffect } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Reply {
  id: string;
  text: string;
  author?: string;
  timestamp: string;
}

interface Comment {
  id: string;
  x: number;
  y: number;
  text: string;
  timestamp: string;
  page: string;
  author?: string;
  replies?: Reply[];
  created_at?: string;
}

interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export interface CommentWidgetProps {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  tableName?: string;
  storagePrefix?: string;
  position?: 'bottom-right' | 'bottom-left';
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const ChatIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 1c3.9 0 7 2.7 7 6s-3.1 6-7 6c-.5 0-1-.1-1.5-.2L3 14.5v-3.3C1.8 10.2 1 8.7 1 7c0-3.3 3.1-6 7-6z"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M12 4.7L11.3 4 8 7.3 4.7 4 4 4.7 7.3 8 4 11.3l.7.7L8 8.7l3.3 3.3.7-.7L8.7 8z"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M6 3V2h4v1h5v1h-1v9.5c0 .8-.7 1.5-1.5 1.5h-9C2.7 15 2 14.3 2 13.5V4H1V3h5zm1 0h2V2H7v1zm6 1H3v9.5c0 .3.2.5.5.5h9c.3 0 .5-.2.5-.5V4z"/>
  </svg>
);

const ViewIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 3C4.5 3 1.5 5.5 0 8c1.5 2.5 4.5 5 8 5s6.5-2.5 8-5c-1.5-2.5-4.5-5-8-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5S6.1 4.5 8 4.5s3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5z"/>
    <circle cx="8" cy="8" r="2"/>
  </svg>
);

const ViewOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M2.4 1L1 2.4l2.6 2.6C2.2 6.1 1.1 7 0 8c1.5 2.5 4.5 5 8 5 1.1 0 2.1-.2 3-.6L13.6 15 15 13.6l-12.6-12.6zM8 11.5c-.7 0-1.3-.2-1.9-.5l1.5-1.5c.1 0 .3.1.4.1 1.1 0 2-.9 2-2 0-.1 0-.3-.1-.4l1.5-1.5c.4.6.6 1.2.6 1.9 0 1.9-1.6 3.5-3.5 3.5zM8 3C6.9 3 5.9 3.2 5 3.6l1.4 1.4C6.7 5 7 5 7.5 5 9.4 5 11 6.6 11 8.5c0 .5-.1.8-.2 1.1l2.6 2.6c1.5-1.1 2.6-2.4 3.6-4.2C15.5 5.5 12.5 3 8 3z"/>
  </svg>
);

const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 8a3.5 3.5 0 100-7 3.5 3.5 0 000 7zm0 1c-3.5 0-7 1.75-7 3.5V14h14v-1.5C15 10.75 11.5 9 8 9z"/>
  </svg>
);

const ReplyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M6 3L1 7l5 4V8.5c4 0 7 1 9 4.5-1-4.5-4-7.5-9-8V3z"/>
  </svg>
);

const DatabaseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
    <ellipse cx="8" cy="3.5" rx="6" ry="2.5"/>
    <path d="M2 3.5v3c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-3"/>
    <path d="M2 6.5v3c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-3"/>
    <path d="M2 9.5v3c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-3"/>
  </svg>
);

const HardDriveIcon = () => (
  <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
    <path d="M1 10h14v4H1v-4zm1 1v2h12v-2H2zm9 .5a.5.5 0 111 0 .5.5 0 01-1 0zm-2 0a.5.5 0 111 0 .5.5 0 01-1 0z"/>
    <path d="M3.5 2h9l2.5 7H1L3.5 2zm.7 1L2.4 9h11.2L11.8 3H4.2z"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M6.5 12.5l-4-4 1.4-1.4 2.6 2.6 5.6-5.6 1.4 1.4z"/>
  </svg>
);

const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M11 0H2a2 2 0 00-2 2v9h2V2h9V0zm3 4H6a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V6a2 2 0 00-2-2zm0 10H6V6h8v8z"/>
  </svg>
);

const GearIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 10a2 2 0 100-4 2 2 0 000 4zm0-5a3 3 0 110 6 3 3 0 010-6zm5.6 2.2l1.4.5v1.6l-1.4.5c-.1.4-.3.7-.5 1l.5 1.4-1.1 1.1-1.4-.5c-.3.2-.7.4-1 .5L10 14H8.4l-.5-1.4c-.4-.1-.7-.3-1-.5l-1.4.5-1.1-1.1.5-1.4c-.2-.3-.4-.7-.5-1L3 9V7.4l1.4-.5c.1-.4.3-.7.5-1L4.4 4.5l1.1-1.1 1.4.5c.3-.2.7-.4 1-.5L8.4 2H10l.5 1.4c.4.1.7.3 1 .5l1.4-.5 1.1 1.1-.5 1.4c.2.3.4.7.5 1z"/>
  </svg>
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const STYLES = `
  .pcw-btn {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    padding: 0.75rem 1.25rem;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.2s ease;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    line-height: 1;
  }
  .pcw-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2); }
  .pcw-btn:active { transform: translateY(0); }
  .pcw-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important; }
  .pcw-primary { background-color: #0f62fe; color: white; }
  .pcw-primary:hover:not(:disabled) { background-color: #0353e9; }
  .pcw-secondary { background-color: #393939; color: white; }
  .pcw-secondary:hover:not(:disabled) { background-color: #4c4c4c; }
  .pcw-tertiary { background-color: white; color: #161616; border: 1px solid #e0e0e0; }
  .pcw-tertiary:hover:not(:disabled) { background-color: #f4f4f4; }
  .pcw-icon { padding: 0.75rem; }
  .pcw-sm { padding: 0.5rem 1rem; font-size: 13px; }
  .pcw-ghost { background: transparent; color: #161616; box-shadow: none; }
  .pcw-ghost:hover:not(:disabled) { background-color: #e0e0e0; }
  .pcw-input {
    width: 100%; padding: 0.75rem; border: 1px solid #8d8d8d; border-radius: 0.25rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px; outline: none; box-sizing: border-box; resize: vertical;
  }
  .pcw-input:focus { border-color: #0f62fe; box-shadow: 0 0 0 1px #0f62fe; }
  @keyframes pcw-spin { to { transform: rotate(360deg); } }
`;

// ─── API Client ───────────────────────────────────────────────────────────────

class CommentAPI {
  private config: SupabaseConfig;
  private tableName: string;

  constructor(config: SupabaseConfig, tableName: string) {
    this.config = config;
    this.tableName = tableName;
  }

  private get headers() {
    return {
      'apikey': this.config.anonKey,
      'Authorization': `Bearer ${this.config.anonKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    };
  }

  private get baseUrl() {
    return `${this.config.url}/rest/v1/${this.tableName}`;
  }

  async fetchComments(): Promise<Comment[]> {
    const res = await fetch(`${this.baseUrl}?order=created_at.asc`, { headers: this.headers });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${await res.text()}`);
    return ((await res.json()) || []).map((c: any) => ({ ...c, page: c.page || '/', replies: c.replies || [] }));
  }

  async addComment(c: Comment): Promise<Comment> {
    const res = await fetch(this.baseUrl, {
      method: 'POST', headers: this.headers,
      body: JSON.stringify({ id: c.id, x: c.x, y: c.y, text: c.text, page: c.page, author: c.author || null, replies: c.replies || [], created_at: c.timestamp }),
    });
    if (!res.ok) throw new Error(`Add failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return data[0] || c;
  }

  async updateComment(id: string, updates: Partial<Comment>): Promise<void> {
    const body: Record<string, any> = {};
    if (updates.replies !== undefined) body.replies = updates.replies;
    if (updates.text !== undefined) body.text = updates.text;
    if (updates.author !== undefined) body.author = updates.author;
    const res = await fetch(`${this.baseUrl}?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: this.headers, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`Update failed: ${res.status} ${await res.text()}`);
  }

  async deleteComment(id: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: this.headers });
    if (!res.ok) throw new Error(`Delete failed: ${res.status} ${await res.text()}`);
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}?limit=1`, { headers: this.headers });
      if (!res.ok) {
        const t = await res.text();
        if (res.status === 404 || (t.includes('relation') && t.includes('does not exist')))
          return { ok: false, error: 'Table not found. Run the setup SQL in your Supabase SQL Editor.' };
        if (res.status === 401) return { ok: false, error: 'Auth failed. Check your anon key.' };
        return { ok: false, error: `${res.status}: ${t}` };
      }
      return { ok: true };
    } catch (e) { return { ok: false, error: `Could not reach Supabase: ${e}` }; }
  }
}

// ─── Setup SQL ────────────────────────────────────────────────────────────────

const SETUP_SQL = (t: string) => `-- Run this in your Supabase SQL Editor
-- (Dashboard > SQL Editor > New Query)

create table if not exists ${t} (
  id text primary key,
  x numeric not null,
  y numeric not null,
  text text not null,
  page text not null default '/',
  author text,
  replies jsonb default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table ${t} enable row level security;

create policy "Allow public access"
  on ${t} for all
  using (true)
  with check (true);`;

// ─── Setup Wizard ─────────────────────────────────────────────────────────────

function SetupWizard({ storagePrefix, tableName, onComplete, onCancel }: {
  storagePrefix: string; tableName: string;
  onComplete: (config: SupabaseConfig | null) => void; onCancel: () => void;
}) {
  const [step, setStep] = useState<'choose' | 'creds' | 'sql' | 'test'>('choose');
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => { navigator.clipboard.writeText(SETUP_SQL(tableName)); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const handleTest = async () => {
    setTesting(true); setTestResult(null);
    const api = new CommentAPI({ url: url.replace(/\/$/, ''), anonKey }, tableName);
    const result = await api.testConnection();
    setTestResult(result); setTesting(false);
    if (result.ok) {
      const config: SupabaseConfig = { url: url.replace(/\/$/, ''), anonKey };
      localStorage.setItem(`${storagePrefix}supabase-config`, JSON.stringify(config));
      setTimeout(() => onComplete(config), 800);
    }
  };

  const font: React.CSSProperties = { fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" };
  const modal: React.CSSProperties = { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10002, backgroundColor: 'white', borderRadius: '16px', padding: '2rem', width: '480px', maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 24px 48px rgba(0,0,0,0.2)', ...font };

  return (
    <>
      <div onClick={onCancel} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10001 }} />
      <div style={modal} onClick={e => e.stopPropagation()}>
        <button onClick={onCancel} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', color: '#525252' }}><CloseIcon /></button>

        {step === 'choose' && (<>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: '#0f62fe', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <svg width="28" height="28" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1c3.9 0 7 2.7 7 6s-3.1 6-7 6c-.5 0-1-.1-1.5-.2L3 14.5v-3.3C1.8 10.2 1 8.7 1 7c0-3.3 3.1-6 7-6z"/></svg>
            </div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Set Up Pin Comments</h2>
            <p style={{ margin: '0.5rem 0 0', fontSize: 14, color: '#525252' }}>Choose how you'd like to store comments.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { icon: <DatabaseIcon />, bg: '#3ecf8e20', fg: '#3ecf8e', title: 'Connect Supabase', desc: 'Shared, persistent comments synced across users and devices.', action: () => setStep('creds') },
              { icon: <HardDriveIcon />, bg: '#39393920', fg: '#393939', title: 'Local Storage Only', desc: 'Comments stored in this browser only. Great for testing.', action: () => { localStorage.setItem(`${storagePrefix}mode`, 'local'); onComplete(null); } },
            ].map((opt, i) => (
              <button key={i} onClick={opt.action} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', border: '2px solid #e0e0e0', borderRadius: 12, background: 'white', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#0f62fe'; e.currentTarget.style.backgroundColor = '#f0f4ff'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e0e0e0'; e.currentTarget.style.backgroundColor = 'white'; }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: opt.bg, color: opt.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{opt.icon}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{opt.title}</div>
                  <div style={{ fontSize: 13, color: '#525252', marginTop: '0.25rem' }}>{opt.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </>)}

        {step === 'creds' && (<>
          <h2 style={{ margin: '0 0 0.5rem', fontSize: 18, fontWeight: 700 }}>Connect to Supabase</h2>
          <p style={{ margin: '0 0 1.5rem', fontSize: 13, color: '#525252' }}>Find these under <strong>Settings &gt; API</strong>. <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" style={{ color: '#0f62fe' }}>Create a free project</a></p>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: '0.25rem' }}>Project URL</label>
            <input className="pcw-input" placeholder="https://your-project.supabase.co" value={url} onChange={e => setUrl(e.target.value)} autoFocus />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: '0.25rem' }}>Anon / Public Key</label>
            <input className="pcw-input" placeholder="eyJhbGciOiJIUzI1NiIs..." value={anonKey} onChange={e => setAnonKey(e.target.value)} type="password" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="pcw-btn pcw-ghost pcw-sm" onClick={() => setStep('choose')} style={{ boxShadow: 'none' }}>Back</button>
            <button className="pcw-btn pcw-primary pcw-sm" onClick={() => setStep('sql')} disabled={!url.trim() || !anonKey.trim()}>Next: Create Table</button>
          </div>
        </>)}

        {step === 'sql' && !testing && !testResult && (<>
          <h2 style={{ margin: '0 0 0.5rem', fontSize: 18, fontWeight: 700 }}>Create the Comments Table</h2>
          <p style={{ margin: '0 0 1rem', fontSize: 13, color: '#525252' }}>Copy this SQL and run it in your <a href={`${url}/project/default/sql/new`} target="_blank" rel="noopener noreferrer" style={{ color: '#0f62fe' }}>Supabase SQL Editor</a>. Skip if already done.</p>
          <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
            <pre style={{ backgroundColor: '#161616', color: '#c6c6c6', padding: '1rem', borderRadius: 8, fontSize: '11.5px', lineHeight: 1.5, overflowX: 'auto', margin: 0, whiteSpace: 'pre' }}>{SETUP_SQL(tableName)}</pre>
            <button onClick={handleCopy} style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: '#393939', border: 'none', borderRadius: 4, padding: '0.35rem 0.6rem', cursor: 'pointer', color: 'white', fontSize: 12, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              {copied ? <><CheckIcon /> Copied</> : <><CopyIcon /> Copy</>}
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="pcw-btn pcw-ghost pcw-sm" onClick={() => setStep('creds')} style={{ boxShadow: 'none' }}>Back</button>
            <button className="pcw-btn pcw-primary pcw-sm" onClick={handleTest}>Test Connection</button>
          </div>
        </>)}

        {testing && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ width: 40, height: 40, border: '3px solid #e0e0e0', borderTopColor: '#0f62fe', borderRadius: '50%', margin: '0 auto 1rem', animation: 'pcw-spin 0.8s linear infinite' }} />
            <p style={{ margin: 0, fontSize: 14, color: '#525252' }}>Testing connection...</p>
          </div>
        )}

        {testResult && !testing && (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            {testResult.ok ? (<>
              <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: '#defbe6', color: '#198038', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <svg width="28" height="28" viewBox="0 0 16 16" fill="currentColor"><path d="M6.5 12.5l-4-4 1.4-1.4 2.6 2.6 5.6-5.6 1.4 1.4z"/></svg>
              </div>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: 18, fontWeight: 700 }}>Connected!</h3>
              <p style={{ margin: 0, fontSize: 13, color: '#525252' }}>Pin Comments is ready. Click anywhere to start.</p>
            </>) : (<>
              <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: '#fff1f1', color: '#da1e28', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}><CloseIcon /></div>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: 18, fontWeight: 700 }}>Connection Failed</h3>
              <p style={{ margin: '0 0 1rem', fontSize: 13, color: '#da1e28', backgroundColor: '#fff1f1', padding: '0.75rem', borderRadius: 6, textAlign: 'left' }}>{testResult.error}</p>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                <button className="pcw-btn pcw-ghost pcw-sm" onClick={() => { setTestResult(null); setStep('sql'); }} style={{ boxShadow: 'none' }}>Back to SQL</button>
                <button className="pcw-btn pcw-primary pcw-sm" onClick={handleTest}>Retry</button>
              </div>
            </>)}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Main Widget ──────────────────────────────────────────────────────────────

export function CommentWidget({
  supabaseUrl,
  supabaseAnonKey,
  tableName = 'pin_comments',
  storagePrefix = 'pin-comments:',
  position = 'bottom-right',
}: CommentWidgetProps) {

  // ── Setup state ──
  const [showSetup, setShowSetup] = useState(false);
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig | null>(() => {
    if (supabaseUrl && supabaseAnonKey) return { url: supabaseUrl, anonKey: supabaseAnonKey };
    try { const s = localStorage.getItem(`${storagePrefix}supabase-config`); if (s) return JSON.parse(s); } catch {}
    return null;
  });
  const [mode, setMode] = useState<'supabase' | 'local'>(() => {
    if (supabaseUrl && supabaseAnonKey) return 'supabase';
    try {
      if (localStorage.getItem(`${storagePrefix}mode`) === 'local') return 'local';
      if (localStorage.getItem(`${storagePrefix}supabase-config`)) return 'supabase';
    } catch {}
    return 'local';
  });
  const [hasSetup, setHasSetup] = useState<boolean>(() => {
    if (supabaseUrl && supabaseAnonKey) return true;
    try { return !!(localStorage.getItem(`${storagePrefix}supabase-config`) || localStorage.getItem(`${storagePrefix}mode`) === 'local'); } catch {}
    return false;
  });

  const api = supabaseConfig ? new CommentAPI(supabaseConfig, tableName) : null;

  // ── Comment state ──
  const [isActive, setIsActive] = useState(false);
  const [allComments, setAllComments] = useState<Comment[]>(() => {
    try { const c = localStorage.getItem(`${storagePrefix}comments-cache`); if (c) return JSON.parse(c); } catch {}
    return [];
  });
  const [selectedComment, setSelectedComment] = useState<string | null>(null);
  const [newPos, setNewPos] = useState<{ x: number; y: number } | null>(null);
  const [commentText, setCommentText] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pinsVisible, setPinsVisible] = useState(true);
  const [currentPage, setCurrentPage] = useState(window.location.pathname);

  // ── Author ──
  const [userName, setUserName] = useState<string>(() => localStorage.getItem(`${storagePrefix}user-name`) || '');
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [nameInput, setNameInput] = useState('');

  // ── Reply ──
  const [replyText, setReplyText] = useState('');

  const comments = allComments.filter(c => c.page === currentPage);

  // ── Effects ──
  useEffect(() => { localStorage.setItem(`${storagePrefix}comments-cache`, JSON.stringify(allComments)); }, [allComments, storagePrefix]);

  useEffect(() => {
    const check = () => { const p = window.location.pathname; if (p !== currentPage) { setCurrentPage(p); setIsActive(false); setShowSidebar(false); setSelectedComment(null); setNewPos(null); } };
    window.addEventListener('popstate', check);
    const i = setInterval(check, 100);
    return () => { window.removeEventListener('popstate', check); clearInterval(i); };
  }, [currentPage]);

  useEffect(() => {
    if (mode === 'supabase' && api) {
      api.fetchComments()
        .then(fetched => { setAllComments(prev => { const ids = new Set(fetched.map(c => c.id)); return [...fetched, ...prev.filter(c => !ids.has(c.id))]; }); })
        .catch(e => console.error('Pin Comments: fetch error', e))
        .finally(() => setIsLoading(false));
    } else { setIsLoading(false); }
  }, [mode, supabaseConfig]);

  useEffect(() => { if (!isActive) { setNewPos(null); setSelectedComment(null); } }, [isActive]);
  useEffect(() => { setReplyText(''); }, [selectedComment]);

  // ── Handlers ──
  const activate = () => {
    if (!hasSetup) { setShowSetup(true); return; }
    if (!userName) { setNameInput(''); setShowNamePrompt(true); return; }
    setIsActive(true); setShowSidebar(true);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!isActive) return;
    const t = e.target as HTMLElement;
    if (t.closest('.pcw-pin,.pcw-sidebar,.pcw-toggle,.pcw-popup')) return;
    setNewPos({ x: e.clientX + window.scrollX, y: e.clientY + window.scrollY });
    setCommentText('');
  };

  const addComment = async () => {
    if (!newPos || !commentText.trim()) return;
    const c: Comment = { id: Date.now().toString(), x: newPos.x, y: newPos.y, text: commentText.trim(), timestamp: new Date().toISOString(), page: currentPage, author: userName || undefined, replies: [] };
    setAllComments(prev => [...prev, c]); setNewPos(null); setCommentText(''); setShowSidebar(true);
    if (api) { try { await api.addComment(c); } catch (e) { console.error('Pin Comments: save error', e); } }
  };

  const deleteComment = async (id: string) => {
    const prev = allComments;
    setAllComments(allComments.filter(c => c.id !== id));
    if (selectedComment === id) setSelectedComment(null);
    if (api) { try { await api.deleteComment(id); } catch (e) { console.error('Pin Comments: delete error', e); setAllComments(prev); } }
  };

  const addReply = async (commentId: string) => {
    if (!replyText.trim()) return;
    const reply: Reply = { id: Date.now().toString(), text: replyText.trim(), author: userName || undefined, timestamp: new Date().toISOString() };
    const updated = allComments.map(c => c.id === commentId ? { ...c, replies: [...(c.replies || []), reply] } : c);
    setAllComments(updated); setReplyText('');
    if (api) { const cm = updated.find(c => c.id === commentId); if (cm) { try { await api.updateComment(commentId, { replies: cm.replies }); } catch (e) { console.error('Pin Comments: reply error', e); } } }
  };

  const deleteReply = async (commentId: string, replyId: string) => {
    const updated = allComments.map(c => c.id === commentId ? { ...c, replies: (c.replies || []).filter(r => r.id !== replyId) } : c);
    setAllComments(updated);
    if (api) { const cm = updated.find(c => c.id === commentId); if (cm) { try { await api.updateComment(commentId, { replies: cm.replies }); } catch (e) { console.error('Pin Comments: reply delete error', e); } } }
  };

  const saveName = () => {
    if (!nameInput.trim()) return;
    setUserName(nameInput.trim()); localStorage.setItem(`${storagePrefix}user-name`, nameInput.trim());
    setShowNamePrompt(false); setIsActive(true); setShowSidebar(true);
  };

  const onSetupDone = (config: SupabaseConfig | null) => {
    if (config) { setSupabaseConfig(config); setMode('supabase'); } else { setMode('local'); }
    setHasSetup(true); setShowSetup(false);
    if (!userName) { setNameInput(''); setShowNamePrompt(true); } else { setIsActive(true); setShowSidebar(true); }
  };

  const resetSetup = () => {
    localStorage.removeItem(`${storagePrefix}supabase-config`);
    localStorage.removeItem(`${storagePrefix}mode`);
    setSupabaseConfig(null); setMode('local'); setHasSetup(false); setShowSetup(true);
  };

  const fabPos = position === 'bottom-left' ? { bottom: '2rem', left: '2rem' } : { bottom: '2rem', right: '2rem' };
  const font: React.CSSProperties = { fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" };

  return (
    <>
      <style>{STYLES}</style>

      {showSetup && <SetupWizard storagePrefix={storagePrefix} tableName={tableName} onComplete={onSetupDone} onCancel={() => setShowSetup(false)} />}

      {isActive && <div onClick={handleClick} style={{ position: 'fixed', inset: 0, zIndex: 9998, cursor: 'crosshair', pointerEvents: 'all' }} />}

      {/* FAB */}
      <div className="pcw-toggle" style={{ position: 'fixed', ...fabPos, zIndex: 10001 }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {hasSetup && (
            <button className="pcw-btn pcw-ghost pcw-icon" onClick={resetSetup} title="Storage settings" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)', backgroundColor: 'white' }}><GearIcon /></button>
          )}
          {comments.length > 0 && (
            <button className="pcw-btn pcw-secondary pcw-icon" onClick={() => setPinsVisible(!pinsVisible)} title={pinsVisible ? 'Hide pins' : 'Show pins'}>
              {pinsVisible ? <ViewOffIcon /> : <ViewIcon />}
            </button>
          )}
          <button className={`pcw-btn ${isActive ? 'pcw-primary' : 'pcw-tertiary'}`} onClick={e => { e.stopPropagation(); isActive ? setIsActive(false) : activate(); }} style={{ pointerEvents: 'auto' }}>
            <ChatIcon /> {isActive ? 'Exit Comment Mode' : 'Add Comments'}
          </button>
        </div>
      </div>

      {/* Pins + popup container */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9999 }}>
        {pinsVisible && comments.map((c, i) => (
          <div key={c.id} className="pcw-pin" onClick={e => { e.stopPropagation(); setSelectedComment(c.id); setShowSidebar(true); }}
            style={{ position: 'absolute', left: `${c.x}px`, top: `${c.y}px`, transform: 'translate(-50%,-50%)', zIndex: 9999, width: 32, height: 32, borderRadius: '50%', backgroundColor: selectedComment === c.id ? '#da1e28' : '#0f62fe', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 14, cursor: 'pointer', border: '2px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', transition: 'all 0.2s', pointerEvents: 'auto' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translate(-50%,-50%) scale(1.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translate(-50%,-50%) scale(1)'; }}>
            {i + 1}
          </div>
        ))}

        {newPos && (
          <div className="pcw-popup" onClick={e => e.stopPropagation()} style={{ position: 'absolute', left: `${newPos.x}px`, top: `${newPos.y}px`, transform: 'translate(-50%,-100%) translateY(-20px)', zIndex: 10000, backgroundColor: 'white', border: '1px solid #e0e0e0', borderRadius: 8, padding: '1rem', minWidth: 300, boxShadow: '0 4px 16px rgba(0,0,0,0.2)', pointerEvents: 'auto', ...font }}>
            <div style={{ marginBottom: '0.5rem', fontWeight: 'bold', fontSize: 14 }}>Add Comment</div>
            <textarea className="pcw-input" placeholder="Enter your comment..." value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && commentText.trim()) { e.preventDefault(); addComment(); } }} rows={3} style={{ marginBottom: '0.75rem', resize: 'vertical' }} autoFocus />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button className="pcw-btn pcw-secondary pcw-sm" onClick={() => { setNewPos(null); setCommentText(''); }}>Cancel</button>
              <button className="pcw-btn pcw-primary pcw-sm" onClick={addComment} disabled={!commentText.trim()}>Add Comment</button>
            </div>
            <div style={{ position: 'absolute', left: '50%', bottom: -28, transform: 'translateX(-50%)', width: 24, height: 24, borderRadius: '50%', backgroundColor: '#0f62fe', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 12, border: '2px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>{comments.length + 1}</div>
          </div>
        )}
      </div>

      {/* Sidebar */}
      {showSidebar && (comments.length > 0 || isActive) && (
        <div className="pcw-sidebar" onClick={e => e.stopPropagation()} style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 350, backgroundColor: 'white', borderLeft: '1px solid #e0e0e0', zIndex: 10000, overflowY: 'auto', boxShadow: '-4px 0 16px rgba(0,0,0,0.1)', ...font }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 'bold' }}>Comments ({comments.length})</h3>
              <p style={{ margin: '0.25rem 0 0', fontSize: 12, color: '#525252' }}>{isActive ? 'Click anywhere to add a comment' : 'Enable comment mode to add more'}</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {comments.length > 0 && <button className="pcw-btn pcw-ghost pcw-icon pcw-sm" onClick={() => setPinsVisible(!pinsVisible)} title={pinsVisible ? 'Hide' : 'Show'}>{pinsVisible ? <ViewOffIcon /> : <ViewIcon />}</button>}
              <button className="pcw-btn pcw-ghost pcw-icon pcw-sm" onClick={() => setShowSidebar(false)} title="Close"><CloseIcon /></button>
            </div>
          </div>

          <div style={{ padding: '1rem' }}>
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#525252' }}><div style={{ marginBottom: '1rem', opacity: 0.3 }}><ChatIcon /></div><p>Loading...</p></div>
            ) : comments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#525252' }}><div style={{ marginBottom: '1rem', opacity: 0.3 }}><ChatIcon /></div><p>No comments yet.</p><p style={{ fontSize: 14 }}>{isActive ? 'Click anywhere to add your first!' : 'Enable comment mode to start.'}</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {comments.map((c, i) => {
                  const sel = selectedComment === c.id;
                  const rc = c.replies?.length || 0;
                  return (
                    <div key={c.id} onClick={() => setSelectedComment(sel ? null : c.id)} style={{ padding: sel ? '1rem' : '0.75rem', backgroundColor: sel ? '#e5f6ff' : '#f4f4f4', border: `1px solid ${sel ? '#0f62fe' : '#e0e0e0'}`, borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s' }}>
                      <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem' }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: sel ? '#da1e28' : '#0f62fe', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 12, flexShrink: 0 }}>{i + 1}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {sel ? (<>
                            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>{c.text}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                              {c.author && <span style={{ fontSize: 12, color: '#525252', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><UserIcon /> {c.author}</span>}
                              <span style={{ fontSize: 12, color: '#8d8d8d' }}>{new Date(c.timestamp).toLocaleString()}</span>
                            </div>
                          </>) : (<>
                            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.text}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                              {c.author && <span style={{ fontSize: 11, color: '#525252', display: 'flex', alignItems: 'center', gap: '0.2rem' }}><UserIcon /> {c.author}</span>}
                              {rc > 0 && <span style={{ fontSize: 11, color: '#0f62fe', display: 'flex', alignItems: 'center', gap: '0.2rem', fontWeight: 500 }}><ReplyIcon /> {rc} {rc === 1 ? 'reply' : 'replies'}</span>}
                            </div>
                          </>)}
                        </div>
                        <button className="pcw-btn pcw-ghost pcw-icon pcw-sm" onClick={e => { e.stopPropagation(); deleteComment(c.id); }} title="Delete" style={{ flexShrink: 0 }}><TrashIcon /></button>
                      </div>

                      {sel && (<>
                        {rc > 0 && (
                          <div style={{ marginTop: '0.75rem', marginLeft: '2.25rem', borderLeft: '2px solid #d0d0d0', paddingLeft: '0.75rem' }}>
                            {c.replies!.map(r => (
                              <div key={r.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'start', gap: '0.5rem' }}>
                                <div style={{ flex: 1 }}>
                                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>{r.text}</p>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                                    {r.author && <span style={{ fontSize: 11, color: '#525252', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><UserIcon /> {r.author}</span>}
                                    <span style={{ fontSize: 11, color: '#8d8d8d' }}>{new Date(r.timestamp).toLocaleString()}</span>
                                  </div>
                                </div>
                                <button className="pcw-btn pcw-ghost pcw-icon pcw-sm" onClick={e => { e.stopPropagation(); deleteReply(c.id, r.id); }} title="Delete reply" style={{ flexShrink: 0, padding: '0.25rem' }}><TrashIcon /></button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div style={{ marginTop: '0.5rem', marginLeft: '2.25rem', paddingLeft: '0.75rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                            <textarea className="pcw-input" placeholder="Reply..." value={replyText} onChange={e => setReplyText(e.target.value)} onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && replyText.trim()) { e.preventDefault(); addReply(c.id); } }} rows={1} style={{ flex: 1, fontSize: 13, padding: '0.5rem', resize: 'none' }} />
                            <button className="pcw-btn pcw-primary pcw-sm" onClick={e => { e.stopPropagation(); addReply(c.id); }} disabled={!replyText.trim()} style={{ flexShrink: 0, padding: '0.5rem 0.75rem' }}>Reply</button>
                          </div>
                        </div>
                      </>)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Name prompt */}
      {showNamePrompt && (<>
        <div onClick={() => setShowNamePrompt(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 10001 }} />
        <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 10002, backgroundColor: 'white', border: '1px solid #e0e0e0', borderRadius: 12, padding: '1.5rem', minWidth: 340, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', ...font }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}><UserIcon /><span style={{ fontWeight: 'bold', fontSize: 16 }}>What's your name?</span></div>
          <p style={{ margin: '0 0 1rem', fontSize: 13, color: '#525252' }}>Your name will appear on comments you leave.</p>
          <input className="pcw-input" placeholder="Enter your name..." value={nameInput} onChange={e => setNameInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && nameInput.trim()) saveName(); }} autoFocus style={{ marginBottom: '1rem' }} />
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button className="pcw-btn pcw-secondary pcw-sm" onClick={() => setShowNamePrompt(false)}>Cancel</button>
            <button className="pcw-btn pcw-primary pcw-sm" onClick={saveName} disabled={!nameInput.trim()}>Continue</button>
          </div>
        </div>
      </>)}
    </>
  );
}
