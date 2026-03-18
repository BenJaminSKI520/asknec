import React, { useState, useRef, useEffect } from 'react';
import './style.css';

const SUPABASE_URL = 'https://wcpqqzdpohgqzkoqwwqi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_QJVIyQdf7GmUeP8XkCfkbA_gazLemtc';
const EDGE_FN = SUPABASE_URL + '/functions/v1/nec-assistant';
const STRIPE_MONTHLY = 'https://buy.stripe.com/00w5kDdRw1Zu9dt36h5Vu02';
const STRIPE_ANNUAL = 'https://buy.stripe.com/aFa14n7t86fKb1BgX75Vu01';

const STATES = [
  "National (NEC 2023)","Alabama (2020 NEC)","Alaska (2020 NEC)",
  "Arizona (2017 NEC)","Arkansas (2020 NEC)","California (2022 Title 24)",
  "Colorado (2020 NEC)","Connecticut (2020 NEC)","Delaware (2020 NEC)",
  "Florida (2020 NEC)","Georgia (2020 NEC)","Hawaii (2020 NEC)",
  "Idaho (2020 NEC)","Illinois (2023 NEC)","Indiana (2017 NEC)",
  "Iowa (2020 NEC)","Kansas (2020 NEC)","Kentucky (2020 NEC)",
  "Louisiana (2020 NEC)","Maine (2020 NEC)","Maryland (2020 NEC)",
  "Massachusetts (2020 NEC)","Michigan (2015 NEC)","Minnesota (2020 NEC)",
  "Mississippi (2014 NEC)","Missouri (2020 NEC)","Montana (2017 NEC)",
  "Nebraska (2020 NEC)","Nevada (2020 NEC)","New Hampshire (2020 NEC)",
  "New Jersey (2017 NEC)","New Mexico (2020 NEC)","New York (2020 NEC)",
  "North Carolina (2020 NEC)","North Dakota (2020 NEC)","Ohio (2017 NEC)",
  "Oklahoma (2020 NEC)","Oregon (2021 NEC)","Pennsylvania (2014 NEC)",
  "Rhode Island (2020 NEC)","South Carolina (2020 NEC)","South Dakota (2020 NEC)",
  "Tennessee (2020 NEC)","Texas (2020 NEC)","Utah (2020 NEC)",
  "Vermont (2020 NEC)","Virginia (2020 NEC)","Washington (2023 NEC)",
  "West Virginia (2020 NEC)","Wisconsin (2017 NEC)","Wyoming (2020 NEC)",
  "Chicago (Local Code)","New York City (Local Code)"
];

const SUGGESTIONS = [
  "Minimum burial depth for PVC conduit in a driveway?",
  "AFCI requirements for bedroom circuits?",
  "Working clearance in front of a 200A panel?",
  "Can I use THHN wire in a wet location conduit?",
  "Receptacle spacing rules for kitchen counters?",
  "Max breaker size for 12 AWG wire?",
  "Grounding requirements for a detached garage?",
  "EV charger dedicated circuit requirements?"
];

type Message = { role:'user'|'assistant'; content:string; citations?:string[]; disclaimer?:string; };

function parseCitations(text:string) {
  const citMatch = text.match(/CITATIONS:\s*(.+)/i);
  const discMatch = text.match(/DISCLAIMER:\s*(.+)/i);
  const cleanText = text.replace(/CITATIONS:.*$/im,'').replace(/DISCLAIMER:.*$/im,'').trim();
  const citations = citMatch ? citMatch[1].split(',').map((c:string)=>c.trim()).filter(Boolean) : [];
  const disclaimer = discMatch ? discMatch[1].trim() : null;
  return { cleanText, citations, disclaimer };
}

function renderMarkdown(text:string): React.ReactNode[] {
  return text.split('\n').map((line,i) => {
    const parts = line.replace(/\*\*(.+?)\*\*/g,'BOLDSTART$1BOLDEND').split(/(BOLDSTART|BOLDEND)/);
    const nodes: React.ReactNode[] = [];
    let bold = false;
    parts.forEach((p,j) => {
      if (p === 'BOLDSTART') { bold = true; return; }
      if (p === 'BOLDEND') { bold = false; return; }
      if (p) nodes.push(bold ? React.createElement('strong',{key:j},p) : p);
    });
    return React.createElement('p',{key:i,style:{margin:'0 0 6px'}}, ...nodes);
  });
}

