// UdhaarAI splash — scene components + composed frame.
// Every scene renders the SAME <Frame> with a state object, so a scene's
// first frame always matches the previous scene's last frame.

const { useScene, useTime, Easing, interpolate, animate, clamp } = window;

const SW = 720, SH = 1280;
const BOOK_W = 382, BOOK_H = (BOOK_W * 480) / 659;
const BOOK_CX = 360, BOOK_CY = 496;
const NAV_CX = 58, NAV_CY = 70, NAV_SCALE = 0.155;
const INK = '#E9EFF7', DIM = 'rgba(233,239,247,0.52)';
const DISPLAY = "'Poppins', 'Trebuchet MS', sans-serif";
const UI = "'Manrope', 'Helvetica Neue', Helvetica, sans-serif";

const LANGS = [
  { words: ['Snap.', 'Understand.', 'Collect.'], font: DISPLAY, size: 27 },
  { words: ['स्कैन करें।', 'समझें।', 'वसूली करें।'], font: "'Noto Sans Devanagari', " + DISPLAY, size: 26 },
  { words: ['స్కాన్ చేయండి.', 'అర్థం చేసుకోండి.', 'వసూలు చేయండి.'], font: "'Noto Sans Telugu', " + DISPLAY, size: 24 },
];

// ── audio: tiny synthesized cues, no assets ───────────────────────────────
const Snd = {
  ctx: null, on: true, master: null,
  init() {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.16;
    this.master.connect(this.ctx.destination);
    const wake = () => { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); };
    ['pointerdown', 'keydown', 'touchstart'].forEach((e) => window.addEventListener(e, wake, { passive: true }));
    return this.ctx;
  },
  tone(freq, dur, { type = 'sine', gain = 0.5, at = 0, glide = 0, attack = 0.01 } = {}) {
    const c = this.init(); if (!c || !this.on) return;
    const t0 = c.currentTime + at;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(40, glide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  },
  noise(dur, { gain = 0.2, from = 900, to = 220, q = 1.2, at = 0 } = {}) {
    const c = this.init(); if (!c || !this.on) return;
    const t0 = c.currentTime + at;
    const len = Math.ceil(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = q;
    f.frequency.setValueAtTime(from, t0);
    f.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t0); src.stop(t0 + dur);
  },
  cue(name) {
    if (!this.on) return;
    switch (name) {
      case 'chime':
        this.tone(784, 1.1, { gain: 0.22, attack: 0.08 });
        this.tone(1174.7, 1.3, { gain: 0.12, at: 0.12, attack: 0.1 });
        break;
      case 'whoosh':
        this.noise(0.42, { gain: 0.16, from: 1600, to: 260, q: 0.9 });
        break;
      case 'scan':
        this.tone(420, 0.42, { type: 'triangle', gain: 0.09, glide: 1500, attack: 0.06 });
        break;
      case 'confirm':
        this.tone(1046.5, 0.09, { type: 'triangle', gain: 0.2 });
        this.tone(1568, 0.16, { gain: 0.13, at: 0.06 });
        break;
      case 'think':
        this.tone(523.25, 1.4, { gain: 0.07, attack: 0.4 });
        this.tone(659.25, 1.2, { gain: 0.05, at: 0.18, attack: 0.4 });
        break;
      case 'name':
        this.tone(392, 1.6, { gain: 0.12, attack: 0.25 });
        this.tone(587.33, 1.4, { gain: 0.08, at: 0.22, attack: 0.3 });
        break;
      case 'flash':
        this.noise(0.09, { gain: 0.1, from: 4200, to: 1800, q: 2 });
        break;
      case 'pulse':
        this.tone(330, 0.5, { gain: 0.08, attack: 0.12 });
        break;
      case 'sparkle':
        [2093, 2637, 3136].forEach((f, i) => this.tone(f, 0.16, { gain: 0.07, at: i * 0.06 }));
        break;
      case 'land':
        this.tone(220, 0.7, { type: 'sine', gain: 0.14, glide: 110, attack: 0.05 });
        this.tone(880, 0.5, { gain: 0.05, at: 0.05, attack: 0.15 });
        break;
    }
  },
};

// Fires a cue once per scene mount, when `when` first becomes true during
// forward playback. Scrubbing backwards re-arms it.
function useCue(name, when, enabled) {
  const fired = React.useRef(false);
  React.useEffect(() => {
    if (!enabled) { fired.current = when; return; }
    if (when && !fired.current) { fired.current = true; Snd.cue(name); }
    else if (!when) fired.current = false;
  }, [when, enabled, name]);
}

