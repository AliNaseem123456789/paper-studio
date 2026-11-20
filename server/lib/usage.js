// In-memory usage ledger. Every API call is recorded here so the UI can show
// what has been spent this session and what an average paper really costs.
//
// Deliberately not a database: restart the server and it resets. If you want
// history across restarts, write `log` to a JSON file on each push.

const MAX_ENTRIES = 500;

const log = [];

export function record({ route, model, usage = {}, usd = null, note = '' }) {
  const entry = {
    at: new Date().toISOString(),
    route,
    model,
    inTok: usage.prompt_tokens || usage.input_tokens || 0,
    outTok: usage.completion_tokens || usage.output_tokens || 0,
    usd,
    note,
  };
  entry.totalTok = entry.inTok + entry.outTok;
  log.push(entry);
  if (log.length > MAX_ENTRIES) log.shift();
  return entry;
}

export function summary() {
  const byRoute = {};
  let inTok = 0;
  let outTok = 0;
  let usd = 0;
  let priced = 0;

  for (const e of log) {
    inTok += e.inTok;
    outTok += e.outTok;
    if (e.usd != null) {
      usd += e.usd;
      priced += 1;
    }
    const r = (byRoute[e.route] ||= { calls: 0, inTok: 0, outTok: 0, usd: 0 });
    r.calls += 1;
    r.inTok += e.inTok;
    r.outTok += e.outTok;
    r.usd += e.usd || 0;
  }

  const calls = log.length;
  return {
    calls,
    inTok,
    outTok,
    totalTok: inTok + outTok,
    usd: priced ? usd : null,
    avgTokPerCall: calls ? Math.round((inTok + outTok) / calls) : 0,
    avgUsdPerCall: priced ? usd / priced : null,
    // What a teacher actually wants to know: cost of one finished paper.
    papers: byRoute.generate?.calls || 0,
    usdPerPaper: byRoute.generate?.calls
      ? byRoute.generate.usd / byRoute.generate.calls
      : null,
    byRoute,
  };
}

export function entries(limit = 50) {
  return log.slice(-limit).reverse();
}

export function reset() {
  log.length = 0;
}
