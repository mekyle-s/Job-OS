// End-to-end verification of the user-reported bugs:
//  1. criteria save triggers a poll (jobs appear without waiting for cron)
//  2. resume upload triggers auto-matching (coverage appears without manual runs)
//  3. queue is filtered by job function (no unrelated roles)
// Runs against localhost with tiny extraction/eval caps set on the server.
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:3000';
const email = `match-e2e.${Date.now()}@example.com`;
const password = 'TestPassword123!';
let failures = 0;
const ok = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
  if (!cond) failures++;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

// --- Sign up
await page.goto(BASE + '/sign-up', { waitUntil: 'domcontentloaded' });
await page.fill('#name', 'Match Tester');
await page.fill('#email', email);
await page.fill('#password', password);
await page.click('button[type=submit]');
await page.waitForURL('**/dashboard**', { timeout: 25000 });
ok('sign-up', true);

// --- Generate a realistic resume PDF (the user's exact scenario: fake AI
// engineer intern experience) and upload it
const resumePage = await ctx.newPage();
await resumePage.setContent(`
  <h1>Match Tester</h1><p>match-tester@example.com | New York, NY</p>
  <h2>Experience</h2>
  <h3>AI Engineer Intern — TechCorp (Jun 2025 – Aug 2025)</h3>
  <ul>
    <li>Built a retrieval-augmented generation pipeline with OpenAI GPT-4o and pgvector, serving 10k queries/day</li>
    <li>Developed React and TypeScript dashboards to monitor LLM evaluation metrics</li>
    <li>Fine-tuned embedding-based semantic search that improved match precision by 35%</li>
    <li>Shipped Python microservices on PostgreSQL and Docker with CI/CD</li>
  </ul>
  <h2>Projects</h2>
  <h3>Job Matcher</h3>
  <p>Full-stack Next.js app using OpenAI APIs, Drizzle ORM, and TanStack Query to rank job fit from resume evidence.</p>
  <h2>Education</h2>
  <p>B.S. Computer Science, State University, expected 2027. GPA 3.8</p>
  <h2>Skills</h2>
  <p>Python, TypeScript, React, Next.js, PostgreSQL, OpenAI API, LangChain, Docker, Git</p>
`);
const pdfBuffer = await resumePage.pdf({ format: 'Letter' });
await resumePage.close();

const uploadRes = await ctx.request.post(BASE + '/api/evidence/upload', {
  multipart: {
    file: { name: 'resume.pdf', mimeType: 'application/pdf', buffer: pdfBuffer },
  },
});
const { sourceId } = await uploadRes.json();
ok('resume PDF accepted', uploadRes.status() === 200 && !!sourceId, `status=${uploadRes.status()}`);

// --- Wait for parse to complete
let parseStatus = 'pending';
for (let i = 0; i < 60; i++) {
  await sleep(3000);
  const s = await ctx.request.get(`${BASE}/api/evidence/status/${sourceId}`);
  if (s.ok()) {
    const body = await s.json();
    parseStatus = body.parseStatus ?? body.status ?? 'unknown';
    if (parseStatus === 'completed' || parseStatus === 'failed') break;
  }
}
ok('resume parse completed', parseStatus === 'completed', `status=${parseStatus}`);

// --- Save criteria: AI Engineer, target company stripe (small board slice
// via caps). This must fire the poll automatically.
await page.goto(BASE + '/dashboard/criteria', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#jobFunction', { timeout: 15000 });
await page.fill('#jobFunction', 'AI Engineer, Software Engineer');
await page.fill('#companies', 'stripe');
await page.press('#companies', 'Enter');
await page.click('button[type=submit]');
await page.waitForSelector('text=Criteria saved', { timeout: 15000 });
ok('criteria saved (poll fired automatically)', true);

// --- Wait for poll + extraction + auto-match to land, then check the queue.
// Poll fetches the Stripe board (~500 jobs, filtered by function), extracts
// requirements for MAX_EXTRACTIONS_PER_POLL jobs, then auto-matches.
let queue = [];
let sawJobs = false;
for (let i = 0; i < 40; i++) {
  await sleep(6000);
  const q = await ctx.request.get(BASE + '/api/matching/queue');
  if (q.ok()) {
    const body = await q.json();
    queue = body.queue ?? [];
    if (queue.length > 0) {
      sawJobs = true;
      if (queue.some((j) => j.mappedRequirements > 0)) break;
    }
  }
}
ok('queue has jobs after criteria save (no cron needed)', sawJobs, `count=${queue.length}`);

const functionOk = queue.every((j) =>
  /engineer|engineering/i.test(`${j.title}`)
);
ok(
  'queue only contains function-matched roles',
  queue.length > 0 && functionOk,
  queue
    .slice(0, 5)
    .map((j) => `${j.company}: ${j.title}`)
    .join(' | ')
);

const covered = queue.filter((j) => j.mappedRequirements > 0);
ok(
  'auto-matching produced requirement coverage (X of Y > 0)',
  covered.length > 0,
  covered
    .slice(0, 3)
    .map((j) => `${j.title}: ${j.mappedRequirements}/${j.totalRequirements}`)
    .join(' | ') || 'no coverage yet'
);

await browser.close();
console.log(`\n${failures} failures. Account: ${email}`);
process.exit(failures ? 1 : 0);
