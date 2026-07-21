import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.join(__dirname, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });

const BASE = 'http://localhost:3000';
const email = `e2e.${Date.now()}@example.com`;
const password = 'TestPassword123!';
const results = [];
const consoleErrors = [];
let failures = 0;

function ok(name, cond, extra = '') {
  const line = `${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`;
  results.push(line);
  console.log(line);
  if (!cond) failures++;
}

async function shot(page, name) {
  try {
    await page.screenshot({ path: path.join(SHOTS, name), fullPage: true });
  } catch {}
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300));
});
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + String(e).slice(0, 300)));

try {
  // 1. Landing page
  const resp = await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  ok('landing page 200', resp.status() === 200, `status=${resp.status()}`);

  // 2. Middleware: unauthenticated /dashboard redirects to sign-in
  await page.goto(BASE + '/dashboard', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  ok('unauthenticated /dashboard redirects to sign-in', page.url().includes('sign-in'), page.url());

  // 3. Sign-up
  await page.goto(BASE + '/sign-up', { waitUntil: 'domcontentloaded' });
  await page.fill('#name', 'E2E Tester');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type=submit]');
  try {
    await page.waitForURL('**/dashboard**', { timeout: 25000 });
    ok('sign-up creates account and lands on dashboard', true);
  } catch {
    ok('sign-up creates account and lands on dashboard', false, 'url=' + page.url());
    await shot(page, 'signup-fail.png');
  }
  await shot(page, 'dashboard.png');

  // 4. Criteria: fill and save
  await page.goto(BASE + '/dashboard/criteria', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#jobFunction', { timeout: 15000 });
  await page.fill('#jobFunction', 'Software Engineer, AI Engineer');
  await page.fill('#companies', 'stripe');
  await page.press('#companies', 'Enter');
  await page.getByText('Internship', { exact: true }).click();
  await page.click('button[type=submit]');
  let criteriaSaved = false;
  try {
    await page.waitForSelector('text=Criteria saved', { timeout: 15000 });
    criteriaSaved = true;
  } catch {}
  ok('criteria saves successfully', criteriaSaved);
  await shot(page, 'criteria-saved.png');

  // 5. Criteria persistence (survive the auto-redirect, then re-visit)
  await page.waitForTimeout(2500);
  await page.goto(BASE + '/dashboard/criteria', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#jobFunction', { timeout: 15000 });
  await page.waitForTimeout(1000);
  const jf = await page.inputValue('#jobFunction');
  ok('criteria persisted after reload', jf.includes('Software Engineer'), `jobFunction="${jf}"`);
  const chipCount = await page.locator('span:has-text("stripe")').count();
  ok('company chip persisted', chipCount > 0, `chips=${chipCount}`);

  // 6. Manual evidence add (skill — simplest required-field set)
  await page.goto(BASE + '/dashboard/evidence/new', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#itemType', { timeout: 15000 });
  await page.selectOption('#itemType', 'skill');
  await page.fill('#title', 'React');
  await page.fill('#content', 'Built production apps with React 19, Next.js App Router, and TanStack Query.');
  const skillsInput = await page.locator('#skills').count();
  if (skillsInput) await page.fill('#skills', 'React, TypeScript');
  await page.click('button[type=submit]');
  let evidenceCreated = false;
  try {
    // Server action computes the OpenAI embedding synchronously — allow up to 60s
    await page.waitForURL(
      (u) => u.pathname.includes('/dashboard/evidence') && !u.pathname.endsWith('/new'),
      { timeout: 60000 }
    );
    await page.waitForTimeout(1000);
    evidenceCreated = (await page.locator('text=React').count()) > 0;
  } catch {}
  ok('manual evidence item created and listed', evidenceCreated, page.url());
  await shot(page, 'evidence-list.png');

  // 7. Queue page renders (empty state is fine, blank/error page is not)
  await page.goto(BASE + '/dashboard/queue', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  // innerText = visible text only (textContent would pick up Next's inline RSC scripts)
  const queueText = await page.locator('body').innerText();
  const queueOk =
    /fresh match queue/i.test(queueText) &&
    (/no matches yet/i.test(queueText) || (await page.locator('[class*=card]').count()) > 0);
  ok('queue page renders content (no crash/blank)', queueOk, queueText.slice(0, 80).replace(/\n/g, ' '));
  await shot(page, 'queue.png');

  // 8. Jobs page renders
  await page.goto(BASE + '/dashboard/jobs', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const jobsBody = (await page.textContent('body')) || '';
  ok('jobs page renders content', jobsBody.trim().length > 50, `bodyLen=${jobsBody.trim().length}`);

  // 9. Upload endpoint negative tests (session cookie carried by context)
  const txtRes = await ctx.request.post(BASE + '/api/evidence/upload', {
    multipart: {
      file: { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('plain text') },
    },
  });
  ok('upload rejects .txt with 400', txtRes.status() === 400, `status=${txtRes.status()}`);

  const badPdfRes = await ctx.request.post(BASE + '/api/evidence/upload', {
    multipart: {
      file: {
        name: 'resume.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4\nthis is not a real pdf body at all'),
      },
    },
  });
  const badPdfText = await badPdfRes.text();
  ok(
    'corrupt PDF returns 400 (not 500) — extraction fail-fast',
    badPdfRes.status() === 400,
    `status=${badPdfRes.status()} body=${badPdfText.slice(0, 200)}`
  );
  ok(
    'upload error does not leak stack traces',
    !/\bat\s+.*\(.*:\d+:\d+\)|node_modules|ENOENT|C:\\/.test(badPdfText),
    badPdfText.slice(0, 120)
  );

  // 10. Cron auth (fail-closed regression checks)
  for (const ep of ['poll-jobs', 'check-notifications']) {
    const noAuth = await ctx.request.get(`${BASE}/api/cron/${ep}`);
    ok(`cron ${ep}: no auth → 401`, noAuth.status() === 401, `status=${noAuth.status()}`);
    const undef = await ctx.request.get(`${BASE}/api/cron/${ep}`, {
      headers: { authorization: 'Bearer undefined' },
    });
    ok(`cron ${ep}: "Bearer undefined" → 401`, undef.status() === 401, `status=${undef.status()}`);
    const wrong = await ctx.request.get(`${BASE}/api/cron/${ep}`, {
      headers: { authorization: 'Bearer wrong-secret-value' },
    });
    ok(`cron ${ep}: wrong secret → 401`, wrong.status() === 401, `status=${wrong.status()}`);
  }

  // 11. Health endpoint
  const h = await ctx.request.get(BASE + '/api/health');
  ok('health endpoint 200', h.status() === 200, `status=${h.status()}`);

  // 12. API auth: evidence upload without session → 401
  const anonCtx = await browser.newContext();
  const anonUpload = await anonCtx.request.post(BASE + '/api/evidence/upload', {
    multipart: {
      file: { name: 'r.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') },
    },
  });
  ok('upload without session → 401', anonUpload.status() === 401, `status=${anonUpload.status()}`);
  const anonQueue = await anonCtx.request.get(BASE + '/api/matching/queue');
  ok('matching queue API without session → 401', anonQueue.status() === 401, `status=${anonQueue.status()}`);
  await anonCtx.close();

  // 13. Sign out, sign back in
  await page.goto(BASE + '/dashboard', { waitUntil: 'domcontentloaded' });
  const signOutBtn = page.getByRole('button', { name: /sign out/i }).first();
  let signedOut = false;
  try {
    await signOutBtn.click({ timeout: 10000 });
    await page.waitForURL((u) => !u.pathname.startsWith('/dashboard'), { timeout: 15000 });
    signedOut = true;
  } catch {}
  ok('sign out returns to public page', signedOut, page.url());

  await page.goto(BASE + '/sign-in', { waitUntil: 'domcontentloaded' });
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type=submit]');
  let reLogin = false;
  try {
    await page.waitForURL('**/dashboard**', { timeout: 20000 });
    reLogin = true;
  } catch {}
  ok('sign back in with same credentials', reLogin, page.url());

  // 14. Dark-mode screenshots (past bug class: illegible inputs)
  const darkCtx = await browser.newContext({
    colorScheme: 'dark',
    viewport: { width: 1280, height: 900 },
  });
  const dark = await darkCtx.newPage();
  await dark.goto(BASE + '/sign-in', { waitUntil: 'domcontentloaded' });
  await dark.fill('#email', 'dark@example.com');
  await dark.fill('#password', 'darkmode-check');
  await shot(dark, 'dark-signin.png');
  await dark.goto(BASE + '/sign-up', { waitUntil: 'domcontentloaded' });
  await dark.fill('#name', 'Dark Mode');
  await shot(dark, 'dark-signup.png');
  // criteria needs auth — log in within dark context
  await dark.goto(BASE + '/sign-in', { waitUntil: 'domcontentloaded' });
  await dark.fill('#email', email);
  await dark.fill('#password', password);
  await dark.click('button[type=submit]');
  try {
    await dark.waitForURL('**/dashboard**', { timeout: 20000 });
    await dark.goto(BASE + '/dashboard/criteria', { waitUntil: 'domcontentloaded' });
    await dark.waitForSelector('#jobFunction', { timeout: 15000 });
    await dark.fill('#locations', 'New York');
    await shot(dark, 'dark-criteria.png');
    await dark.goto(BASE + '/dashboard/evidence/new', { waitUntil: 'domcontentloaded' });
    await dark.waitForSelector('#title', { timeout: 15000 });
    await dark.fill('#title', 'Dark mode legibility check');
    await shot(dark, 'dark-evidence-form.png');
  } catch (e) {
    console.log('dark-mode authed shots skipped: ' + String(e).slice(0, 120));
  }
  await darkCtx.close();

  // 15. Console errors collected across the authed session
  const realErrors = consoleErrors.filter(
    (e) => !/favicon|404 \(Not Found\)|Download the React DevTools/i.test(e)
  );
  ok('no page JS errors during flows', realErrors.length === 0, realErrors.slice(0, 5).join(' | '));
} catch (e) {
  ok('e2e harness completed without exception', false, String(e).slice(0, 400));
  await shot(page, 'harness-crash.png');
} finally {
  await browser.close();
}

fs.writeFileSync(path.join(__dirname, 'e2e-results.txt'), results.join('\n'));
console.log(`\n${results.length} checks, ${failures} failures. Test account: ${email}`);
process.exit(failures ? 1 : 0);
