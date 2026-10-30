/* ============================================================
   UJIAN KELAS 7 — app.js (FINAL + FIX)
   ============================================================ */

const $ = id => document.getElementById(id);

const S = {
  name: '',
  kelas: '',
  sub: '',
  qs: [],
  ans: [],
  i: 0,
  left: 1800, // 30 menit
  tid: null,
  warns: 0,
  startAt: 0,
  finished: false
};

/* ---------- HELPERS ---------- */
const sh = a => a
  .map(v => [Math.random(), v])
  .sort((x, y) => x[0] - y[0])
  .map(v => v[1]);

const lb = s => ({
  matematika: 'Matematika',
  ipa: 'IPA',
  ips: 'IPS',
  bahasa: 'Bahasa Indonesia'
}[s] || s);

const pad = n => String(n).padStart(2, '0');
const fmtTime = s => `${pad(~~(s / 60))}:${pad(s % 60)}`;
const storageKey = () => `ujian_${S.kelas}_${S.sub}_${S.name}`;

/* ============================================================
   AUDIO
   ============================================================ */
const bp = (f = 660, d = 120, t = 'sine', v = .15) => {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    const a = new AC();
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = t;
    o.frequency.value = f;
    g.gain.setValueAtTime(v, a.currentTime);
    g.gain.exponentialRampToValueAtTime(.001, a.currentTime + d / 1000);
    o.connect(g);
    g.connect(a.destination);
    o.start();
    o.stop(a.currentTime + d / 1000);
  } catch (e) {}
};

const sExit = () => {
  bp(880, 120, 'square', .15);
  setTimeout(() => bp(440, 220, 'square', .15), 110);
};
const sTick = () => bp(1200, 40, 'sine', .06);
const sWin = () => [523, 659, 784, 1047].forEach((f, i) =>
  setTimeout(() => bp(f, 180, 'sine', .14), i * 110));
const sLose = () => [440, 349, 294, 196].forEach((f, i) =>
  setTimeout(() => bp(f, 200, 'square', .14), i * 130));
const sWarn = () => {
  bp(600, 100, 'square', .2);
  setTimeout(() => bp(400, 100, 'square', .2), 120);
};

/* ============================================================
   START QUIZ
   ============================================================ */
function go() {
  const n = $('nn').value.trim();
  const k = $('kk').value;
  const s = $('ss').value;
  $('er').textContent = '';

  if (!n || !k || !s) {
    $('er').textContent = !n
      ? 'Nama wajib diisi'
      : !k
        ? 'Pilih kelas dulu'
        : 'Pilih mata pelajaran';
    return;
  }

  const bk = window.BANK?.[s];
  if (!bk || bk.length < 30) {
    $('er').textContent = 'Bank soal belum lengkap';
    return;
  }

  Object.assign(S, {
    name: n, kelas: k, sub: s,
    left: 1800, i: 0, warns: 0,
    startAt: Date.now(), finished: false
  });

  // Cek resume
  const saved = loadProgress();
  if (saved && confirm('Ditemukan sesi ujian yang belum selesai. Lanjutkan?')) {
    S.qs = saved.qs;
    S.ans = saved.ans;
    S.i = saved.i;
    S.left = saved.left;
  } else {
    // Soal baru + acak
    S.qs = sh([...bk]).slice(0, 30).map(([q, o, a]) => {
      const correct = o[a];
      const opts = sh([...o]);
      return { q, opts, ci: opts.indexOf(correct) };
    });
    S.ans = Array(30).fill(null);
  }

  $('lg').style.display = 'none';
  $('qz').style.display = 'block';
  $('qn').textContent = n;
  $('qs').textContent = `${k} · ${lb(s)}`;

  timer();
  draw();
  sTick();
}

/* ============================================================
   TIMER
   ============================================================ */
function timer() {
  clearInterval(S.tid);
  S.tid = setInterval(() => {
    S.left--;
    const t = $('tm');
    t.textContent = fmtTime(S.left);

    if (S.left <= 300) t.classList.add('w');
    if (S.left <= 0) {
      clearInterval(S.tid);
      fin(true);
    }

    if (S.left % 5 === 0) saveProgress();
  }, 1000);
}

/* ============================================================
   RENDER SOAL
   ============================================================ */
