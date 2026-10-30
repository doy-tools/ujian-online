/* ============================================================
   UJIAN KELAS 7 — app.js
   Logika utama: login, ambil soal, timer, render, scoring, deteksi keluar
   ============================================================ */

const $ = id => document.getElementById(id);

const S = {
  name: '',
  kelas: '',
  sub: '',
  qs: [],
  ans: [],
  i: 0,
  left: 1800,   // 30 menit
  tid: null
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

/* ============================================================
   AUDIO — Web Audio API, tanpa file eksternal
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
  setTimeout(() => bp(f, 180, 'sine', .14), i * 110)
);
const sLose = () => [440, 349, 294, 196].forEach((f, i) =>
  setTimeout(() => bp(f, 200, 'square', .14), i * 130)
);

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

  // reset state
  Object.assign(S, {
    name: n, kelas: k, sub: s,
    left: 1800, i: 0
  });

  // ambil 30 soal acak, acak opsi juga
  S.qs = sh([...bk]).slice(0, 30).map(([q, o, a]) => {
    const correct = o[a];
    const opts = sh([...o]);
    return { q, opts, ci: opts.indexOf(correct) };
  });
  S.ans = Array(30).fill(null);

  // switch layar
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
    const m = ~~(S.left / 60);
    const s = S.left % 60;
    const t = $('tm');
    t.textContent =
      `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    if (S.left <= 300) t.classList.add('w');
    if (S.left <= 0) {
      clearInterval(S.tid);
      fin(true);
    }
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
      draw();
      if (S.i < S.qs.length - 1) {
        setTimeout(() => mv(1), 350);
      }
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
  // kalau di soal terakhir & mau selesai
  if (d > 0 && S.i === S.qs.length - 1) {
    if (S.ans.includes(null)) {
      const f = S.ans.indexOf(null);
      if (confirm(`Soal ${f + 1} belum dijawab. Lanjut selesai?`)) {
        S.i = f;
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
  clearInterval(S.tid);

  let c = 0, w = 0;
  S.qs.forEach((q, i) => S.ans[i] === q.ci ? c++ : w++);
  const sc = Math.round(c / S.qs.length * 100);

  // switch layar
  $('qz').style.display = 'none';
  $('rs').style.display = 'block';

  // skor box
  const box = $('sc');
  box.className = 'sc ' + (sc >= 70 ? 'p' : 'f');
  $('sn').textContent = sc;
  $('sg').textContent =
    sc >= 90 ? 'A · Sangat Baik' :
    sc >= 80 ? 'B · Baik' :
    sc >= 70 ? 'C · Cukup' :
    sc >= 60 ? 'D · Kurang' :
               'E · Perlu Belajar Lagi';

  // meta
  $('rc').textContent = c;
  $('rw').textContent = w;
  $('rt').textContent = S.qs.length;

  // pembahasan
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

  // suara
  sc >= 70 ? sWin() : sLose();

  // notif waktu habis
  if (to) {
    setTimeout(() => alert('Waktu habis!'), 300);
  }
}

/* ============================================================
   DETEKSI KELUAR
   ============================================================ */
let warned = false;

function warnExit() {
  if (warned) return;
  warned = true;
  $('bk').classList.add('on');
  sExit();
  setTimeout(() => {
    $('bk').classList.remove('on');
    warned = false;
  }, 1600);
}

// konfirmasi tutup tab
window.addEventListener('beforeunload', e => {
  const inQuiz = $('qz').style.display === 'block';
  const hasAnswer = S.ans.some(a => a !== null);
  if (inQuiz && hasAnswer) {
    e.preventDefault();
    e.returnValue = '';
    return '';
  }
});

// pindah tab / minimze → blink overlay
document.addEventListener('visibilitychange', () => {
  if (document.hidden && $('qz').style.display === 'block') {
    warnExit();
  }
});

// blur window (klik luar, alt+tab)
window.addEventListener('blur', () => {
  if ($('qz').style.display === 'block') {
    warnExit();
  }
});

// cegah klik kanan & devtools shortcut (opsional)
document.addEventListener('contextmenu', e => {
  if ($('qz').style.display === 'block') e.preventDefault();
});
document.addEventListener('keydown', e => {
  if ($('qz').style.display !== 'block') return;
  // F12 / Ctrl+Shift+I / Ctrl+U
  if (
    e.key === 'F12' ||
    (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
    (e.ctrlKey && e.key === 'u')
  ) {
    e.preventDefault();
  }
});