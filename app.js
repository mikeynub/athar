'use strict';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const TZ = 'Africa/Algiers'; // التوقيت المعتمد للتقويم والمواقيت الافتراضية
const ic = (n, c = '') => `<svg class="i ${c}"><use href="#i-${n}"/></svg>`;
const pad = n => String(n).padStart(2, '0');
const fmtTime = s => Number.isFinite(s) ? `${pad(Math.floor(s / 60))}:${pad(Math.floor(s % 60))}` : '00:00';
const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => s.replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').toLowerCase();
let toastTimer;
const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600); };

// الموقع لا يحفظ شيئًا في المتصفح: ننظّف بقايا أي نسخة سابقة (تخزين محلي، عامل خدمة، كاش).
try { localStorage.clear(); sessionStorage.clear(); } catch {}
(async () => {
  try {
    await Promise.all(((await navigator.serviceWorker?.getRegistrations()) || []).map(r => r.unregister()));
    if (window.caches) await Promise.all((await caches.keys()).map(k => caches.delete(k)));
  } catch {}
})();

$('#year').textContent = new Date().getFullYear();

// ---------- المظهر ----------
function setTheme(light) {
  document.body.classList.toggle('light', light);
  $('#themeToggle').innerHTML = ic(light ? 'sun' : 'moon');
  $('meta[name=theme-color]').content = light ? '#f5f3ea' : '#07140f';
}
setTheme(matchMedia('(prefers-color-scheme: light)').matches);
$('#themeToggle').onclick = () => setTheme(!document.body.classList.contains('light'));

// ---------- التاريخ: ميلادي + هجري (أم القرى) بتوقيت الجزائر ----------
const ymd = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d).split('-').map(Number);
const U = (y, m, d) => new Date(Date.UTC(y, m, d, 12));
const fmt = (o, hijri) => new Intl.DateTimeFormat('ar-DZ' + (hijri ? '-u-ca-islamic-umalqura' : ''), { timeZone: 'UTC', ...o });
const hijriDay = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { timeZone: 'UTC', day: 'numeric' });
function renderToday() {
  const [y, m, d] = ymd(), t = U(y, m - 1, d);
  $('#todayDate').textContent = fmt({ dateStyle: 'long' }).format(t);
  $('#hijriDate').textContent = fmt({ dateStyle: 'long' }, 1).format(t);
  $('#clock').textContent = 'الجزائر ' + new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(new Date());
}

// ---------- القرآن: كل القراء من mp3quran.net ----------
const timeoutSignal = ms => { if (AbortSignal.timeout) return AbortSignal.timeout(ms); const c = new AbortController(); setTimeout(() => c.abort(), ms); return c.signal; };
const getJSON = async (url, ms = 8000) => { const r = await fetch(url, { signal: timeoutSignal(ms) }); if (!r.ok) throw 0; return r.json(); };
const audio = $('#quranAudio'), pad3 = n => String(n).padStart(3, '0');
// قائمة السور مضمّنة في الموقع (لا تحتاج اتصالًا بخدمة خارجية)
const MEDINAN = new Set([2, 3, 4, 5, 8, 9, 13, 22, 24, 33, 47, 48, 49, 55, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 76, 98, 99, 110]);
const surahs = 'الفاتحة:7|البقرة:286|آل عمران:200|النساء:176|المائدة:120|الأنعام:165|الأعراف:206|الأنفال:75|التوبة:129|يونس:109|هود:123|يوسف:111|الرعد:43|إبراهيم:52|الحجر:99|النحل:128|الإسراء:111|الكهف:110|مريم:98|طه:135|الأنبياء:112|الحج:78|المؤمنون:118|النور:64|الفرقان:77|الشعراء:227|النمل:93|القصص:88|العنكبوت:69|الروم:60|لقمان:34|السجدة:30|الأحزاب:73|سبأ:54|فاطر:45|يس:83|الصافات:182|ص:88|الزمر:75|غافر:85|فصلت:54|الشورى:53|الزخرف:89|الدخان:59|الجاثية:37|الأحقاف:35|محمد:38|الفتح:29|الحجرات:18|ق:45|الذاريات:60|الطور:49|النجم:62|القمر:55|الرحمن:78|الواقعة:96|الحديد:29|المجادلة:22|الحشر:24|الممتحنة:13|الصف:14|الجمعة:11|المنافقون:11|التغابن:18|الطلاق:12|التحريم:12|الملك:30|القلم:52|الحاقة:52|المعارج:44|نوح:28|الجن:28|المزمل:20|المدثر:56|القيامة:40|الإنسان:31|المرسلات:50|النبأ:40|النازعات:46|عبس:42|التكوير:29|الانفطار:19|المطففين:36|الانشقاق:25|البروج:22|الطارق:17|الأعلى:19|الغاشية:26|الفجر:30|البلد:20|الشمس:15|الليل:21|الضحى:11|الشرح:8|التين:8|العلق:19|القدر:5|البينة:8|الزلزلة:8|العاديات:11|القارعة:11|التكاثر:8|العصر:3|الهمزة:9|الفيل:5|قريش:4|الماعون:7|الكوثر:3|الكافرون:6|النصر:3|المسد:5|الإخلاص:4|الفلق:5|الناس:6'.split('|').map((x, i) => { const [n, c] = x.split(':'); return { number: i + 1, name: 'سورة ' + n, englishName: '', numberOfAyahs: +c, revelationType: MEDINAN.has(i + 1) ? 'Medinan' : 'Meccan' }; });
let recs = [], rec = null, cur = 1, pendingTime = 0;
// المصدر الأول: خادم الموقع (يجلب القائمة الكاملة ويخزنها)، ثم mp3quran.net مباشرة كاحتياط
const RECITER_APIS = ['/api/reciters', 'https://www.mp3quran.net/api/v3/reciters?language=ar', 'https://mp3quran.net/api/v3/reciters?language=ar'];
// قائمة احتياطية صغيرة تُستخدم فقط إن تعذر تحميل القائمة الكاملة (وتظهر رسالة)
const FALLBACK = [['ar.alafasy', 'مشاري العفاسي'], ['ar.abdurrahmaansudais', 'عبد الرحمن السديس'], ['ar.mahermuaiqly', 'ماهر المعيقلي'], ['ar.abdulbasitmurattal', 'عبد الباسط عبد الصمد']]
  .map(([k, n]) => ({ key: k, label: n, type: '', moshaf: 'حفص عن عاصم', url: s => `https://cdn.islamic.network/quran/audio-surah/128/${k}/${s}.mp3`, list: null }));