async function sbRequest(path:string, opts:any={}, token?:string) {
  const headers:any = { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(SUPABASE_URL + path, { ...opts, headers: { ...headers, ...opts.headers } });
  return res.json();
}

function AuthScreen({ onAuth }:{ onAuth:(s:any)=>void }) {
  const [mode, setMode] = useState<'login'|'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const submit = async () => {
    if (!email||!password) { setError('Enter email and password'); return; }
    setLoading(true); setError(''); setMsg('');
    try {
      if (mode==='signup') {
        const d = await sbRequest('/auth/v1/signup',{ method:'POST', body:JSON.stringify({ email, password }) });
        if (d.error) throw new Error(d.error.message||d.msg);
        setMsg('Check your email to confirm your account, then log in.');
      } else {
        const d = await sbRequest('/auth/v1/token?grant_type=password',{ method:'POST', body:JSON.stringify({ email, password }) });
        if (d.error||d.error_description) throw new Error(d.error_description||d.error);
        onAuth(d);
      }
    } catch(e:any) { setError(e.message||'Something went wrong'); }
    setLoading(false);
  };

  return (
    <div className="setup-screen">
      <div className="setup-card">
        <div className="setup-icon">AskNEC</div>
        <h2>{mode==='login'?'Welcome back':'Create your account'}</h2>
        <p>{mode==='login'?'Log in to AskNEC.':'Get 10 free NEC questions per month.'}</p>
        {error && <div className="auth-error">{error}</div>}
        {msg && <div className="auth-success">{msg}</div>}
        <input type="email" placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)} className="key-input"/>
        <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} className="key-input" onKeyDown={e=>e.key==='Enter'&&submit()}/>
        <button className="btn-primary btn-lg" onClick={submit} disabled={loading}>
          {loading?'Please wait...':(mode==='login'?'Log in':'Create account')}
        </button>
        <p className="key-note">
          {mode==='login'?"No account? ":"Have an account? "}
          <button className="link-btn" onClick={()=>{setMode(mode==='login'?'signup':'login');setError('');setMsg('');}}>
            {mode==='login'?'Sign up free':'Log in'}
          </button>
        </p>
      </div>
    </div>
  );
}

function Landing({ onEnter }:{ onEnter:()=>void }) {
  return (
    <div className="landing">
      <nav className="nav">
        <div className="nav-brand"><span className="bolt">&#x26A1;</span><span className="brand-name">AskNEC</span></div>
        <button className="btn-primary" onClick={onEnter}>Try it free</button>
      </nav>
      <section className="hero">
        <div className="hero-badge">NEC 2023 - All 50 States</div>
        <h1>NEC code answers in plain English</h1>
        <p className="hero-sub">Cited to the article. Built for electricians. No more digging through 1,000 pages of codebook.</p>
        <button className="btn-primary btn-lg" onClick={onEnter}>Try free - no account needed</button>
        <p className="hero-note">10 free questions per month. No credit card required.</p>
      </section>
      <section className="features">
        <div className="feature-card"><div className="feat-icon">&#x1F4D6;</div><h3>Plain-language answers</h3><p>Clear answers you can act on in the field, right now.</p></div>
        <div className="feature-card"><div className="feat-icon">&#x1F4CD;</div><h3>State jurisdiction aware</h3><p>Knows which NEC edition your state adopted.</p></div>
        <div className="feature-card"><div className="feat-icon">&#x1F517;</div><h3>Cited to the article</h3><p>Every answer includes the specific NEC article to verify with your AHJ.</p></div>
      </section>
      <section className="pricing-section">
        <h2>Simple pricing</h2>
        <div className="pricing-grid">
          <div className="pricing-card">
            <div className="plan-name">Free</div>
            <div className="plan-price">$0<span>/mo</span></div>
            <ul className="plan-features">
              <li className="yes">10 questions per month</li>
              <li className="yes">National NEC 2023</li>
              <li className="yes">Cited answers</li>
              <li className="no">All state jurisdictions</li>
              <li className="no">Conversation history</li>
            </ul>
            <button className="btn-outline" onClick={onEnter}>Get started free</button>
          </div>
          <div className="pricing-card featured">
            <div className="featured-badge">Most popular</div>
            <div className="plan-name">Pro</div>
            <div className="plan-price">$29<span>/mo</span></div>
            <ul className="plan-features">
              <li className="yes">Unlimited questions</li>
              <li className="yes">All 50 states plus local codes</li>
              <li className="yes">Conversation history</li>
              <li className="yes">Inspection prep checklists</li>
              <li className="yes">Priority support</li>
            </ul>
            <button className="btn-primary" onClick={()=>window.open(STRIPE_MONTHLY,'_blank')}>Monthly - $29/mo</button>
            <button className="btn-outline" style={{marginTop:'8px',width:'100%'}} onClick={()=>window.open(STRIPE_ANNUAL,'_blank')}>Annual - $199/yr (save $149)</button>
          </div>
        </div>
      </section>
      <footer className="footer">
        <span>2026 AskNEC - Built for the trades</span>
        <span>Always verify with your local AHJ</span>
      </footer>
    </div>
  );
}

