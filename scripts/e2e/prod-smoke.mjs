// Read-only smoke test against production. No accounts created, no data written.
const BASE = 'https://job-os-nine.vercel.app';
let failures = 0;
const ok = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
  if (!cond) failures++;
};

const get = (p, headers = {}) => fetch(BASE + p, { headers, redirect: 'manual' });

const h = await get('/api/health');
ok('health 200', h.status === 200, `status=${h.status} body=${(await h.text()).slice(0, 120)}`);

const landing = await get('/');
ok('landing 200', landing.status === 200, `status=${landing.status}`);

const signin = await get('/sign-in');
ok('sign-in page 200', signin.status === 200, `status=${signin.status}`);

const dash = await get('/dashboard');
ok('unauthed /dashboard redirects (3xx)', dash.status >= 300 && dash.status < 400, `status=${dash.status} loc=${dash.headers.get('location')}`);

for (const ep of ['poll-jobs', 'check-notifications']) {
  const noAuth = await get(`/api/cron/${ep}`);
  ok(`cron ${ep}: no auth 401`, noAuth.status === 401, `status=${noAuth.status}`);
  const undef = await get(`/api/cron/${ep}`, { authorization: 'Bearer undefined' });
  ok(`cron ${ep}: "Bearer undefined" 401`, undef.status === 401, `status=${undef.status}`);
  const wrong = await get(`/api/cron/${ep}`, { authorization: 'Bearer not-the-secret' });
  ok(`cron ${ep}: wrong secret 401`, wrong.status === 401, `status=${wrong.status}`);
}

const q = await get('/api/matching/queue');
ok('matching queue unauthed 401', q.status === 401, `status=${q.status}`);

console.log(`\n${failures} failures`);
process.exit(failures ? 1 : 0);