const setPlay = p => { $('#playPause').innerHTML = ic(p ? 'pause' : 'play', 'fill'); $('#playPause').setAttribute('aria-label', p ? 'إيقاف مؤقت' : 'تشغيل'); };

// الوضع الافتراضي للمشغّل
function resetPlayer() {
  audio.pause(); audio.removeAttribute('src'); audio.load();
  cur = 1; pendingTime = 0;
  $('#surahTitle').textContent = surahs[0]?.name || 'سورة الفاتحة';
  $('#audioStatus').textContent = 'اختر سورة للاستماع';
  $('#audioSeek').value = 0; $('#audioCurrent').textContent = '00:00'; $('#audioDuration').textContent = '00:00';
  $('#reciterSearch').value = ''; $('#surahSearch').value = '';
  setPlay(false);
}

// يجلب كل القراء بكل مصاحفهم (محاولتان لكل عنوان)
async function fetchReciters() {
  for (let round = 0; round < 2; round++) for (const api of RECITER_APIS) {
    try {
      const j = await getJSON(api, 20000), out = [];
      for (const r of j.reciters || []) {
        const ms = (r.moshaf || []).filter(m => m.server);
        for (const m of ms) {
          const base = m.server.replace(/^http:/, 'https:').replace(/\/?$/, '/');
          out.push({ key: `${r.id}-${m.id}`, label: r.name, moshaf: m.name || '', type: ms.length > 1 ? (m.name || '') : '',
            url: s => `${base}${pad3(s)}.mp3`, list: m.surah_list ? new Set(String(m.surah_list).split(',').map(Number)) : null });
        }
      }
      if (out.length) return out.sort((x, y) => x.label.localeCompare(y.label, 'ar') || x.type.localeCompare(y.type, 'ar'));
    } catch {}
  }
  return null;
}