const PARTS = [];
for (let i = 0; i < 26; i++) {
  const a = Math.sin(i * 12.9898) * 43758.5453;
  const b = Math.sin(i * 78.233) * 12345.6789;
  PARTS.push({
    x: ((a - Math.floor(a)) * 100),
    y: ((b - Math.floor(b)) * 100),
    r: 1 + (i % 3) * 0.9,
    sp: 0.5 + ((i * 7) % 11) / 9,
    o: 0.18 + ((i * 13) % 7) / 18,
    ph: i * 1.7,
  });
}

const PAPERS = [];
for (let i = 0; i < 5; i++) PAPERS.push({ x: 14 + i * 19, sp: 0.28 + i * 0.05, ph: i * 2.3, r: 5 + (i % 3) * 3 });

function Particles({ t, opacity, accent }) {
  return (
    <div style={{ position: 'absolute', inset: 0, opacity, pointerEvents: 'none' }}>
      {PARTS.map((p, i) => {
        const y = (((p.y - t * p.sp * 4.2) % 100) + 100) % 100;
        const x = p.x + Math.sin(t * 0.55 + p.ph) * 1.6;
        const tw = 0.65 + 0.35 * Math.sin(t * 1.9 + p.ph);
        return (
          <div key={i} style={{
            position: 'absolute', left: x + '%', top: y + '%',
            width: p.r * 2, height: p.r * 2, borderRadius: '50%',
            background: i % 4 === 0 ? accent : 'rgba(210,226,255,0.9)',
            opacity: p.o * tw,
            boxShadow: i % 4 === 0 ? '0 0 8px ' + accent : '0 0 6px rgba(180,205,255,0.6)',
          }} />
        );
      })}
    </div>
  );
}

function PaperMotes({ t, opacity, accent }) {
  return (
    <div style={{ position: 'absolute', inset: 0, opacity, pointerEvents: 'none' }}>
      {PAPERS.map((p, i) => {
        const cyc = (((t * p.sp + p.ph) % 4) + 4) % 4;
        const k = cyc / 4;
        return (
          <div key={i} style={{
            position: 'absolute',
            left: (p.x + Math.sin(t * 0.8 + p.ph) * 4) + '%',
            top: (72 - k * 46) + '%',
            width: 9, height: 12, borderRadius: 2,
            background: 'linear-gradient(140deg, rgba(255,236,208,0.75), rgba(255,170,70,0.15))',
            transform: 'rotate(' + (p.r * 6 + Math.sin(t + p.ph) * 14) + 'deg)',
            opacity: Math.sin(k * Math.PI) * 0.5,
          }} />
        );
      })}
    </div>
  );
}

function Neural({ v, t, accent }) {
  if (v <= 0.001) return null;
  const cx = BOOK_CX, cy = BOOK_CY;
  const nodes = [];
  for (let i = 0; i < 9; i++) {
    const ang = (i / 9) * Math.PI * 2 + 0.4;
    const rad = 190 + (i % 3) * 46;
    nodes.push({ x: cx + Math.cos(ang) * rad * 1.02, y: cy + Math.sin(ang) * rad * 0.86 });
  }
  const links = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 0], [0, 4], [2, 6], [1, 7], [3, 8]];
  return (
    <svg width={SW} height={SH} style={{ position: 'absolute', inset: 0, opacity: v }}>
      {links.map(([a, b], i) => {
        const A = nodes[a], B = nodes[b];
        const len = Math.hypot(B.x - A.x, B.y - A.y);
        const dash = clamp((v - 0.05) * 1.4, 0, 1);
        return (
          <line key={i} x1={A.x} y1={A.y} x2={B.x} y2={B.y}
            stroke="rgba(255,168,64,0.42)" strokeWidth="1"
            strokeDasharray={len} strokeDashoffset={len * (1 - dash)} />
        );
      })}
      {links.map(([a, b], i) => {
        const A = nodes[a], B = nodes[b];
        const k = (((t * 0.55 + i * 0.19) % 1) + 1) % 1;
        return (
          <circle key={'d' + i} cx={A.x + (B.x - A.x) * k} cy={A.y + (B.y - A.y) * k}
            r={2.4} fill={accent} opacity={0.85 * Math.sin(k * Math.PI)} />
        );
      })}
      {nodes.map((n, i) => (
        <circle key={'n' + i} cx={n.x} cy={n.y} r={2.6}
          fill="rgba(255,214,170,0.85)" opacity={0.7} />
      ))}
    </svg>
  );
}

