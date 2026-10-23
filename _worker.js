// نقطة دخول Cloudflare Pages (وضع _worker.js): API التواصل + تقديم الملفات الثابتة
const HITS = new Map(); // تحديد معدل بسيط داخل نسخة الخادم
const MAX = 10 * 1024 * 1024;
const BLOCKED = /\.(exe|bat|cmd|com|scr|msi|vbs|ps1|apk|jar|dll|sh|js)$/i;
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const reply = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
});
const tg = (env, method, body) => fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
  method: 'POST',
  ...(body instanceof FormData ? { body } : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
}).then(r => r.json());
const limited = (key, max) => {
  const now = Date.now(), hits = (HITS.get(key) || []).filter(t => now - t < 600000);
  if (hits.length >= max) return true;
  HITS.set(key, [...hits, now]); return false;
};
const guarded = env => !!(env.TURNSTILE_SECRET_KEY && env.TURNSTILE_SITE_KEY);

// فحص سريع للإعداد: افتح /api/contact في المتصفح (لا يعرض أي أسرار)
async function onGet({ request, env }) {
  const ip = request.headers.get('CF-Connecting-IP') || 'x';
  if (limited('get' + ip, 10)) return reply({ error: 'rate' }, 429);
  const out = { telegram_configured: !!(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID), turnstile: guarded(env) };
  if (out.telegram_configured) {
    try {
      const me = await tg(env, 'getMe', {});
      out.token_ok = !!me.ok;
      if (me.ok) { out.chat_ok = !!(await tg(env, 'getChat', { chat_id: env.TELEGRAM_CHAT_ID })).ok; if (!out.chat_ok) out.hint = 'تحقق من TELEGRAM_CHAT_ID وأرسل /start للبوت'; }
      else out.hint = 'توكن البوت غير صحيح';
    } catch { out.hint = 'تعذر الوصول إلى تيليجرام'; }
  }
  return reply(out);
}

async function onPost({ request, env }) {
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) return reply({ error: 'forbidden' }, 403);
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return reply({ error: 'not_configured' }, 503);
  const ip = request.headers.get('CF-Connecting-IP') || 'x';
  if (limited('post' + ip, 5)) return reply({ error: 'rate' }, 429);
  if (Number(request.headers.get('content-length') || 0) > MAX + 100000) return reply({ error: 'too_large' }, 413);

  let form;
  try { form = await request.formData(); } catch { return reply({ error: 'bad_request' }, 400); }
  if (form.get('website')) return reply({ ok: true }); // فخ الروبوتات

  if (guarded(env)) {
    const token = String(form.get('cf-turnstile-response') || '');
    if (!token || token.length > 2048) return reply({ error: 'captcha' }, 400);
    try {
      const v = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token });
      if (ip !== 'x') v.set('remoteip', ip);
      const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: v });
      if (!(await res.json()).success) return reply({ error: 'captcha' }, 400);
    } catch { return reply({ error: 'captcha' }, 502); }
  }

  const name = String(form.get('name') || '').trim().slice(0, 80);
  const email = String(form.get('email') || '').trim().slice(0, 120);
  const message = String(form.get('message') || '').trim().slice(0, 3000);
  if (!name || message.length < 3) return reply({ error: 'invalid' }, 400);

  const file = form.get('file');
  const hasFile = file && typeof file === 'object' && file.size > 0;
  if (hasFile && (file.size > MAX || BLOCKED.test(file.name))) return reply({ error: 'bad_file' }, 400);

  const text = `<b>رسالة جديدة من الموقع</b>\n<b>الاسم:</b> ${esc(name)}\n<b>البريد:</b> ${esc(email || 'لم يقدّم')}\n<b>الرسالة:</b>\n${esc(message)}${hasFile ? '\n\n<i>مع مرفق</i>' : ''}`;
  try {
    const m = await tg(env, 'sendMessage', { chat_id: env.TELEGRAM_CHAT_ID, text, parse_mode: 'HTML', disable_web_page_preview: true });
    if (!m.ok) return reply({ error: 'delivery' }, 502);
    if (!hasFile) return reply({ ok: true });
    const fd = new FormData();
    fd.set('chat_id', env.TELEGRAM_CHAT_ID);
    fd.set('reply_to_message_id', String(m.result.message_id));
    fd.set('caption', 'مرفق من ' + name.slice(0, 60));
    fd.set('document', file, file.name);
    const doc = await tg(env, 'sendDocument', fd);
    return reply({ ok: true, file: !!doc.ok });
  } catch { return reply({ error: 'delivery' }, 502); }
}