function fillReciters() {
  const q = norm($('#reciterSearch').value.trim());
  const list = recs.filter(r => !q || norm(r.label).includes(q));
  const has = rec && list.some(r => r.key === rec.key);
  const opt = r => `<option value="${r.key}">${esc(r.label)}${r.type ? ' — ' + esc(r.type) : ''}</option>`;
  $('#reciterSelect').innerHTML = (!list.length ? '<option value="">لا يوجد قارئ بهذا الاسم</option>' : has ? '' : `<option value="" selected>اختر من النتائج (${list.length})</option>`) + list.map(opt).join('');
  if (has) $('#reciterSelect').value = rec.key;
}
function renderList() {
  const q = norm($('#surahSearch').value.trim());
  const list = surahs.filter(s => !q || String(s.number) === q || norm(s.name + ' ' + s.englishName).includes(q));
  $('#surahList').innerHTML = list.map(s => {
    const short = norm(s.name).startsWith('سوره') ? s.name.replace(/^\S+\s+/, '') : s.name, na = rec && rec.list && !rec.list.has(s.number);
    return `<button class="si ${s.number === cur ? 'active' : ''} ${na ? 'na' : ''}" data-n="${s.number}"><i>${s.number}</i><span><b>${short}</b><small>${s.revelationType === 'Meccan' ? 'مكية' : 'مدنية'} · ${s.numberOfAyahs} آية</small></span></button>`;
  }).join('') || '<p class="muted sm">لا توجد نتائج.</p>';
}
function choose(n, play = true) {
  const s = surahs[n - 1]; if (!s || !rec) return;
  if (rec.list && !rec.list.has(n)) { toast('هذه السورة غير متوفرة لهذا القارئ'); return; }
  cur = n; pendingTime = 0;
  $('#surahTitle').textContent = s.name;
  $('#audioStatus').textContent = `${s.revelationType === 'Meccan' ? 'مكية' : 'مدنية'} · ${s.numberOfAyahs} آية`;
  audio.src = rec.url(n); renderList(); setMedia(s);
  if (play) audio.play().catch(() => {});
}
// أزرار التحكم في شاشة القفل والإشعارات
function setMedia(s) {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({ title: s.name, artist: rec ? rec.label : '', album: 'القرآن الكريم' });
    for (const [k, f] of [['play', () => audio.play()], ['pause', () => audio.pause()], ['previoustrack', () => step(-1)], ['nexttrack', () => step(1)]]) navigator.mediaSession.setActionHandler(k, f);
  } catch {}
}
const reload = keepTime => { if (!audio.src) return renderList(); const t = audio.currentTime, p = !audio.paused; choose(cur, p); if (keepTime) pendingTime = t; };

// تحميل قائمة القراء وملء الاختيار (يُستدعى عند البدء)
async function loadAllReciters() {
  const note = $('#reciterNote');
  note.textContent = 'جارٍ تحميل القراء…';
  const list = await fetchReciters(), hadAudio = !!audio.src;
  recs = list || FALLBACK;
  rec = recs.find(r => r.label.includes('العفاسي') && r.moshaf.includes('حفص')) || recs.find(r => r.label.includes('العفاسي')) || recs[0];
  note.textContent = list ? `${new Set(recs.map(r => r.label)).size} قارئ` : 'تعذر تحميل القائمة الكاملة، يُعرض عدد محدود من القراء.';
  fillReciters(); renderList();
  if (hadAudio) reload(true);
}
async function initQuran() {
  resetPlayer(); renderList();
  await loadAllReciters();
}
$('#surahList').addEventListener('click', e => { const b = e.target.closest('.si'); if (b) choose(+b.dataset.n); });
$('#surahSearch').addEventListener('input', renderList);
$('#reciterSearch').addEventListener('input', fillReciters);
$('#reciterSelect').onchange = () => { const r = recs.find(x => x.key === $('#reciterSelect').value); if (!r) return; rec = r; reload(true); };
$('#playPause').onclick = () => { if (!audio.src) choose(cur, true); else if (audio.paused) audio.play().catch(() => toast('تعذر تشغيل الصوت')); else audio.pause(); };
const step = d => { let n = cur + d; while (n >= 1 && n <= 114 && rec && rec.list && !rec.list.has(n)) n += d; if (n >= 1 && n <= 114) choose(n); };
$('#prevSurah').onclick = () => step(-1); $('#nextSurah').onclick = () => step(1);
audio.onplay = () => setPlay(true);
audio.onpause = () => setPlay(false);
audio.onended = () => { const m = $('#endSel').value; if (m === 'repeat') { audio.currentTime = 0; audio.play().catch(() => {}); } else if (m === 'next') step(1); };
audio.onerror = () => { if (!audio.getAttribute('src')) return; toast(navigator.onLine === false ? 'لا يوجد اتصال بالإنترنت' : 'تعذر تشغيل هذه السورة، جرّب قارئًا آخر أو أعد المحاولة'); setPlay(false); };
audio.onloadedmetadata = () => { if (pendingTime) { audio.currentTime = pendingTime; pendingTime = 0; } $('#audioDuration').textContent = fmtTime(audio.duration); };
audio.ontimeupdate = () => {
  if (Number.isFinite(audio.duration) && audio.duration) $('#audioSeek').value = audio.currentTime / audio.duration * 100;
  $('#audioCurrent').textContent = fmtTime(audio.currentTime);
};
$('#audioSeek').oninput = e => { if (Number.isFinite(audio.duration)) audio.currentTime = audio.duration * (+e.target.value / 100); };
initQuran().then(() => {
  // رابط مشاركة: ?s=رقم السورة&r=مفتاح القارئ (يُفتح دون تشغيل تلقائي)
  const q = new URLSearchParams(location.search), s = +q.get('s'), r = recs.find(x => x.key === q.get('r'));
  if (r) { rec = r; fillReciters(); }
  if (s >= 1 && s <= 114) choose(s, false);
});
$('#shareBtn').onclick = async () => {
  const url = `${location.origin}${location.pathname}?s=${cur}${rec ? '&r=' + encodeURIComponent(rec.key) : ''}#quran`, title = `${surahs[cur - 1].name} — ${rec ? rec.label : ''}`;
  try { if (navigator.share) await navigator.share({ title, url }); else { await navigator.clipboard.writeText(url); toast('نُسخ رابط السورة'); } }
  catch (e) { if (e.name !== 'AbortError') toast('تعذر المشاركة، انسخ الرابط من شريط العنوان'); }
};

