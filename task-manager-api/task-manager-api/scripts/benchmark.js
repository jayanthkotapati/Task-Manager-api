/*
 * HTTP load test with autocannon. Start the API first (npm start), then:
 *   npm run benchmark
 *   BASE_URL=http://<ec2-ip>:5000 CONNECTIONS=200 DURATION=30 npm run benchmark
 *
 * To measure the effect of indexing, run once, then:
 *   node scripts/toggle-indexes.js drop   && npm run benchmark   (baseline)
 *   node scripts/toggle-indexes.js create && npm run benchmark   (optimized)
 * Results are saved to benchmark-results/ so you can compare real numbers.
 */
const autocannon = require('autocannon');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const CONNECTIONS = parseInt(process.env.CONNECTIONS, 10) || 100;
const DURATION = parseInt(process.env.DURATION, 10) || 20;
const EMAIL = process.env.BENCH_EMAIL || 'user1@example.com';
const PASSWORD = process.env.BENCH_PASSWORD || 'User@12345';

(async () => {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login failed (${res.status}). Did you run "npm run seed"?`);
  const { token } = await res.json();

  const requests = [
    { method: 'GET', path: '/api/tasks?status=todo&sortBy=dueDate&order=asc&page=1&limit=20' },
    { method: 'GET', path: '/api/tasks?priority=high&page=2&limit=20' },
    { method: 'GET', path: '/api/tasks?page=1&limit=20' },
    { method: 'GET', path: '/api/tasks/stats' },
  ];

  console.log(`Load testing ${BASE_URL} | ${CONNECTIONS} connections | ${DURATION}s`);
  const result = await autocannon({
    url: BASE_URL,
    connections: CONNECTIONS,
    duration: DURATION,
    headers: { authorization: `Bearer ${token}` },
    requests,
  });

  const summary = {
    timestamp: new Date().toISOString(),
    connections: CONNECTIONS,
    durationSec: DURATION,
    requestsPerSec: result.requests.average,
    latencyAvgMs: result.latency.average,
    latencyP50Ms: result.latency.p50,
    latencyP97_5Ms: result.latency.p97_5,
    latencyP99Ms: result.latency.p99,
    non2xx: result.non2xx,
    errors: result.errors,
    timeouts: result.timeouts,
  };
  console.table(summary);

  const dir = path.join(__dirname, '..', 'benchmark-results');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `bench-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(summary, null, 2));
  console.log(`Saved ${file}`);
})().catch((e) => { console.error(e.message); process.exit(1); });
