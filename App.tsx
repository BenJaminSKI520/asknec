import React, { useState, useRef, useEffect } from 'react';
import './style.css';

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

const SYSTEM_PROMPT = `You are an expert NEC (National Electrical Code) assistant for electricians, contractors, and engineers. Answer code questions clearly, accurately, and in plain English.

RULES — follow on every response:
1. NEVER reproduce verbatim NEC text. Always paraphrase in your own words.
2. ALWAYS cite the specific NEC article and section (e.g. Article 210.52, Table 300.5, Section 230.79(C)).
3. Lead with the direct practical answer. Follow with the code basis.
4. Keep it field-practical.
5. If the answer varies by jurisdiction, say so clearly.
6. For safety-critical topics, remind the user to verify with their AHJ.

End every response with these two lines:
CITATIONS: [comma-separated list of all NEC articles/sections referenced]
DISCLAIMER: [one sentence reminding them to verify with their local AHJ]`;

type Message = {
  role: 'user' | 'assistant';
  content: string;
  citations?: string[];
  disclaimer?: string;
};

function parseCitations(text: string) {
  const citMatch = text.match(/CITATIONS:\s*(.+)/i);
  const discMatch = text.match(/DISCLAIMER:\s*(.+)/i);
  const cleanText = text.replace(/CITATIONS:.*$/im,'').replace(/DISCLAIMER:.*$/im,'').trim();
  const citations = citMatch ? citMatch[1].split(',').map(c=>c.trim()).filter(Boolean) : [];
  const disclaimer = discMatch ? discMatch[1].trim() : null;
  return { cleanText, citations, disclaimer };
}

function Landing({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="landing">
      <nav className="nav">
        <div className="nav-brand">
          <span className="bolt">⚡</span>
          <span className="brand-name">AskNEC</span>
        </div>
        <button className="btn-primary" onClick={onEnter}>Try it free</button>
      </nav>
      <section className="hero">
        <div className="hero-badge">NEC 2023 · All 50 States</div>
        <h1>NEC code answers<br/>in plain English</h1>
        <p className="hero-sub">Cited to the article. Built for electricians.<br/>No more digging through 1,000 pages of codebook.</p>
        <button className="btn-primary btn-lg" onClick={onEnter}>Try free — no account needed →</button>
        <p className="hero-note">10 free questions/month · No credit card required</p>
      </section>
      <section className="features">
        <div className="feature-card">
          <div className="feat-icon">📖</div>
          <h3>Plain-language answers</h3>
          <p>Clear answers you can act on in the field, right now. No legal jargon.</p>
        </div>
        <div className="feature-card">
          <div className="feat-icon">📍</div>
          <h3>State jurisdiction aware</h3>
          <p>Knows which NEC edition your state adopted and local amendments.</p>
        </div>
        <div className="feature-card">
          <div className="feat-icon">🔗</div>
          <h3>Cited to the article</h3>
          <p>Every answer includes the specific NEC article so you can verify with your AHJ.</p>
        </div>
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
              <li className="no">State jurisdiction support</li>
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
              <li className="yes">All 50 states + local codes</li>
              <li className="yes">Conversation history</li>
              <li className="yes">Inspection prep checklists</li>
              <li className="yes">Priority support</li>
            </ul>
            <button className="btn-primary" onClick={onEnter}>Start free trial</button>
          </div>
        </div>
      </section>
      <footer className="footer">
        <span>© 2026 AskNEC · Built for the trades</span>
        <span>Always verify with your local AHJ</span>
      </footer>
    </div>
  );
}

function ApiKeySetup({ onSubmit }: { onSubmit: (key: string) => void }) {
  const [key, setKey] = useState('');
  const valid = key.startsWith('sk-ant-') || key.startsWith('sk-');
  return (
    <div className="setup-screen">
      <div className="setup-card">
        <div className="setup-icon">🔑</div>
        <h2>Connect your Anthropic API key</h2>
        <p>Paste your Anthropic API key below to power the AI answers. Get yours free at <a href="https://platform.anthropic.com" target="_blank" rel="noreferrer">platform.anthropic.com</a></p>
        <input type="password" placeholder="sk-ant-..." value={key} onChange={e=>setKey(e.target.value)} className="key-input" />
        <button className="btn-primary btn-lg" onClick={()=>valid&&onSubmit(key)} disabled={!valid}>
          Save and continue →
        </button>
        <p className="key-note">Your key is stored only in this browser session and never shared anywhere except Anthropic's API.</p>
      </div>
    </div>
  );
}