function draw() {
  const q = S.qs[S.i];
  $('qi').textContent = `Soal ${S.i + 1} / ${S.qs.length}`;
  $('qq').textContent = q.q;
  $('pg').style.width = ((S.i + 1) / S.qs.length * 100) + '%';

  const box = $('qo');
  box.innerHTML = '';

  q.opts.forEach((o, x) => {
    const el = document.createElement('div');
    el.className = 'o' + (S.ans[S.i] === x ? ' s' : '');
    el.style.animationDelay = x * 40 + 'ms';
    el.innerHTML = `<div class="l">${'ABCD'[x]}</div><div>${o}</div>`;
    
    el.onclick = () => {
      S.ans[S.i] = x;
      sTick();
      saveProgress();
      draw(); // Render ulang buat update state 'selected'
      // FIX: Gak ada setTimeout auto-pindah di sini.
      // User harus klik tombol "Selanjutnya".
    };
    
    box.appendChild(el);
  });

  $('bp').disabled = S.i === 0;
  $('bn').textContent = S.i === S.qs.length - 1
    ? 'SELESAI ✓'
    : 'Selanjutnya →';
}

/* ============================================================
   NAVIGASI
   ============================================================ */
function mv(d) {
  if (d > 0 && S.i === S.qs.length - 1) {
    const kosong = S.ans
      .map((a, i) => a === null ? i + 1 : null)
      .filter(x => x !== null);

    if (kosong.length) {
      const msg = kosong.length === 1
        ? `Soal ${kosong[0]} belum dijawab. Lanjut selesai?`
        : `Masih ada ${kosong.length} soal belum dijawab. Lanjut selesai?`;
      if (confirm(msg)) {
        S.i = kosong[0] - 1;
        draw();
        return;
      }
      return;
    }
    return fin();
  }
  S.i = Math.max(0, Math.min(S.qs.length - 1, S.i + d));
  draw();
}

/* ============================================================
   FINISH — hitung nilai & tampilkan
   ============================================================ */
function fin(to = false) {
  if (S.finished) return;
  S.finished = true;
  
  // FIX: Matiin overlay anti-cheat kalau lagi nyala
  $('bk').classList.remove('on');
  warned = false;
  
  clearInterval(S.tid);
  clearProgress();

  let c = 0, w = 0;
  S.qs.forEach((q, i) => S.ans[i] === q.ci ? c++ : w++);
  const sc = Math.round(c / S.qs.length * 100);

  $('qz').style.display = 'none';
  $('rs').style.display = 'block';

  const box = $('sc');
  box.className = 'sc ' + (sc >= 70 ? 'p' : 'f');
  $('sn').textContent = sc;
  $('sg').textContent =
    sc >= 90 ? 'A · Sangat Baik' :
    sc >= 80 ? 'B · Baik' :
    sc >= 70 ? 'C · Cukup' :
    sc >= 60 ? 'D · Kurang' :
               'E · Perlu Belajar Lagi';

  $('rc').textContent = c;
  $('rw').textContent = w;
  $('rt').textContent = S.qs.length;

  // Pembahasan
  const rv = $('rv');
  rv.innerHTML = '';
  S.qs.forEach((q, i) => {
    const ok = S.ans[i] === q.ci;
    const el = document.createElement('div');
    el.className = 'rv ' + (ok ? 'r' : 'w');
    el.style.animationDelay = i * 20 + 'ms';
    el.innerHTML =
      `<div class="q">${i + 1}. ${q.q}</div>` +
      `<div class="a">Jawaban kamu: <b>${S.ans[i] === null ? '—' : q.opts[S.ans[i]]}</b></div>` +
      (ok ? '' : `<div class="a">Jawaban benar: <b>${q.opts[q.ci]}</b></div>`);
    rv.appendChild(el);
  });

  sc >= 70 ? sWin() : sLose();
  if (to) setTimeout(() => alert('Waktu habis!'), 300);
}

/* ============================================================
   EXPORT HASIL
   ============================================================ */