// ---------- مؤقت النوم ----------
let sleepTimer;
$('#sleepSel').onchange = e => {
  clearTimeout(sleepTimer); const min = +e.target.value; if (!min) return toast('أُلغي مؤقت النوم');
  sleepTimer = setTimeout(() => { audio.pause(); $('#sleepSel').value = '0'; toast('انتهى مؤقت النوم'); }, min * 60000);
  toast(`سيتوقف الصوت بعد ${min} دقيقة`);
};


// ---------- مواقيت الصلاة: طريقة أم القرى فقط ----------
const NAMES = [['Fajr', 'الفجر', 'moon'], ['Sunrise', 'الشروق', 'sunrise'], ['Dhuhr', 'الظهر', 'sun'], ['Asr', 'العصر', 'sun2'], ['Maghrib', 'المغرب', 'sunset'], ['Isha', 'العشاء', 'star']];
const DEFAULT_PLACE = { lat: 36.7538, lon: 3.0588, city: 'الجزائر العاصمة، الجزائر' };
let place = DEFAULT_PLACE;
let timings = null, ptz = TZ, loadedDay = '', reqId = 0;

async function placeName(lat, lon) {
  try {
    const j = await getJSON(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=ar`);
    const n = j.city || j.locality || j.principalSubdivision;
    if (n) return [n, j.countryName].filter(Boolean).join('، ');
  } catch {}
  try {
    const a = (await getJSON(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&accept-language=ar&lat=${lat}&lon=${lon}`)).address || {};
    const n = a.city || a.town || a.village || a.county || a.state;
    if (n) return [n, a.country].filter(Boolean).join('، ');
  } catch {}
  return 'الموقع المحدد';
}
async function loadPrayer() {
  const id = ++reqId, [y, m, d] = ymd();
  loadedDay = `${y}-${m}-${d}`;
  const url = `https://api.aladhan.com/v1/timings/${pad(d)}-${pad(m)}-${y}?latitude=${place.lat}&longitude=${place.lon}&method=4`;
  let j = null;
  for (let i = 0; i < 2 && !j; i++) { try { j = await getJSON(url, 10000); if (!j?.data?.timings) j = null; } catch {} if (id !== reqId) return; }
  if (!j) {
    const msg = navigator.onLine === false ? 'لا يوجد اتصال بالإنترنت. اتصل ثم اضغط زر التحديث.' : 'تعذر تحميل المواقيت. اضغط زر التحديث للمحاولة مجددًا.';
    if (timings) toast(msg); else $('#prayerGrid').innerHTML = `<div class="empty">${msg}</div>`;
    return;
  }
  timings = j.data.timings; ptz = j.data.meta?.timezone || TZ;
  $('#prayerCity').textContent = place.city;
  $('#prayerMeta').textContent = 'أم القرى · ' + (ptz === TZ ? 'توقيت الجزائر' : ptz);
  renderPrayer();
}
function minutesNow(tz) {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
  return (+p.find(x => x.type === 'hour').value % 24) * 60 + +p.find(x => x.type === 'minute').value;
}
function renderPrayer() {
  if (!timings) return;
  const t = k => timings[k].split(' ')[0], mins = k => { const [h, m] = t(k).split(':').map(Number); return h * 60 + m; }, now = minutesNow(ptz);
  let next = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].find(k => mins(k) > now), wrap = 0;
  if (!next) { next = 'Fajr'; wrap = 1440; }
  const diff = mins(next) + wrap - now, h = Math.floor(diff / 60);
  $('#nextName').textContent = NAMES.find(n => n[0] === next)[1];
  $('#nextTime').textContent = `${t(next)} · بعد ${h ? h + ' س ' : ''}${diff % 60} د`;
  const night = mins('Fajr') + 1440 - mins('Maghrib'), at = x => { x = ((Math.round(x) % 1440) + 1440) % 1440; return `${pad(Math.floor(x / 60))}:${pad(x % 60)}`; };
  $('#nightMid').textContent = at(mins('Maghrib') + night / 2); $('#nightLast').textContent = at(mins('Maghrib') + night * 2 / 3);
  $('#prayerGrid').innerHTML = NAMES.map(([k, n, i]) => `<div class="pc ${k === next ? 'next' : ''}">${ic(i)}<small>${n}</small><strong>${t(k)}</strong></div>`).join('');
}
const locBtn = $('#locateBtn'), locLabel = locBtn.querySelector('span');
locBtn.onclick = () => {
  if (!navigator.geolocation) return toast('تحديد الموقع غير مدعوم في هذا المتصفح');
  locBtn.disabled = true; locLabel.textContent = 'جارٍ التحديد…';
  navigator.geolocation.getCurrentPosition(async p => {
    const lat = +p.coords.latitude.toFixed(4), lon = +p.coords.longitude.toFixed(4);
    place = { lat, lon, city: await placeName(lat, lon) };
    locBtn.disabled = false; locLabel.textContent = 'تغيير الموقع'; loadPrayer();
  }, err => { locBtn.disabled = false; locLabel.textContent = place === DEFAULT_PLACE ? 'تحديد موقعي' : 'تغيير الموقع'; toast(err.code === 1 ? 'لم يُسمح بتحديد الموقع، فعّل الإذن من إعدادات المتصفح' : err.code === 3 ? 'استغرق تحديد الموقع وقتًا طويلًا، حاول مجددًا' : 'تعذر تحديد موقعك حاليًا'); }, { timeout: 10000, maximumAge: 600000 });
};
$('#refreshPrayer').onclick = loadPrayer;