function HomeScreen({ k, accent }) {
  const st = (d, sp) => clamp((k - d) / (sp || 0.3), 0, 1);
  const rows = [
    { n: 'Ramesh Kirana', m: '3 bills · 12 days', a: '₹4,250', i: 'R' },
    { n: 'Sunita Devi', m: '1 bill · 4 days', a: '₹1,180', i: 'S' },
    { n: 'Anwar Traders', m: '6 bills · 21 days', a: '₹18,600', i: 'A' },
  ];
  const nav = st(0.1, 0.3), hero = st(0.24, 0.34), btn = st(0.4, 0.3), list = st(0.5, 0.34), tabs = st(0.6, 0.3);
  const rise = (v, d) => 'translateY(' + ((1 - v) * (d || 26)) + 'px)';
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: clamp(k * 1.35, 0, 1), fontFamily: UI }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(120% 60% at 78% -8%, rgba(255,138,23,0.16), transparent 62%),' +
          'radial-gradient(90% 50% at 8% 106%, rgba(34,197,94,0.09), transparent 60%), #070b13',
      }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 0, height: 132, opacity: nav,
        display: 'flex', alignItems: 'center', paddingLeft: 108, paddingRight: 30, gap: 12,
      }}>
        <div style={{ flex: 1, transform: rise(nav, 10) }}>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 26, letterSpacing: '-0.01em', color: INK }}>
            Udhaar<span style={{ color: accent }}>AI</span>
          </div>
          <div style={{ fontSize: 13, color: DIM, marginTop: 2, letterSpacing: '0.06em' }}>SHARMA GENERAL STORE</div>
        </div>
        <div style={{
          width: 46, height: 46, borderRadius: 23, background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.12)', display: 'grid', placeItems: 'center',
          fontSize: 16, fontWeight: 700, color: INK,
        }}>SG</div>
      </div>

      <div style={{
        position: 'absolute', left: 30, right: 30, top: 160, padding: '30px 30px 26px', borderRadius: 30,
        background: 'linear-gradient(158deg, rgba(255,138,23,0.20), rgba(255,138,23,0.04) 62%, rgba(255,255,255,0.02))',
        border: '1px solid rgba(255,175,90,0.22)', opacity: hero, transform: rise(hero),
        boxShadow: '0 30px 70px -40px rgba(255,138,23,0.55)',
      }}>
        <div style={{ fontSize: 14, letterSpacing: '0.12em', color: 'rgba(255,200,140,0.85)' }}>TOTAL UDHAAR PENDING</div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 58, color: INK, marginTop: 8, letterSpacing: '-0.02em' }}>₹1,24,500</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 7, height: 42, marginTop: 20 }}>
          {[38, 22, 54, 30, 68, 46, 84].map((h, i) => (
            <div key={i} style={{
              width: 16, height: (h / 100) * 42 * clamp((k - 0.34 - i * 0.03) / 0.3, 0, 1),
              borderRadius: 4, background: i === 6 ? accent : 'rgba(255,255,255,0.16)',
            }} />
          ))}
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 15, color: '#5FD68A', paddingBottom: 2 }}>+₹8,200 today</div>
        </div>
      </div>

      <div style={{ position: 'absolute', left: 30, right: 30, top: 500, display: 'flex', gap: 14, opacity: btn, transform: rise(btn, 20) }}>
        <div style={{
          flex: 1.25, height: 74, borderRadius: 22, background: 'linear-gradient(180deg,#FF9E3D,' + accent + ')',
          display: 'grid', placeItems: 'center', color: '#2a1400', fontWeight: 800, fontSize: 20,
          boxShadow: '0 18px 40px -20px rgba(255,138,23,0.8)',
        }}>Snap a bill</div>
        <div style={{
          flex: 1, height: 74, borderRadius: 22, border: '1px solid rgba(255,255,255,0.14)',
          background: 'rgba(255,255,255,0.04)', display: 'grid', placeItems: 'center',
          color: INK, fontWeight: 600, fontSize: 19,
        }}>Add customer</div>
      </div>

      <div style={{ position: 'absolute', left: 30, right: 30, top: 610, opacity: list }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
          <div style={{ fontSize: 15, letterSpacing: '0.12em', color: DIM }}>NEEDS FOLLOW-UP</div>
          <div style={{ fontSize: 15, color: accent }}>See all</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rows.map((r, i) => {
            const v = clamp((k - 0.52 - i * 0.07) / 0.32, 0, 1);
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 16, padding: '20px 22px', borderRadius: 22,
                background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.07)',
                opacity: v, transform: 'translateY(' + ((1 - v) * 22) + 'px)',
              }}>
                <div style={{
                  width: 50, height: 50, borderRadius: 25, background: 'rgba(255,138,23,0.16)',
                  color: '#FFC080', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 19,
                }}>{r.i}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 20, fontWeight: 600, color: INK }}>{r.n}</div>
                  <div style={{ fontSize: 14, color: DIM, marginTop: 3 }}>{r.m}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 21, fontWeight: 700, color: '#FFB86B' }}>{r.a}</div>
                  <div style={{ fontSize: 13, color: DIM, marginTop: 3 }}>Remind</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{
        position: 'absolute', left: 30, right: 30, top: 968, padding: '22px 24px', borderRadius: 24,
        background: 'linear-gradient(150deg, rgba(255,138,23,0.10), rgba(255,255,255,0.03))',
        border: '1px solid rgba(255,175,90,0.16)', display: 'flex', gap: 16, alignItems: 'flex-start',
        opacity: st(0.66, 0.3), transform: rise(st(0.66, 0.3), 22),
      }}>
        <div style={{ width: 10, height: 10, borderRadius: 5, background: accent, marginTop: 7, boxShadow: '0 0 12px ' + accent }} />
        <div>
          <div style={{ fontSize: 13, letterSpacing: '0.14em', color: 'rgba(255,200,140,0.8)' }}>AI INSIGHT</div>
          <div style={{ fontSize: 18, color: INK, marginTop: 6, lineHeight: 1.4, textWrap: 'pretty' }}>
            Anwar Traders clears dues after a Friday reminder. Send one today?
          </div>
        </div>
      </div>

      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: 116, opacity: tabs,
        borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(7,11,19,0.9)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        transform: 'translateY(' + ((1 - tabs) * 30) + 'px)',
      }}>
        {['Home', 'Ledger', 'Snap', 'Reports'].map((l, i) => (
          <div key={l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: i === 2 ? 40 : 10, height: i === 2 ? 40 : 10, borderRadius: 20,
              background: i === 2 ? 'linear-gradient(180deg,#FF9E3D,' + accent + ')' : (i === 0 ? accent : 'rgba(255,255,255,0.22)'),
            }} />
            <div style={{ fontSize: 14, color: i === 0 ? INK : DIM }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Frame({ s, cfg }) {
  const t = useTime();
  const acc = cfg.accent;
  const reduce = cfg.reduce;
  const g = (k, d) => (s[k] === undefined ? d : s[k]);

  let bookIn = g('book', 1), bookX = g('bookX', 0), bookBlur = g('bookBlur', 0);
  let bookRot = g('bookRot', 0), pulse = g('pulse', 0), streaks = g('streaks', 0);
  let scan = g('scan', null), rupee = g('rupee', 0.34), neural = g('neural', 0);
  let shieldP = g('shield', 1), shieldGlow = g('shieldGlow', 0.22), ripple = g('ripple', null);
  const udhaar = g('udhaar', 1), ai = g('ai', 1), aiGlow = g('aiGlow', 0.55);
  const words = g('words', [1, 1, 1]);
  let flash = g('flash', 0), ring = g('ring', 0), sparkle = g('sparkle', 0);
  const langFade = g('langFade', [1, 0, 0]);
  const home = g('home', 0), glow = g('glow', 1) * cfg.glow;

  if (reduce) {
    bookX = 0; bookBlur = 0; bookRot = 0; pulse = 0; streaks = 0;
    scan = null; ripple = null; neural = Math.min(neural, 0.22);
    flash = 0; ring = 0; sparkle = 0;
  }

  const breathe = reduce ? 0 : Math.sin(t * 1.25) * 0.006;
  const homeK = Easing.easeInOutCubic(clamp(home, 0, 1));
  const sc = (1 + (NAV_SCALE - 1) * homeK) * (1 + pulse * 0.035 + breathe);
  const tx = bookX + (NAV_CX - BOOK_CX) * homeK;
  const ty = (NAV_CY - BOOK_CY) * homeK;
  const splashFade = g('splashFade', 1);
  const shieldT = Easing.easeOutBack(clamp(shieldP, 0, 1));
  const shieldPulse = reduce ? 0 : (0.5 + 0.5 * Math.sin(t * 2.1)) * 0.35;

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#04070d' }}>
      <div style={{
        position: 'absolute', inset: 0, opacity: 1 - homeK * 0.85,
        background: 'radial-gradient(70% 42% at 50% ' + (36 + Math.sin(t * 0.5) * 1.2) + '%, rgba(255,132,20,0.10), transparent 70%),' +
          'radial-gradient(120% 70% at 50% 118%, rgba(20,40,90,0.35), transparent 70%), #04070d',
      }} />
      <div style={{
        position: 'absolute', left: '50%', top: BOOK_CY, width: 900, height: 900,
        marginLeft: -450, marginTop: -450, pointerEvents: 'none',
        opacity: clamp(glow, 0, 2) * (1 - homeK * 0.9),
        transform: 'scale(' + (0.5 + 0.5 * clamp(glow, 0, 1.4) + (reduce ? 0 : Math.sin(t * 0.9) * 0.02)) + ')',
        background: 'radial-gradient(circle, rgba(255,146,38,0.30) 0%, rgba(255,120,20,0.12) 32%, rgba(255,110,20,0.03) 55%, transparent 70%)',
      }} />

      <Particles t={t} opacity={g('particles', 1) * cfg.particles * (1 - homeK)} accent={acc} />
      <PaperMotes t={t} opacity={g('particles', 1) * cfg.particles * (1 - homeK) * (reduce ? 0 : 1)} accent={acc} />

      <HomeScreen k={homeK} accent={acc} />

      <div style={{ opacity: 1 - homeK }}>
        <Neural v={neural} t={t} accent={acc} />
      </div>

      {/* logo group — travels to the navbar during handoff */}
      <div style={{
        position: 'absolute', left: BOOK_CX - BOOK_W / 2, top: BOOK_CY - BOOK_H / 2,
        width: BOOK_W, height: BOOK_H, opacity: bookIn,
        transform: 'translate(' + tx + 'px,' + ty + 'px) scale(' + sc + ') rotate(' + bookRot + 'deg)',
        transformOrigin: '50% 50%',
        filter: bookBlur > 0.02 ? 'blur(' + bookBlur + 'px)' : 'none',
      }}>
        {streaks > 0.01 && [0, 1, 2, 3].map((i) => (
          <div key={i} style={{
            position: 'absolute', right: '82%', top: (22 + i * 17) + '%',
            width: (90 + i * 46) * streaks, height: 3 + (i % 2) * 2, borderRadius: 4,
            background: 'linear-gradient(90deg, rgba(255,138,23,0) 0%, ' + acc + ' 100%)',
            opacity: streaks * 0.75,
          }} />
        ))}

        <img src="assets/book.png" alt="UdhaarAI notebook" style={{ width: '100%', display: 'block' }} />

        {/* rupee illumination */}
        <div style={{
          position: 'absolute', left: '22%', top: '20%', width: '34%', height: '44%',
          borderRadius: '50%', opacity: rupee * 0.9, mixBlendMode: 'screen',
          background: 'radial-gradient(circle, rgba(255,224,160,0.55), rgba(255,160,50,0.16) 55%, transparent 72%)',
        }} />
        {/* cover highlight sweep */}
        <div style={{
          position: 'absolute', inset: 0, overflow: 'hidden', mixBlendMode: 'screen',
          opacity: reduce ? 0 : 0.5,
        }}>
          <div style={{
            position: 'absolute', top: '-20%', bottom: '-20%', width: '26%',
            left: (((t * 16) % 190) - 40) + '%',
            transform: 'rotate(14deg)',
            background: 'linear-gradient(90deg, transparent, rgba(255,240,210,0.16), transparent)',
          }} />
        </div>
        {/* scan beam */}
        {scan !== null && (
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', left: 0, right: 0, top: (clamp(scan, 0, 1) * 100) + '%', height: 3,
              background: 'linear-gradient(90deg, transparent, rgba(255,232,190,0.95) 25%, rgba(255,255,255,0.98) 50%, rgba(255,232,190,0.95) 75%, transparent)',
              boxShadow: '0 0 26px 8px rgba(255,168,60,0.45)',
              opacity: Math.sin(clamp(scan, 0, 1) * Math.PI) * 1.1,
            }} />
            <div style={{
              position: 'absolute', left: 0, right: 0, top: 0, height: (clamp(scan, 0, 1) * 100) + '%',
              background: 'linear-gradient(180deg, rgba(255,170,60,0.10), rgba(255,190,90,0.02))',
              opacity: Math.sin(clamp(scan, 0, 1) * Math.PI),
            }} />
          </div>
        )}

        {/* shield */}
        <div style={{
          position: 'absolute', left: '61.15%', top: '45.83%', width: '31.87%',
          opacity: clamp(shieldP * 2.2, 0, 1),
          transform: 'translate(' + (1 - shieldT) * 46 + 'px,' + (1 - shieldT) * -34 + 'px) scale(' + (0.55 + 0.45 * shieldT) + ') rotate(' + (1 - shieldT) * -14 + 'deg)',
          transformOrigin: '50% 50%',
          filter: 'drop-shadow(0 0 ' + (10 + (shieldGlow + shieldPulse * shieldGlow) * 26) + 'px rgba(74,222,128,' + (0.25 + shieldGlow * 0.5) + '))',
        }}>
          <img src="assets/shield.png" alt="verified" style={{ width: '100%', display: 'block' }} />
          {ripple !== null && [0, 1].map((i) => {
            const k = clamp(ripple - i * 0.28, 0, 1);
            if (k <= 0) return null;
            return (
              <div key={i} style={{
                position: 'absolute', left: '50%', top: '50%', width: 120, height: 120,
                marginLeft: -60, marginTop: -60, borderRadius: '50%',
                border: '2px solid rgba(94,231,145,' + (1 - k) * 0.5 + ')',
                transform: 'scale(' + (0.4 + k * 2.1) + ')',
              }} />
            );
          })}
        </div>
      </div>

      {/* wordmark */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 716, textAlign: 'center',
        fontFamily: DISPLAY, fontWeight: 800, fontSize: 78, letterSpacing: '-0.025em',
        opacity: splashFade * clamp(1 - homeK * 2.4, 0, 1),
      }}>
        <span style={{
          display: 'inline-block', color: INK,
          opacity: udhaar,
          filter: udhaar < 0.99 && !reduce ? 'blur(' + (1 - udhaar) * 12 + 'px)' : 'none',
          transform: reduce ? 'none' : 'translateY(' + (1 - udhaar) * 26 + 'px) scale(' + (0.94 + 0.06 * udhaar) + ')',
        }}>Udhaar</span>
        <span style={{
          display: 'inline-block', color: acc,
          opacity: ai,
          filter: (ai < 0.99 && !reduce ? 'blur(' + (1 - ai) * 14 + 'px) ' : '') +
            'drop-shadow(0 0 ' + (14 + aiGlow * 30) + 'px rgba(255,140,30,' + (0.3 + aiGlow * 0.45) + '))',
          transform: reduce ? 'none' : 'translateY(' + (1 - ai) * -22 + 'px) scale(' + (0.9 + 0.1 * ai) + ')',
        }}>AI</span>
      </div>

      {/* tagline — three languages stacked, cross-faded */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 840, height: 60, opacity: splashFade * (1 - clamp(homeK * 2.4, 0, 1)) }}>
        {LANGS.map((L, li) => {
          const f = clamp(langFade[li] || 0, 0, 1);
          if (f <= 0.001) return null;
          return (
            <div key={li} style={{
              position: 'absolute', left: 0, right: 0, top: 0,
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14,
              fontFamily: L.font, fontSize: L.size, fontWeight: 600,
              opacity: f,
              filter: reduce ? 'none' : 'blur(' + (1 - f) * 6 + 'px)',
              transform: reduce ? 'none' : 'translateY(' + (1 - f) * 10 + 'px)',
            }}>
              {L.words.map((w, wi) => {
                const v = clamp(words[wi], 0, 1);
                const col = wi === 1 ? '#FFB325' : 'rgba(233,239,247,0.92)';
                return (
                  <React.Fragment key={wi}>
                    {wi > 0 && (
                      <span style={{ width: 6, height: 6, borderRadius: 3, background: acc, opacity: 0.75 * Math.min(v, clamp(words[wi - 1], 0, 1)) }} />
                    )}
                    <span style={{
                      position: 'relative', display: 'inline-block', color: col, opacity: v,
                      filter: v < 0.99 && !reduce ? 'blur(' + (1 - v) * 7 + 'px)' : 'none',
                      transform: reduce ? 'none' : 'translateY(' + (1 - v) * 12 + 'px) scale(' + (0.96 + 0.04 * v) + ')',
                    }}>
                      {w}
                      {li === 0 && wi === 0 && flash > 0.01 && (
                        <span style={{
                          position: 'absolute', left: '50%', top: '50%', width: 150, height: 90,
                          marginLeft: -75, marginTop: -45, borderRadius: 20, pointerEvents: 'none',
                          background: 'radial-gradient(circle, rgba(255,255,255,' + flash * 0.55 + '), transparent 68%)',
                        }} />
                      )}
                      {li === 0 && wi === 1 && ring > 0.01 && (
                        <span style={{
                          position: 'absolute', left: '50%', top: '50%', width: 70, height: 70,
                          marginLeft: -35, marginTop: -35, borderRadius: '50%', pointerEvents: 'none',
                          border: '2px solid rgba(255,179,37,' + (1 - ring) * 0.65 + ')',
                          transform: 'scale(' + (0.5 + ring * 2.4) + ')',
                        }} />
                      )}
                      {li === 0 && wi === 2 && sparkle > 0.01 && [0, 1, 2, 3, 4].map((si) => {
                        const ang = (si / 5) * Math.PI * 2;
                        return (
                          <span key={si} style={{
                            position: 'absolute', left: '50%', top: '50%', width: 4, height: 4,
                            borderRadius: 2, background: '#FFE7B0', pointerEvents: 'none',
                            opacity: Math.sin(sparkle * Math.PI) * 0.95,
                            transform: 'translate(' + Math.cos(ang) * (14 + sparkle * 34) + 'px,' + Math.sin(ang) * (10 + sparkle * 26) + 'px)',
                            boxShadow: '0 0 8px rgba(255,200,110,0.9)',
                          }} />
                        );
                      })}
                    </span>
                  </React.Fragment>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── scenes ────────────────────────────────────────────────────────────────
const S = (cfg) => cfg;

function Ignite({ cfg }) {
  const { progress: p } = useScene();
  useCue('chime', p > 0.12, cfg.sound);
  return <Frame cfg={cfg} s={{
    glow: interpolate([0, 0.55, 1], [0.04, 0.8, 1], Easing.easeOutCubic)(p),
    particles: Easing.easeOutQuad(clamp(p * 1.3, 0, 1)),
    book: 0, shield: 0, rupee: 0, udhaar: 0, ai: 0, aiGlow: 0, words: [0, 0, 0],
  }} />;
}

function Arrive({ cfg }) {
  const { progress: p } = useScene();
  useCue('whoosh', p > 0.04, cfg.sound);
  const x = interpolate([0, 0.58, 0.8, 1], [-520, 30, -9, 0],
    [Easing.easeOutQuart, Easing.easeOutQuad, Easing.easeInOutQuad])(p);
  return <Frame cfg={cfg} s={{
    book: animate({ from: 0, to: 1, start: 0, end: 0.2, ease: Easing.easeOutQuad })(p),
    bookX: x,
    bookBlur: interpolate([0, 0.42, 0.7], [16, 4, 0], Easing.easeOutQuad)(p),
    bookRot: interpolate([0, 0.58, 1], [-7, 2, 0], Easing.easeOutCubic)(p),
    streaks: interpolate([0, 0.3, 0.72], [0, 1, 0], Easing.easeOutQuad)(p),
    shield: 0, rupee: 0, udhaar: 0, ai: 0, aiGlow: 0, words: [0, 0, 0],
  }} />;
}

function Verify({ cfg }) {
  const { progress: p } = useScene();
  const scan = p > 0.04 && p < 0.52 ? (p - 0.04) / 0.48 : null;
  useCue('scan', p > 0.05, cfg.sound);
  useCue('confirm', p > 0.52, cfg.sound);
  return <Frame cfg={cfg} s={{
    scan,
    rupee: interpolate([0, 0.12, 0.34, 0.6], [0, 0.25, 1, 0.34], Easing.easeInOutQuad)(p),
    shield: animate({ from: 0, to: 1, start: 0.46, end: 0.84, ease: Easing.easeOutCubic })(p),
    shieldGlow: interpolate([0.72, 0.86, 1], [0, 1, 0.22], Easing.easeOutQuad)(p),
    ripple: p > 0.8 ? (p - 0.8) / 0.2 : null,
    udhaar: 0, ai: 0, aiGlow: 0, words: [0, 0, 0],
  }} />;
}

function Comprehend({ cfg }) {
  const { progress: p } = useScene();
  useCue('think', p > 0.1, cfg.sound);
  useCue('pulse', p > 0.36, cfg.sound);
  return <Frame cfg={cfg} s={{
    neural: interpolate([0, 0.2, 0.62, 0.9, 1], [0, 1, 1, 0.18, 0], Easing.easeInOutQuad)(p),
    pulse: interpolate([0.32, 0.48, 0.68], [0, 1, 0], Easing.easeInOutSine)(p),
    udhaar: 0, ai: 0, aiGlow: 0, words: [0, 0, 0],
  }} />;
}

function Wordmark({ cfg }) {
  const { progress: p } = useScene();
  useCue('name', p > 0.06, cfg.sound);
  return <Frame cfg={cfg} s={{
    udhaar: animate({ start: 0.06, end: 0.52, ease: Easing.easeOutCubic })(p),
    ai: animate({ start: 0.3, end: 0.78, ease: Easing.easeOutCubic })(p),
    aiGlow: interpolate([0.45, 0.72, 1], [0, 1, 0.55], Easing.easeOutQuad)(p),
    words: [0, 0, 0],
  }} />;
}

function Tagline({ cfg }) {
  const { progress: p } = useScene();
  useCue('flash', p > 0.07, cfg.sound);
  useCue('pulse', p > 0.28, cfg.sound);
  useCue('sparkle', p > 0.5, cfg.sound);
  const w = (i) => animate({ start: 0.05 + i * 0.21, end: 0.34 + i * 0.21, ease: Easing.easeOutCubic })(p);
  return <Frame cfg={cfg} s={{
    words: [w(0), w(1), w(2)],
    flash: interpolate([0.06, 0.13, 0.3], [0, 1, 0], Easing.easeOutQuad)(p),
    ring: interpolate([0.27, 0.45, 0.66], [0, 1, 0], Easing.easeOutQuad)(p),
    sparkle: interpolate([0.48, 0.66, 0.9], [0, 1, 0], Easing.easeOutQuad)(p),
  }} />;
}

function Languages({ cfg }) {
  const { progress: p } = useScene();
  const seg = (a, b) => Easing.easeInOutCubic(clamp((p - a) / (b - a), 0, 1));
  const en = 1 - seg(0.04, 0.18) + seg(0.74, 0.92);
  const hi = seg(0.1, 0.26) - seg(0.36, 0.5);
  const te = seg(0.42, 0.56) - seg(0.68, 0.84);
  return <Frame cfg={cfg} s={{ langFade: [clamp(en, 0, 1), clamp(hi, 0, 1), clamp(te, 0, 1)] }} />;
}

function Handoff({ cfg }) {
  const { progress: p } = useScene();
  useCue('land', p > 0.08, cfg.sound);
  const home = animate({ start: 0.06, end: 0.82, ease: Easing.easeInOutCubic })(p);
  return <Frame cfg={cfg} s={{
    home,
    splashFade: 1 - animate({ start: 0.02, end: 0.28, ease: Easing.easeOutQuad })(p),
    glow: 1 - home * 0.7,
    shieldGlow: 0.22 * (1 - home),
  }} />;
}

function SplashApp() {
  const [tw, setTweak] = window.useTweaks(window.TWEAK_DEFAULTS);
  const sysReduce = React.useMemo(() => {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }, []);
  const cfg = {
    accent: tw.accent, glow: tw.glow,
    particles: tw.particles ? 1 : 0,
    reduce: tw.reduceMotion || sysReduce,
    sound: !!tw.sound,
  };
  React.useEffect(() => { Snd.on = !!tw.sound; if (tw.sound) Snd.init(); }, [tw.sound]);
  const wrap = (C) => (props) => <C {...props} cfg={cfg} />;
  const map = React.useMemo(() => ({
    Ignite: wrap(Ignite), Arrive: wrap(Arrive), Verify: wrap(Verify),
    Comprehend: wrap(Comprehend), Wordmark: wrap(Wordmark), Tagline: wrap(Tagline),
    Languages: wrap(Languages), Handoff: wrap(Handoff),
  }), [tw.accent, tw.glow, tw.particles, tw.reduceMotion, tw.sound, sysReduce]);

  const { TweaksPanel, TweakSection, TweakToggle, TweakSlider, TweakColor } = window;
  return (
    <React.Fragment>
      <window.SceneStage width={SW} height={SH} bg="#04070d"
        scenes={window.OM_SCENES} playback={window.OM_PLAYBACK}>
        {map}
      </window.SceneStage>
      <TweaksPanel>
        <TweakSection label="Splash" />
        <TweakColor label="Accent" value={tw.accent}
          options={['#FF8A17', '#FF7A00', '#FFA53D', '#F2711C']}
          onChange={(v) => setTweak('accent', v)} />
        <TweakSlider label="Glow" value={tw.glow} min={0.3} max={1.8} step={0.05}
          onChange={(v) => setTweak('glow', v)} />
        <TweakToggle label="Sound" value={tw.sound}
          onChange={(v) => setTweak('sound', v)} />
        <TweakToggle label="Ambient particles" value={tw.particles}
          onChange={(v) => setTweak('particles', v)} />
        <TweakToggle label="Reduced motion" value={tw.reduceMotion}
          onChange={(v) => setTweak('reduceMotion', v)} />
        <TweakSection label="Editing" />
        <TweakToggle label="Motion editor" value={tw.motionEditor}
          onChange={(v) => setTweak('motionEditor', v)} />
      </TweaksPanel>
    </React.Fragment>
  );
}

window.SplashApp = SplashApp;
