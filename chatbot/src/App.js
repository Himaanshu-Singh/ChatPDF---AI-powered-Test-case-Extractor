import React, { useEffect, useMemo, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const THEME_KEY = 'theme-mode';
const API_BASE = 'http://localhost:5000';

function App() {
  const [pdfText, setPdfText] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'dark');
  const [copiedIndex, setCopiedIndex] = useState(null);

  // 🔹 Typing queue and timer
  const typingQueue = useRef([]);
  const typingTimer = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.style.height = '100%';
    document.body.style.height = '100%';
    document.body.style.margin = '0';
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));

  const safeJson = async (res) => {
    try { return await res.json(); } catch { return null; }
  };

  const handlePdfUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch(`${API_BASE}/upload_pdf`, { method: 'POST', body: formData });
      const data = await safeJson(response);
      if (!response.ok) throw new Error((data && data.error) || 'Failed to upload PDF');
      setPdfText(data.extracted_text || '');
    } catch (err) {
      console.error(err);
      alert('Error uploading PDF: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Send query with smooth typing effect
  const sendQueryStream = async () => {
    if (!userQuery.trim() || !pdfText) return;

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/chat_stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userQuery, pdf_text: pdfText }),
      });

      if (!response.body) throw new Error('No stream body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      const newEntry = { user: userQuery, raw: '', cases: [] };
      setChatHistory(prev => [newEntry, ...prev]);
      setUserQuery('');

      const idx = 0; // newest at index 0

      // read chunks and enqueue them for typing
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        typingQueue.current.push(...chunk); // push characters into queue
      }

      // start typing effect if not already running
      if (!typingTimer.current) {
        typingTimer.current = setInterval(() => {
          if (typingQueue.current.length === 0) {
            clearInterval(typingTimer.current);
            typingTimer.current = null;
            setLoading(false);
            return;
          }
          const nextChar = typingQueue.current.shift();
          setChatHistory(prev => {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], raw: updated[idx].raw + nextChar };
            return updated;
          });
        }, 30); // typing speed (ms per character)
      }
    } catch (err) {
      console.error(err);
      alert('Streaming error: ' + err.message);
      setLoading(false);
    }
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text || '');
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const styles = useMemo(() => {
    const dark = theme === 'dark';
    const colors = {
      bg: dark ? '#0b0d12' : '#f6f7fb',
      header: dark ? '#0e1117' : '#ffffff',
      card: dark ? '#141925' : '#ffffff',
      text: dark ? '#e6ebf4' : '#24292f',
      subtext: dark ? '#a6b0bf' : '#6a737d',
      border: dark ? '#273043' : '#d0d7de',
      accent: dark ? '#8ab4f8' : '#0969da',
      inputBg: dark ? '#0f141d' : '#ffffff',
      codeBg: dark ? '#0e1117' : '#f6f8fa',
      stripe: dark ? '#0f141b' : '#fafbfc',
      bubble: dark ? '#0f1218' : '#f3f5f9',
    };

    return {
      root: { minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bg, color: colors.text },
      header: { position: 'sticky', top: 0, zIndex: 10, background: colors.header, borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', padding: '10px 16px' },
      brand: { fontWeight: 800, fontSize: 18 },
      toggle: { background: colors.card, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: 10, padding: '8px 12px', cursor: 'pointer' },
      main: { flex: 1, display: 'grid', gridTemplateColumns: '1fr', gap: 16, padding: 16 },
      mainWide: { gridTemplateColumns: '1fr 1.2fr' },
      leftPanel: { display: 'flex', flexDirection: 'column', gap: 16 },
      rightPanel: { display: 'flex', flexDirection: 'column', gap: 12 },
      card: { background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 14, padding: 14 },
      stretchCard: { background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 14, padding: 14, flex: 1, display: 'flex', flexDirection: 'column' },
      textarea: { flex: 1, resize: 'none', padding: 12, borderRadius: 12, border: `1px solid ${colors.border}`, background: colors.inputBg, color: colors.text },
      queryRow: { display: 'flex', gap: 8 },
      query: { flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${colors.border}`, background: colors.inputBg, color: colors.text },
      send: (disabled) => ({ padding: '12px 16px', borderRadius: 12, border: `1px solid ${colors.accent}`, background: disabled ? colors.border : colors.accent, color: dark ? '#0b0f14' : '#ffffff', fontWeight: 800, cursor: disabled ? 'not-allowed' : 'pointer' }),
      history: { flex: 1, overflow: 'auto', border: `1px solid ${colors.border}`, borderRadius: 14, padding: 12, background: colors.card, display: 'flex', flexDirection: 'column', gap: 12 },
      bubble: { background: colors.bubble, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 12 },
      you: { color: colors.subtext, marginBottom: 8 },
    };
  }, [theme]);

  const [wide, setWide] = useState(() => window.matchMedia('(min-width: 980px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 980px)');
    const handler = (e) => setWide(e.matches);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);

  return (
    <div style={styles.root}>
      <header style={styles.header}>
        <div style={styles.brand}>AI QA Chatbot</div>
        <button style={styles.toggle} onClick={toggleTheme}>
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
      </header>

      <main style={{ ...styles.main, ...(wide ? styles.mainWide : null) }}>
        {/* Left side */}
        <section style={styles.leftPanel}>
          <div style={styles.card}>
            <label>Upload PDF</label>
            <input type="file" accept="application/pdf" onChange={handlePdfUpload} disabled={loading} />
          </div>
          <div style={styles.stretchCard}>
            <label>Extracted PDF text</label>
            <textarea rows={12} value={pdfText} readOnly placeholder="Extracted PDF text will appear here..." style={styles.textarea} />
          </div>
        </section>

        {/* Right side */}
        <section style={styles.rightPanel}>
          <div style={styles.card}>
            <div>Chat</div>
            <div style={styles.queryRow}>
              <input
                style={styles.query}
                type="text"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendQueryStream()}
                placeholder="Ask for test cases..."
                disabled={loading || !pdfText}
              />
              <button style={styles.send(loading || !pdfText)} onClick={sendQueryStream} disabled={loading || !pdfText}>Send</button>
            </div>
          </div>

          <div style={styles.history}>
            {chatHistory.length === 0 ? (
              <div>No conversations yet.</div>
            ) : (
              chatHistory.map((entry, idx) => (
                <div key={idx} style={styles.bubble}>
                  <div style={styles.you}><b>You:</b> {entry.user}</div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <b>Bot:</b>
                      <button onClick={() => handleCopy(entry.raw, idx)}>
                        {copiedIndex === idx ? 'Copied!' : 'Copy Test Cases'}
                      </button>
                    </div>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {entry.raw || '*[Typing...]*'}
                    </ReactMarkdown>
                  </div>
                </div>
              ))
            )}
          </div>
          {loading && <div>Loading…</div>}
        </section>
      </main>
    </div>
  );
}

export default App;