// ---------- مناسبات هجرية وأيام الصيام (أم القرى، محسوبة محليًا) ----------
const hMD = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { timeZone: 'UTC', month: 'numeric', day: 'numeric' });
const hij = dt => { const p = hMD.formatToParts(dt); return [+p.find(x => x.type === 'month').value, +p.find(x => x.type === 'day').value]; };
const EVENTS = { '1-1': 'رأس السنة الهجرية', '1-10': 'يوم عاشوراء', '9-1': 'بداية رمضان', '10-1': 'عيد الفطر', '12-9': 'يوم عرفة', '12-10': 'عيد الأضحى' };
const evOf = dt => EVENTS[hij(dt).join('-')] || '';
const isFast = dt => { const [m, d] = hij(dt), w = dt.getUTCDay(); if (m === 9 || (m === 10 && d === 1) || (m === 12 && d >= 10)) return false; return [13, 14, 15].includes(d) || w === 1 || w === 4; };
function renderOccasion() {
  const [y, m, d] = ymd();
  for (let i = 0; i <= 400; i++) {
    const dt = U(y, m - 1, d + i), n = evOf(dt);
    if (n) {
      $('#occName').textContent = n;
      $('#occLeft').textContent = i === 0 ? 'اليوم' : i === 1 ? 'غدًا' : `بعد ${i} يومًا`;
      return;
    }
  }
}