// قائمة القراء الكاملة: يجلبها الخادم من mp3quran.net ويخزنها في كاش Cloudflare يومًا كاملًا (دون مشاكل CORS أو CSP في المتصفح)
const RECITER_SOURCES = ['https://www.mp3quran.net/api/v3/reciters?language=ar', 'https://mp3quran.net/api/v3/reciters?language=ar'];
async function onReciters({ request, ctx }) {
  const cache = caches.default, key = new Request(new URL('/api/reciters', request.url).href);
  const json = (body, cc) => new Response(body, { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': cc } });
  const hit = await cache.match(key);
  if (hit) return json(await hit.text(), 'no-store');
  for (const src of RECITER_SOURCES) {
    try {
      const r = await fetch(src, { headers: { accept: 'application/json' } });
      if (!r.ok) continue;
      const j = await r.json();
      if (!Array.isArray(j.reciters) || !j.reciters.length) continue;
      const slim = JSON.stringify({ reciters: j.reciters.map(x => ({ id: x.id, name: x.name,
        moshaf: (x.moshaf || []).map(m => ({ id: m.id, name: m.name, server: m.server, surah_list: m.surah_list })) })) });
      ctx.waitUntil(cache.put(key, json(slim, 'public, max-age=86400')));
      return json(slim, 'no-store');
    } catch {}
  }
  return reply({ error: 'upstream' }, 502);
}

function onConfig({ env }) {
  // المفتاح العام لـ Turnstile يُعاد فقط إذا ضُبط المفتاحان معًا
  return reply({ turnstileSiteKey: guarded(env) ? env.TURNSTILE_SITE_KEY : '' });
}

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/config' && request.method === 'GET') return onConfig({ env });
    if (pathname === '/api/reciters' && request.method === 'GET') return onReciters({ request, ctx });
    if (pathname === '/api/contact') {
      if (request.method === 'POST') return onPost({ request, env });
      if (request.method === 'GET') return onGet({ request, env });
      return reply({ error: 'method' }, 405);
    }
    // باقي الطلبات: الملفات الثابتة، دون أي تخزين مؤقت حتى لا تظهر نسخة قديمة
    const res = await env.ASSETS.fetch(request);
    let out = new Response(res.body, res);
    // الصفحة الرئيسية: نحوّل روابط بطاقة المشاركة (og:image وغيرها) إلى روابط مطلقة بنطاق الموقع الفعلي، فهي مطلوبة في واتساب وتيليغرام وغيرهما
    if ((pathname === '/' || pathname === '/index.html') && /text\/html/.test(out.headers.get('content-type') || '') && typeof HTMLRewriter !== 'undefined') {
      try {
        const origin = new URL(request.url).origin;
        const set = (attr, path) => ({ element(e) { e.setAttribute(attr, origin + path); } });
        out = new HTMLRewriter()
          .on('meta[property="og:image"]', set('content', '/assets/og.png'))
          .on('meta[name="twitter:image"]', set('content', '/assets/og.png'))
          .on('meta[property="og:url"]', set('content', '/'))
          .on('link[rel="canonical"]', set('href', '/'))
          .transform(out);
      } catch {}
    }
    out.headers.set('cache-control', 'no-store');
    return out;
  }
};