function ChatApp({ session, onSignOut }:{ session:any; onSignOut:()=>void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [jurisdiction, setJurisdiction] = useState('National (NEC 2023)');
  const [used, setUsed] = useState(0);
  const [plan, setPlan] = useState('free');
  const FREE_LIMIT = 10;
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (session?.access_token) {
      sbRequest('/rest/v1/profiles?select=questions_used,plan', {}, session.access_token)
        .then((d:any) => { if (d[0]) { setUsed(d[0].questions_used||0); setPlan(d[0].plan||'free'); } });
    }
  }, [session]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages, loading]);

  const ask = async (question:string) => {
    if (!question.trim()||loading) return;
    if (plan==='free'&&used>=FREE_LIMIT) return;
    const userMsg:Message = { role:'user', content:question.trim() };
    const next = [...messages, userMsg];
    setMessages(next); setInput(''); setLoading(true);
    try {
      const headers:any = { 'Content-Type':'application/json' };
      if (session?.access_token) headers['Authorization'] = 'Bearer ' + session.access_token;
      const res = await fetch(EDGE_FN, { method:'POST', headers, body:JSON.stringify({ messages:next.map((m:Message)=>({role:m.role,content:m.content})), jurisdiction }) });
      const data = await res.json();
      if (res.status===403&&data.error==='limit_reached') {
        setMessages(prev=>[...prev,{ role:'assistant', content:'You reached your 10 free questions this month. Upgrade to Pro for unlimited access.' }]);
        setLoading(false); return;
      }
      const raw = data.content?.find((b:any)=>b.type==='text')?.text||'No response.';
      const { cleanText, citations, disclaimer } = parseCitations(raw);
      setMessages(prev=>[...prev,{ role:'assistant', content:cleanText, citations, disclaimer:disclaimer||undefined }]);
      setUsed((u:number)=>u+1);
    } catch { setMessages(prev=>[...prev,{ role:'assistant', content:'Connection error. Please try again.' }]); }
    setLoading(false);
  };

  const atLimit = plan==='free'&&used>=FREE_LIMIT;
  const remaining = FREE_LIMIT-used;

  return (
    <div className="chat-layout">
      <div className="chat-header">
        <div className="nav-brand"><span className="bolt">&#x26A1;</span><span className="brand-name">AskNEC</span></div>
        <select className="jurisdiction-select" value={jurisdiction} onChange={e=>setJurisdiction(e.target.value)}>
          {STATES.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <button className="sign-out-btn" onClick={onSignOut}>Sign out</button>
      </div>
      <div className={"usage-bar"+(atLimit?' at-limit':'')}>
        {plan==='pro'
          ? <span>Pro - unlimited questions</span>
          : atLimit
            ? <span>Free limit reached. <a href={STRIPE_MONTHLY} target="_blank" rel="noreferrer" className="upgrade-link">Monthly $29</a> or <a href={STRIPE_ANNUAL} target="_blank" rel="noreferrer" className="upgrade-link">Annual $199</a></span>
            : <span>{remaining} free question{remaining===1?'':'s'} left. <a href={STRIPE_MONTHLY} target="_blank" rel="noreferrer" className="upgrade-link">Upgrade to Pro</a></span>
        }
      </div>
      <div className="messages-area">
        {messages.length===0 ? (
          <div className="empty-state">
            <div className="empty-bolt">&#x26A1;</div>
            <h2>Ask any NEC code question</h2>
            <p>Get plain-English answers cited to specific articles and sections.</p>
            <div className="suggestions-grid">
              {SUGGESTIONS.map(s=><button key={s} className="suggest-chip" onClick={()=>ask(s)}>{s}</button>)}
            </div>
          </div>
        ) : (
          <>
            {messages.map((m:Message,i:number)=>(
              <div key={i} className={"message "+m.role}>
                <div className="bubble">{m.role==='assistant'?renderMarkdown(m.content):m.content}</div>
                {m.citations&&m.citations.length>0&&<div className="citations">{m.citations.map((c:string,j:number)=><span key={j} className="cite-pill">{c}</span>)}</div>}
                {m.disclaimer&&<div className="disclaimer">{m.disclaimer}</div>}
              </div>
            ))}
            {loading&&<div className="message assistant"><div className="bubble typing-indicator"><span/><span/><span/></div></div>}
            <div ref={bottomRef}/>
          </>
        )}
      </div>
      <div className="input-area">
        <textarea value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();ask(input);} }}
          placeholder={atLimit?'Upgrade to Pro to continue...':'Ask a code question... (Enter to send)'}
          disabled={atLimit||loading} rows={2}/>
        <button className="send-btn" onClick={()=>ask(input)} disabled={atLimit||loading||!input.trim()}>
          {loading?'...':'Ask'}
        </button>
      </div>
    </div>
  );
}

type Screen = 'landing'|'auth'|'app';

export default function App() {
  const [screen, setScreen] = useState<Screen>('landing');
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem('asknec_session');
    if (stored) { try { const s = JSON.parse(stored); setSession(s); setScreen('app'); } catch{} }
  }, []);

  const handleAuth = (s:any) => { setSession(s); localStorage.setItem('asknec_session',JSON.stringify(s)); setScreen('app'); };
  const handleSignOut = () => { setSession(null); localStorage.removeItem('asknec_session'); setScreen('landing'); };

  if (screen==='landing') return <Landing onEnter={()=>setScreen('auth')}/>;
  if (screen==='auth') return <AuthScreen onAuth={handleAuth}/>;
  return <ChatApp session={session} onSignOut={handleSignOut}/>;
}