// ---------- التقويم ----------
let cal = (([y, m]) => ({ y, m: m - 1 }))(ymd()), sel = ymd();
function renderCal() {
  const { y, m } = cal, first = U(y, m, 1).getUTCDay(), dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(), [ty, tm, td] = ymd();
  $('#monthLabel').textContent = fmt({ month: 'long', year: 'numeric' }).format(U(y, m, 1));
  const h1 = fmt({ month: 'long', year: 'numeric' }, 1).format(U(y, m, 1)), h2 = fmt({ month: 'long', year: 'numeric' }, 1).format(U(y, m, dim));
  $('#hijriMonthLabel').textContent = h1 === h2 ? h1 : `${h1} – ${h2}`;
  let html = '';
  for (let i = 0; i < 42; i++) {
    const dt = U(y, m, i - first + 1), Y = dt.getUTCFullYear(), M = dt.getUTCMonth(), D = dt.getUTCDate();
    const ev = evOf(dt), cls = [M !== m && 'out', ev && 'ev', !ev && isFast(dt) && 'fast', Y === ty && M + 1 === tm && D === td && 'today', Y === sel[0] && M + 1 === sel[1] && D === sel[2] && 'sel'].filter(Boolean).join(' ');
    html += `<button class="${cls}" data-d="${Y}-${M + 1}-${D}">${D}<i>${hijriDay.format(dt)}</i></button>`;
  }
  $('#calendarDays').innerHTML = html;
  const s = U(sel[0], sel[1] - 1, sel[2]);
  $('#selectedDateLabel').textContent = `${fmt({ dateStyle: 'full' }).format(s)} · ${fmt({ dateStyle: 'long' }, 1).format(s)}`;
  $('#selectedEvent').textContent = evOf(s) || (isFast(s) ? 'يوم صيام مستحب' : '');
}
$('#calendarDays').addEventListener('click', e => {
  const b = e.target.closest('[data-d]'); if (!b) return;
  sel = b.dataset.d.split('-').map(Number);
  if (sel[1] - 1 !== cal.m) cal = { y: sel[0], m: sel[1] - 1 };
  renderCal();
});
const moveMonth = n => { const d = new Date(Date.UTC(cal.y, cal.m + n, 1)); cal = { y: d.getUTCFullYear(), m: d.getUTCMonth() }; renderCal(); };
$('#todayBtn').onclick = () => { cal = (([y, m]) => ({ y, m: m - 1 }))(ymd()); sel = ymd(); renderCal(); };
$('#prevMonth').onclick = () => moveMonth(-1); $('#nextMonth').onclick = () => moveMonth(1);

// ---------- نموذج التواصل (نافذة عائمة) + Turnstile + مرفق ----------
const MAX_FILE = 10 * 1024 * 1024, file = $('#fileInput'), dlg = $('#contactDlg');
let tsKey = '', tsId = null, tsToken = '', tsInit = null;
function showFile() { const f = file.files[0]; $('#fileName').textContent = f ? `${f.name} (${(f.size / 1048576).toFixed(1)} MB)` : ''; $('#fileClear').hidden = !f; }
// الحماية تعمل تلقائيًا عند ضبط TURNSTILE_SITE_KEY و TURNSTILE_SECRET_KEY؛ وإلا يعمل النموذج بالحمايات الأخرى
function ensureTurnstile() {
  return tsInit || (tsInit = (async () => {
    try { tsKey = (await (await fetch('/api/config', { cache: 'no-store' })).json()).turnstileSiteKey || ''; } catch {}
    if (!tsKey) return;
    await new Promise(res => {
      window.onTurnstileReady = res;
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileReady'; s.async = true; s.onerror = () => res();
      document.head.append(s);
    });
    if (!window.turnstile) return;
    tsId = turnstile.render('#turnstile-widget', {
      sitekey: tsKey, size: 'flexible', language: 'ar', appearance: 'interaction-only',
      theme: document.body.classList.contains('light') ? 'light' : 'dark',
      callback: t => { tsToken = t; }, 'expired-callback': () => { tsToken = ''; }, 'error-callback': () => { tsToken = ''; }
    });
  })());
}
const waitToken = async ms => { for (let t = 0; t < ms && !tsToken; t += 150) await new Promise(r => setTimeout(r, 150)); return tsToken; };
$$('[data-contact]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); $('#contactStatus').textContent = ''; dlg.showModal(); ensureTurnstile(); }));
$('#dlgClose').onclick = () => dlg.close();
dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
$('#fileBtn').onclick = () => file.click();
file.onchange = () => { const f = file.files[0]; if (f && f.size > MAX_FILE) { toast('الحد الأقصى للملف 10 ميغابايت'); file.value = ''; } showFile(); };
$('#fileClear').onclick = () => { file.value = ''; showFile(); };
const HTTP = { 413: 'الملف كبير جدًا.', 429: 'رسائل كثيرة، حاول لاحقًا.', 503: 'خدمة الإرسال غير متاحة حاليًا.', 502: 'تعذر إيصال الرسالة الآن، حاول بعد قليل.' };
const ERR = { bad_file: 'نوع الملف أو حجمه غير مقبول.', rate: 'رسائل كثيرة، حاول لاحقًا.', captcha: 'فشل التحقق الأمني، أعد المحاولة.', invalid: 'تأكد من الاسم والرسالة.', not_configured: 'خدمة الإرسال غير مفعّلة بعد.' };
$('#contactForm').addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.currentTarget, st = $('#contactStatus'), btn = form.querySelector('[type=submit]');
  if (form.elements.website.value) return;
  btn.disabled = true; st.textContent = 'جارٍ الإرسال…';
  try {
    await ensureTurnstile();
    if (tsKey) {
      if (!window.turnstile) throw new Error('captcha');
      if (!(await waitToken(12000))) throw new Error('captcha');
    }
    const fd = new FormData(form); if (tsToken) fd.set('cf-turnstile-response', tsToken);
    let r;
    for (let i = 0; i < 2; i++) { try { r = await fetch('/api/contact', { method: 'POST', body: fd }); break; } catch (err) { if (i) throw err; } }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const er = new Error(j.error || 'http'); er.status = r.status; throw er; }
    form.reset(); showFile();
    st.textContent = j.file === false ? 'وصلت رسالتك، وتعذر إرفاق الملف.' : 'وصلت رسالتك، شكرًا لك.';
    setTimeout(() => { if (dlg.open) dlg.close(); }, 1600);
  } catch (err) {
    st.textContent = ERR[err.message] || HTTP[err.status] || (navigator.onLine === false ? 'لا يوجد اتصال بالإنترنت.' : `تعذر الإرسال (${err.status || 'شبكة'}). حاول مرة أخرى.`);
  } finally {
    btn.disabled = false; tsToken = '';
    if (window.turnstile && tsId !== null) turnstile.reset(tsId);
  }
});