function ChatApp({ apiKey, onBack }: { apiKey: string; onBack: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [jurisdiction, setJurisdiction] = useState('National (NEC 2023)');
  const [used, setUsed] = useState(0);
  const FREE_LIMIT = 10;
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const ask = async (question: string) => {
    if (!question.trim() || loading || used >= FREE_LIMIT) return;
    const userMsg: Message = { role: 'user', content: question.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);
    setUsed(n => n + 1);
    try {
      const sys = SYSTEM_PROMPT + `\n\nJurisdiction: ${jurisdiction}. Factor this into your response where relevant.`;
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, system: sys, messages: next.map(m=>({role:m.role,content:m.content})) })
      });
      const data = await res.json();
      const raw = data.content?.find((b:any)=>b.type==='text')?.text || 'No response — check your API key.';
      const { cleanText, citations, disclaimer } = parseCitations(raw);
      setMessages(prev=>[...prev,{ role:'assistant', content:cleanText, citations, disclaimer: disclaimer||undefined }]);
    } catch {
      setMessages(prev=>[...prev,{ role:'assistant', content:'Connection error — please try again.' }]);
    }
    setLoading(false);
  };

  const atLimit = used >= FREE_LIMIT;
  const remaining = FREE_LIMIT - used;

  return (
    <div className="chat-layout">
      <div className="chat-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="nav-brand">
          <span className="bolt">⚡</span>
          <span className="brand-name">AskNEC</span>
        </div>
        <select className="jurisdiction-select" value={jurisdiction} onChange={e=>setJurisdiction(e.target.value)}>
          {STATES.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className={`usage-bar ${atLimit ? 'at-limit' : ''}`}>
        {atLimit
          ? <span>🔒 Free limit reached — <strong>upgrade to Pro</strong> for unlimited questions</span>
          : <span>{remaining} free question{remaining===1?'':'s'} remaining this month</span>
        }
      </div>

      <div className="messages-area">
        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-bolt">⚡</div>
            <h2>Ask any NEC code question</h2>
            <p>Get plain-English answers cited to specific articles and sections.</p>
            <div className="suggestions-grid">
              {SUGGESTIONS.map(s=>(
                <button key={s} className="suggest-chip" onClick={()=>ask(s)}>{s}</button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((m,i)=>(
              <div key={i} className={`message ${m.role}`}>
                <div className="bubble">{m.content}</div>
                {m.citations && m.citations.length > 0 && (
                  <div className="citations">
                    {m.citations.map((c,j)=><span key={j} className="cite-pill">{c}</span>)}
                  </div>
                )}
                {m.disclaimer && <div className="disclaimer">{m.disclaimer}</div>}
              </div>
            ))}
            {loading && (
              <div className="message assistant">
                <div className="bubble typing-indicator">
                  <span/><span/><span/>
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </>
        )}
      </div>

      <div className="input-area">
        <textarea
          value={input}
          onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();ask(input);} }}
          placeholder={atLimit ? 'Upgrade to Pro to continue...' : 'Ask a code question... (Enter to send)'}
          disabled={atLimit || loading}
          rows={2}
        />
        <button className="send-btn" onClick={()=>ask(input)} disabled={atLimit||loading||!input.trim()}>
          {loading ? '···' : 'Ask →'}
        </button>
      </div>
    </div>
  );
}

type Screen = 'landing' | 'setup' | 'app';

export default function App() {
  const [screen, setScreen] = useState<Screen>('landing');
  const [apiKey, setApiKey] = useState('');

  const handleEnter = () => setScreen(apiKey ? 'app' : 'setup');
  const handleKey = (key: string) => { setApiKey(key); setScreen('app'); };

  if (screen === 'landing') return <Landing onEnter={handleEnter} />;
  if (screen === 'setup') return <ApiKeySetup onSubmit={handleKey} />;
  return <ChatApp apiKey={apiKey} onBack={()=>setScreen('landing')} />;
}
