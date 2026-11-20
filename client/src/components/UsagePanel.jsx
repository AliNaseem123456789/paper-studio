import React, { useEffect, useState } from 'react';

const money = (v) => (v == null ? '—' : `$${v < 0.01 ? v.toFixed(5) : v.toFixed(4)}`);
const PKR = 278;

export default function UsagePanel({ refreshKey, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    try {
      const res = await fetch('/api/usage');
      setData(await res.json());
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, [refreshKey]);

  async function reset() {
    await fetch('/api/usage', { method: 'DELETE' });
    load();
  }

  if (error) return <div className="banner error">{error}</div>;
  if (!data) return <div className="panel">Loading usage…</div>;

  const s = data.summary;

  return (
    <div className="usage-overlay" onClick={onClose}>
      <div className="usage-modal" onClick={(e) => e.stopPropagation()}>
        <div className="usage-head">
          <h2>Token usage this session</h2>
          <button className="ghost" onClick={onClose}>Close</button>
        </div>

        {s.calls === 0 ? (
          <p className="muted">
            Nothing yet. Generate a paper or send a chat message and the numbers
            appear here.
          </p>
        ) : (
          <>
            <div className="stat-grid">
              <div className="stat">
                <span className="stat-num">{s.calls}</span>
                <span className="stat-lab">API calls</span>
              </div>
              <div className="stat">
                <span className="stat-num">{s.totalTok.toLocaleString()}</span>
                <span className="stat-lab">tokens total</span>
              </div>
              <div className="stat">
                <span className="stat-num">{money(s.usd)}</span>
                <span className="stat-lab">spent</span>
              </div>
              <div className="stat">
                <span className="stat-num">{s.avgTokPerCall.toLocaleString()}</span>
                <span className="stat-lab">avg per call</span>
              </div>
            </div>

            {s.usdPerPaper != null && (
              <div className="callout">
                <strong>{money(s.usdPerPaper)}</strong> per finished paper
                &nbsp;·&nbsp; {money(s.usdPerPaper * 100)} (Rs&nbsp;
                {Math.round(s.usdPerPaper * 100 * PKR).toLocaleString()}) per 100
                papers &nbsp;·&nbsp; based on {s.papers} paper
                {s.papers === 1 ? '' : 's'}
                {s.papers < 3 && ' — run a few more for a reliable average'}
              </div>
            )}

            <h3 className="panel-title">By feature</h3>
            <table className="usage-table">
              <thead>
                <tr>
                  <th>Feature</th><th>Calls</th><th>In</th><th>Out</th><th>Cost</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(s.byRoute).map(([route, r]) => (
                  <tr key={route}>
                    <td>{route}</td>
                    <td>{r.calls}</td>
                    <td>{r.inTok.toLocaleString()}</td>
                    <td>{r.outTok.toLocaleString()}</td>
                    <td>{money(r.usd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 className="panel-title">Recent calls</h3>
            <table className="usage-table">
              <thead>
                <tr>
                  <th>Time</th><th>Feature</th><th>Tokens</th><th>Cost</th><th>What</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((e, i) => (
                  <tr key={i}>
                    <td>{new Date(e.at).toLocaleTimeString()}</td>
                    <td>{e.route}</td>
                    <td>{e.totalTok.toLocaleString()}</td>
                    <td>{money(e.usd)}</td>
                    <td className="trunc">{e.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="usage-foot">
              <button className="link-btn danger" onClick={reset}>
                Reset counter
              </button>
              <span className="muted">
                Counts reset when the server restarts. Rates are set in
                server/lib/openai.js
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