// ---------- التنقل: تمييز القسم الحالي ----------
const navLinks = $$('.bnav a, .topnav a');
const io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) navLinks.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + x.target.id)); }), { rootMargin: '-45% 0px -50% 0px' });
$$('main section[id]').forEach(s => io.observe(s));

// ---------- ظهور ناعم أثناء التمرير ----------
const rvIO = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { x.target.classList.add('in'); rvIO.unobserve(x.target); } }), { rootMargin: '0px 0px -6% 0px' });
$$('.sec > h2, .sec .card, .rowhead, .stats .card').forEach(el => { el.classList.add('rv'); rvIO.observe(el); });

// ---------- تشغيل أولي ----------
renderToday(); renderCal(); renderOccasion(); loadPrayer();
setInterval(() => {
  renderToday();
  const [y, m, d] = ymd();
  if (loadedDay !== `${y}-${m}-${d}`) { loadPrayer(); renderCal(); renderOccasion(); renderFriday(); } else renderPrayer();
}, 30000);

// ---------- نافذة «من أنا»: الصورة المحمية والموسيقى (تُوقف القرآن أثناء التشغيل) ----------
const aboutDlg = $('#aboutDlg'), music = $('#musicAudio');
let photoReady = false;
function drawPhoto() {
  if (photoReady) return; photoReady = true;
  const cv = $('#photoCv'), img = new Image();
  img.onload = () => {
    const w = cv.width = 360 * Math.min(devicePixelRatio || 1, 2), h = cv.height = 480 * Math.min(devicePixelRatio || 1, 2);
    const k = Math.max(w / img.width, h / img.height), dw = img.width * k, dh = img.height * k;
    cv.getContext('2d').drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    $('#photoFb').hidden = true;
  };
  img.onerror = () => { photoReady = false; };
  img.src = '/assets/me.webp';
}
// حماية الصورة من التنزيل: لوحة رسم بدل وسم صورة + طبقة شفافة + منع القائمة السياقية والسحب (حماية عملية لا مطلقة)
['contextmenu', 'dragstart', 'selectstart'].forEach(ev => $('#photoBox').addEventListener(ev, e => e.preventDefault()));
aboutDlg.addEventListener('contextmenu', e => { if (e.target.closest('#photoBox')) e.preventDefault(); });

const musicMedia = () => {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({ title: 'لغتي العربية', artist: 'محمد الهادي' });
    for (const [k, f] of [['play', () => music.play()], ['pause', () => music.pause()], ['previoustrack', null], ['nexttrack', null]]) navigator.mediaSession.setActionHandler(k, f);
  } catch {}
};
const stopMusic = () => { music.pause(); try { music.currentTime = 0; } catch {} };
const musicMsg = t => { $('#musicStatus').textContent = t; };
let retryOnTap = null;
async function playMusic() {
  musicMsg('');
  if (retryOnTap) { aboutDlg.removeEventListener('pointerdown', retryOnTap); retryOnTap = null; }
  try { await music.play(); }
  catch (e) {
    if (e.name === 'AbortError') return;
    if (e.name === 'NotAllowedError') {   // المتصفح منع التشغيل التلقائي: نبدأ عند أول لمسة داخل النافذة
      retryOnTap = () => { retryOnTap = null; playMusic(); };
      aboutDlg.addEventListener('pointerdown', retryOnTap, { once: true });
    } else musicMsg(navigator.onLine === false ? 'لا يوجد اتصال بالإنترنت، تعذر تشغيل الموسيقى.' : 'تعذر تشغيل الموسيقى الآن.');
  }
}
music.onplay = () => { audio.pause(); musicMedia(); };  // الموسيقى تُوقف القرآن حتى لا يختلطا
music.onpause = () => { if (audio.getAttribute('src') && !aboutDlg.open) setMedia(surahs[cur - 1]); };
music.onerror = () => { if (music.getAttribute('src')) musicMsg(navigator.onLine === false ? 'لا يوجد اتصال بالإنترنت، تعذر تحميل الموسيقى.' : 'تعذر تحميل الموسيقى، حاول لاحقًا.'); };
audio.addEventListener('play', () => { if (!music.paused) music.pause(); });   // وإن شُغّل القرآن (مثلًا من شاشة القفل) تتوقف الموسيقى