function exportResult() {
  let c = 0;
  S.qs.forEach((q, i) => S.ans[i] === q.ci && c++);
  const sc = Math.round(c / S.qs.length * 100);
  const dur = 1800 - S.left;
  const lines = [];

  lines.push('===============================================');
  lines.push('         HASIL UJIAN ONLINE KELAS 7');
  lines.push('===============================================');
  lines.push(`Nama       : ${S.name}`);
  lines.push(`Kelas      : ${S.kelas}`);
  lines.push(`Pelajaran  : ${lb(S.sub)}`);
  lines.push(`Tanggal    : ${new Date().toLocaleString('id-ID')}`);
  lines.push(`Durasi     : ${fmtTime(dur)} (dari 30:00)`);
  lines.push('-----------------------------------------------');
  lines.push(`Nilai      : ${sc} / 100`);
  lines.push(`Grade      : ${
    sc >= 90 ? 'A · Sangat Baik' :
    sc >= 80 ? 'B · Baik' :
    sc >= 70 ? 'C · Cukup' :
    sc >= 60 ? 'D · Kurang' :
               'E · Perlu Belajar Lagi'
  }`);
  lines.push(`Benar      : ${c}`);
  lines.push(`Salah      : ${S.qs.length - c}`);
  lines.push(`Total      : ${S.qs.length}`);
  lines.push('===============================================');
  lines.push('');
  lines.push('PEMBAHASAN:');
  lines.push('');

  S.qs.forEach((q, i) => {
    const ok = S.ans[i] === q.ci;
    lines.push(`${i + 1}. ${q.q}`);
    lines.push(`   Jawaban kamu : ${S.ans[i] === null ? '—' : q.opts[S.ans[i]]} ${ok ? '✓' : '✗'}`);
    if (!ok) lines.push(`   Jawaban benar: ${q.opts[q.ci]}`);
    lines.push('');
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `hasil_${S.name}_${S.kelas}_${lb(S.sub)}.txt`.replace(/\s+/g, '_');
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ============================================================
   SAVE / LOAD PROGRESS
   ============================================================ */
function saveProgress() {
  if (S.finished || !S.name) return;
  try {
    localStorage.setItem(storageKey(), JSON.stringify({
      qs: S.qs, ans: S.ans, i: S.i,
      left: S.left, startAt: S.startAt
    }));
  } catch (e) {}
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(storageKey());
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

function clearProgress() {
  try { localStorage.removeItem(storageKey()); } catch (e) {}
}

/* ============================================================
   DETEKSI KELUAR / ANTI-CHEAT
   ============================================================ */
let warned = false;
const MAX_WARN = 3;

function warnExit() {
  if (warned || S.finished) return;
  warned = true;
  S.warns++;

  if (S.warns >= MAX_WARN) {
    $('bk').querySelector('.t').textContent = 'BATAS TERLAMPAUI!';
    $('bk').querySelector('.s').textContent = `Kamu sudah keluar ${MAX_WARN}x. Ujian otomatis dikumpulkan.`;
    $('bk').classList.add('on');
    sWarn();
    setTimeout(() => {
      $('bk').classList.remove('on');
      fin();
    }, 2000);
    return;
  }

  $('bk').querySelector('.t').textContent = 'KELUAR DARI UJIAN?';
  $('bk').querySelector('.s').textContent = `Peringatan ${S.warns}/${MAX_WARN} · Jangan tinggalkan tab!`;
  $('bk').classList.add('on');
  sWarn();
  setTimeout(() => {
    $('bk').classList.remove('on');
    warned = false;
  }, 1600);
}

const inQuiz = () => $('qz').style.display === 'block' && !S.finished;

window.addEventListener('beforeunload', e => {
  if (inQuiz() && S.ans.some(a => a !== null)) {
    e.preventDefault();
    e.returnValue = '';
    return '';
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && inQuiz()) warnExit();
});

window.addEventListener('blur', () => {
  if (inQuiz()) warnExit();
});

document.addEventListener('contextmenu', e => {
  if (inQuiz()) e.preventDefault();
});

document.addEventListener('keydown', e => {
  if (!inQuiz()) return;
  const bad =
    e.key === 'F12' ||
    (e.ctrlKey && e.shiftKey && ['I','J','C'].includes(e.key.toUpperCase())) ||
    (e.ctrlKey && e.key.toLowerCase() === 'u') ||
    (e.ctrlKey && e.key.toLowerCase() === 's') ||
    (e.ctrlKey && e.key.toLowerCase() === 'p') ||
    (e.metaKey && e.shiftKey && ['3','4','5'].includes(e.key));
  if (bad) {
    e.preventDefault();
    sWarn();
  }
});

['copy','cut','paste'].forEach(ev => {
  document.addEventListener(ev, e => {
    if (inQuiz()) {
      e.preventDefault();
      sWarn();
    }
  });
});

document.addEventListener('dragstart', e => {
  if (inQuiz()) e.preventDefault();
});

window.addEventListener('pagehide', () => saveProgress());