function openAbout() {
  if (!aboutDlg.open) aboutDlg.showModal();
  drawPhoto(); stopMusic(); playMusic();
  if (location.hash === '#about') history.replaceState(null, '', location.pathname + location.search);
}
aboutDlg.addEventListener('close', () => { if (retryOnTap) { aboutDlg.removeEventListener('pointerdown', retryOnTap); retryOnTap = null; } stopMusic(); musicMsg(''); });
$('#aboutClose').onclick = () => aboutDlg.close();
aboutDlg.addEventListener('click', e => { if (e.target === aboutDlg) aboutDlg.close(); });
$$('[data-about]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); openAbout(); }));
if (location.hash === '#about') openAbout();

// ---------- تذكير الجمعة ----------
function renderFriday() { const [y, m, d] = ymd(); $('#fridaySec').hidden = U(y, m - 1, d).getUTCDay() !== 5; }
$('#kahfBtn').onclick = () => {
  if (!rec) return toast('جارٍ تحميل القراء، حاول بعد لحظات');
  $('#quran').scrollIntoView({ behavior: 'smooth' }); choose(18, true);
};
renderFriday();

// ---------- محوّل التاريخ (هجري ↔ ميلادي، أم القرى، محليًا) ----------
const HM = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];
const hFull = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric' });
const hParts = dt => { const p = hFull.formatToParts(dt), g = t => +p.find(x => x.type === t).value; return [g('year'), g('month'), g('day')]; };
function hijriToGreg(hy, hm, hd) {
  const est = new Date(Date.UTC(622, 6, 19, 12));
  est.setUTCDate(est.getUTCDate() + Math.round((hy - 1) * 354.36707 + (hm - 1) * 29.530589 + hd - 1));
  for (let k = -40; k <= 40; k++) { const dt = new Date(est.getTime() + k * 864e5), p = hParts(dt); if (p[0] === hy && p[1] === hm && p[2] === hd) return dt; }
  return null;
}
$('#cvHm').innerHTML = HM.map((n, i) => `<option value="${i + 1}">${n}</option>`).join('');
function convG() {
  const v = $('#cvG').value, o = $('#cvGOut'); if (!v) { o.textContent = ''; return; }
  const [y, m, d] = v.split('-').map(Number);
  if (y < 1900 || y > 2100) { o.textContent = 'اختر تاريخًا بين 1900 و2100.'; return; }
  o.textContent = fmt({ dateStyle: 'full' }, 1).format(U(y, m - 1, d));
}
function convH() {
  const d = +$('#cvHd').value, m = +$('#cvHm').value, y = +$('#cvHy').value, o = $('#cvHOut');
  if (!$('#cvHd').value || !$('#cvHy').value) { o.textContent = ''; return; }
  if (!Number.isInteger(d) || !Number.isInteger(y) || d < 1 || d > 30 || y < 1300 || y > 1600) { o.textContent = 'أدخل يومًا (1–30) وسنة بين 1300 و1600.'; return; }
  const dt = hijriToGreg(y, m, d);
  o.textContent = dt ? fmt({ dateStyle: 'full' }).format(dt) : 'هذا اليوم غير موجود في ذلك الشهر.';
}
['input', 'change'].forEach(ev => { $('#cvG').addEventListener(ev, convG); ['#cvHd', '#cvHm', '#cvHy'].forEach(s => $(s).addEventListener(ev, convH)); });
(() => {
  const [y, m, d] = ymd(), [hy, hm, hd] = hParts(U(y, m - 1, d));
  $('#cvG').value = `${y}-${pad(m)}-${pad(d)}`; $('#cvHd').value = hd; $('#cvHm').value = hm; $('#cvHy').value = hy;
  convG(); convH();
})();
