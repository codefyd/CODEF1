/* «نقطة» — محرّك الريل
   renderAt(t, W, H): دالة نقية. نفس t ونفس المقاس = نفس الصورة بالبكسل.
   لا Date.now ولا Math.random — كل عشوائية من مولّد ببذرة ثابتة. */
(function () {
  "use strict";
  const TL = window.TL;
  const { BEAT, FPS, b } = TL;
  const DUR = TL.DURATION;
  const T_LAST = (TL.FRAMES - 1) / FPS;          // زمن الإطار ١٧٩٩
  const COL = { bg: "#0A0A0D", lime: "#C8FF2E", white: "#F2EDE3", spark: "#FF6A1F", panel: "#111117" };
  const AR = "Fatimah", SW = "Fatimah Swash", LAT = "Archivo Black";
  const ZWJ = "‍", TATWEEL = "ـ";
  const TAU = Math.PI * 2;

  // ───────────────────────── أدوات ─────────────────────────
  const clamp = (x, a = 0, z = 1) => Math.max(a, Math.min(z, x));
  const lerp = (a, z, p) => a + (z - a) * p;
  const prog = (x, a, z) => clamp((x - a) / (z - a));
  const frac = (x) => x - Math.floor(x);
  const expoOut = (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p));
  const expoIn = (p) => (p <= 0 ? 0 : Math.pow(2, 10 * p - 10));
  const expoInOut = (p) => (p <= 0 ? 0 : p >= 1 ? 1 : p < 0.5 ? Math.pow(2, 20 * p - 10) / 2 : (2 - Math.pow(2, -20 * p + 10)) / 2);
  const backOut = (p, s = 1.9) => 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2);
  const elasticOut = (p) => (p <= 0 ? 0 : p >= 1 ? 1 : Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * (TAU / 3)) + 1);
  const cubicInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  const font = (w, px, fam = AR) => `${w} ${Math.max(1, px).toFixed(2)}px "${fam}"`;
  const ad = (s) => String(s).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let q = Math.imul(a ^ (a >>> 15), 1 | a);
      q = (q + Math.imul(q ^ (q >>> 7), 61 | q)) ^ q;
      return ((q ^ (q >>> 14)) >>> 0) / 4294967296;
    };
  }
  const hash = (n) => rng((n * 2654435761) >>> 0)();

  const cv = document.getElementById("c");
  const ctx = cv.getContext("2d", { willReadFrequently: false });
  const mctx = document.createElement("canvas").getContext("2d"); // للقياس فقط، لا يلمس سياق الرسم
  const cache = new Map();
  const memo = (key, fn) => { if (!cache.has(key)) cache.set(key, fn()); return cache.get(key); };
  function mk(w, h, read) {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
    return { cv: c, ctx: c.getContext("2d", { willReadFrequently: !!read }) };
  }
  const offs = {};
  function off(name, w, h, read) {
    let o = offs[name];
    if (!o || o.cv.width !== w || o.cv.height !== h) o = offs[name] = mk(w, h, read);
    return o;
  }

  // حالة الإطار الحالي
  let W = 1080, H = 1080, S = 1080, cx = 540, cy = 540, t = 0, tb = 0, frame = 0;

  // ───────────────────────── النص ─────────────────────────
  function setText(c, fnt, align = "center", dir = "rtl") {
    c.font = fnt; c.textAlign = align; c.direction = dir; c.textBaseline = "alphabetic";
  }
  function measure(str, fnt, dir = "rtl") { setText(mctx, fnt, "center", dir); return mctx.measureText(str); }
  function fit(str, w, px, fam, maxW) {
    const m = measure(str, font(w, px, fam), fam === LAT ? "ltr" : "rtl").width;
    return m > maxW ? px * (maxW / m) : px;
  }
  // خط أساس يضع النص بصريًا في منتصف y (مرجع ثابت لكل عائلة حتى لا يقفز السطر)
  function baseFor(y, px, fam = AR) {
    const r = memo("base:" + fam, () => {
      const ref = fam === LAT ? "CODEF8" : "كودف منتج";
      const m = measure(ref, font(900, 100, fam), fam === LAT ? "ltr" : "rtl");
      return (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2 / 100;
    });
    return y + r * px;
  }

  // ── الابتكار ب: تتابع الحروف مع U+200D حتى لا ينكسر الوصل ──
  const RIGHT_ONLY = new Set("اأإآٱدذرزوؤةء");
  const isAr = (ch) => !!ch && /[ؠ-يٮ-ۓ]/.test(ch);
  const isMark = (ch) => /[ً-ٰٟ]/.test(ch);
  function layoutLetters(text, fnt) {
    return memo("lay:" + text + fnt, () => {
      const cl = [];
      let ci = 0;
      for (const ch of text) {
        if (isMark(ch) && cl.length) cl[cl.length - 1].s += ch;
        else cl.push({ s: ch, base: ch, charIdx: ci });
        ci++;
      }
      setText(mctx, fnt);
      let offX = 0;
      cl.forEach((k, i) => {
        const prev = cl[i - 1] && cl[i - 1].base, next = cl[i + 1] && cl[i + 1].base;
        const jp = isAr(k.base) && k.base !== "ء" && isAr(prev) && !RIGHT_ONLY.has(prev);
        const jn = isAr(k.base) && !RIGHT_ONLY.has(k.base) && isAr(next) && next !== "ء";
        k.draw = (jp ? ZWJ : "") + k.s + (jn ? ZWJ : "");
        k.w = mctx.measureText(k.draw).width;
        k.off = offX; offX += k.w;
      });
      return { cl, width: offX };
    });
  }
  // يرسم الحروف منفردة؛ anim(k) → {a, dy, sc} ؛ color(k) → لون
  function drawLetters(c, lay, fnt, rightX, base, anim, color) {
    setText(c, fnt, "right");
    for (const k of lay.cl) {
      if (k.base === " ") continue;
      const st = anim(k);
      if (st.a <= 0) continue;
      const x = rightX - k.off - k.w / 2;
      c.save();
      c.globalAlpha *= st.a;
      c.translate(x, base + (st.dy || 0));
      if (st.sc !== undefined && st.sc !== 1) c.scale(st.sc, st.sc);
      c.fillStyle = color(k);
      c.fillText(k.draw, k.w / 2, 0);
      c.restore();
    }
  }
  const popLetter = (ta, dur, rise) => {
    const p = prog(tb, ta, ta + dur);
    return { a: clamp(p * 4), dy: (1 - backOut(p)) * rise, sc: lerp(0.35, 1, backOut(p)) };
  };

  // ── الابتكار أ: محرّك الكشيدة — عدد عشري بمزج حالتين، لا scaleX ──
  function kstr(text, idx, n) {
    const a = [...text];
    return a.slice(0, idx + 1).join("") + TATWEEL.repeat(n) + a.slice(idx + 1).join("");
  }
  function kWidth(text, idx, k, fnt) {
    k = Math.max(0, k);
    const n0 = Math.floor(k), f = k - n0;
    const w0 = measure(kstr(text, idx, n0), fnt).width;
    if (f < 1e-4) return w0;
    return lerp(w0, measure(kstr(text, idx, n0 + 1), fnt).width, f);
  }
  // أول تطويل بعد الحرف أقصر من البقية (يتغيّر شكل الحرف)، فالبحث ثنائي على العرض الحقيقي
  function kMax(text, idx, fnt, maxW) {
    let lo = 0, hi = 400;
    if (kWidth(text, idx, 0, fnt) >= maxW) return 0;
    for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (kWidth(text, idx, mid, fnt) > maxW) hi = mid; else lo = mid; }
    return lo;
  }
  // يرسم النص الممطوط متمركزًا عند x على خط الأساس y.
  // k عشري: العرض = مزج بين حالة floor(k) وحالة floor(k)+1.
  function drawKashida(c, text, idx, k, x, y, fnt, color) {
    k = Math.max(0, k);
    const n0 = Math.floor(k), f = k - n0;
    setText(c, fnt);
    c.fillStyle = color;
    if (f < 1e-3) { c.fillText(kstr(text, idx, n0), x, y); return; }
    if (f > 0.999) { c.fillText(kstr(text, idx, n0 + 1), x, y); return; }
    const s0 = kstr(text, idx, n0), s1 = kstr(text, idx, n0 + 1);
    const w0 = measure(s0, fnt).width, w1 = measure(s1, fnt).width, tw = lerp(w0, w1, f);
    if (n0 >= 1) {
      // الحالة الأطول تُرسم بنصفين مثبّتين عند الطرفين يتراكبان داخل مجرى التطويل:
      // الحروف لا تُمطّ ولا تُضغط أبدًا، والعرض ينمو بنعومة بين الحالتين.
      const a = [...text];
      const n1 = n0 + 1, tat = measure(TATWEEL, fnt).width;
      const M = measure(a.slice(0, idx + 1).join("") + TATWEEL.repeat(n1), fnt).width - (n1 * tat) / 2;
      const xr = x + tw / 2, xl = x - tw / 2;
      c.save(); c.beginPath(); c.rect(xr - M, y - H * 4, W * 8, H * 8); c.clip();
      c.textAlign = "right"; c.fillText(s1, xr, y); c.restore();
      c.save(); c.beginPath(); c.rect(xl + w1 - M - W * 8, y - H * 4, W * 8, H * 8); c.clip();
      c.textAlign = "left"; c.fillText(s1, xl, y); c.restore();
      c.textAlign = "center";
      return;
    }
    // بين ٠ و١: مزج شفافية بين الحالتين، النسخة الأقصر تُمدّ قليلًا والأطول تُضغط قليلًا.
    // كل نسخة تُرسم معتمة في طبقتها أولًا حتى لا تتراكم حواف الحروف فتظهر خطوط.
    const cw = c.canvas.width, ch = c.canvas.height, T = c.getTransform();
    const A = off("kA", cw, ch), B = off("kB", cw, ch);
    for (const [o, s, w] of [[A, s0, w0], [B, s1, w1]]) {
      const oc = o.ctx;
      oc.setTransform(1, 0, 0, 1, 0, 0); oc.clearRect(0, 0, cw, ch);
      oc.setTransform(T); oc.translate(x, y); oc.scale(tw / w, 1);
      setText(oc, fnt); oc.fillStyle = color; oc.fillText(s, 0, 0);
    }
    const Kc = off("kC", cw, ch).ctx;
    Kc.setTransform(1, 0, 0, 1, 0, 0); Kc.clearRect(0, 0, cw, ch);
    Kc.globalCompositeOperation = "source-over"; Kc.globalAlpha = 1 - f; Kc.drawImage(A.cv, 0, 0);
    Kc.globalCompositeOperation = "lighter"; Kc.globalAlpha = f; Kc.drawImage(B.cv, 0, 0);
    Kc.globalCompositeOperation = "source-over"; Kc.globalAlpha = 1;
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(Kc.canvas, 0, 0); c.restore();
  }

  // قناع نص (لأخذ عينات النقاط وتحديد نقطة الفاء)
  function textMask(str, fnt) {
    return memo("mask:" + str + fnt, () => {
      const m = measure(str, fnt);
      const pad = 6;
      const w = Math.ceil(m.actualBoundingBoxLeft + m.actualBoundingBoxRight) + pad * 2;
      const h = Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) + pad * 2;
      const o = mk(w, h, true);
      setText(o.ctx, fnt);
      o.ctx.fillStyle = "#fff";
      const ax = pad + m.actualBoundingBoxLeft, ay = pad + m.actualBoundingBoxAscent;
      o.ctx.fillText(str, ax, ay);
      const data = o.ctx.getImageData(0, 0, w, h).data;
      return { w, h, ax, ay, data };
    });
  }
  function maskPoints(mask, step) {
    const pts = [];
    for (let y = 0; y < mask.h; y += step)
      for (let x = 0; x < mask.w; x += step)
        if (mask.data[(y * mask.w + x) * 4 + 3] > 140) pts.push([x - mask.ax, y - mask.ay]);
    return pts;
  }
  function components(mask) {
    const { w, h, data } = mask, lab = new Int32Array(w * h), comps = [];
    let id = 0;
    for (let i = 0; i < w * h; i++) {
      if (lab[i] || data[i * 4 + 3] < 128) continue;
      id++;
      const st = [i]; lab[i] = id;
      let n = 0, sx = 0, sy = 0;
      while (st.length) {
        const j = st.pop(), x = j % w, y = (j / w) | 0;
        n++; sx += x; sy += y;
        const nb = [j - 1, j + 1, j - w, j + w];
        for (let q = 0; q < 4; q++) {
          const k = nb[q];
          if (k < 0 || k >= w * h) continue;
          if (q < 2 && ((k / w) | 0) !== y) continue;
          if (!lab[k] && data[k * 4 + 3] >= 128) { lab[k] = id; st.push(k); }
        }
      }
      comps.push({ n, x: sx / n - mask.ax, y: sy / n - mask.ay });
    }
    return comps;
  }
  function farthest(pts, n, seed) {
    if (!pts.length) return [];
    const r = rng(seed), out = [pts[Math.floor(r() * pts.length)]];
    const d = pts.map((p) => Infinity);
    while (out.length < n) {
      const last = out[out.length - 1];
      let bi = 0, bd = -1;
      for (let i = 0; i < pts.length; i++) {
        const dd = (pts[i][0] - last[0]) ** 2 + (pts[i][1] - last[1]) ** 2;
        if (dd < d[i]) d[i] = dd;
        if (d[i] > bd) { bd = d[i]; bi = i; }
      }
      out.push(pts[bi]);
    }
    return out;
  }

  // ───────────────────────── أشكال ─────────────────────────
  function diamond(c, x, y, r, fill) {
    c.beginPath(); c.moveTo(x, y - r); c.lineTo(x + r, y); c.lineTo(x, y + r); c.lineTo(x - r, y); c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); }
  }
  function glow(c, color, blur) { c.shadowColor = color; c.shadowBlur = blur; }
  function noGlow(c) { c.shadowColor = "transparent"; c.shadowBlur = 0; }
  function shape(c, type, x, y, r, rot, color, lw) {
    c.save(); c.translate(x, y); c.rotate(rot);
    c.fillStyle = color; c.strokeStyle = color; c.lineWidth = lw; c.lineCap = "round";
    if (type === "diamond") diamond(c, 0, 0, r, color);
    else if (type === "circle") { c.beginPath(); c.arc(0, 0, r * 0.8, 0, TAU); c.fill(); }
    else if (type === "ring") { c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke(); }
    else if (type === "arc") { c.beginPath(); c.arc(0, 0, r * 1.1, -0.2, Math.PI * 1.1); c.stroke(); }
    else if (type === "square") { c.fillRect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4); }
    else if (type === "line") { c.beginPath(); c.moveTo(-r * 1.3, 0); c.lineTo(r * 1.3, 0); c.stroke(); }
    c.restore();
  }
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
  }

  // ── الابتكار ج: النقطة الحلقية — نفس الحالة في الإطار ٠ والإطار ١٧٩٩ ──
  const breathe = (tt) => 1 + 0.1 * Math.sin((TAU * 16 * tt) / T_LAST);
  const coreR = () => S * 0.03;
  function drawCore(c, extra = 1) {
    c.save();
    glow(c, "rgba(200,255,46,0.55)", S * 0.035);
    diamond(c, cx, cy, coreR() * breathe(t) * extra, COL.lime);
    c.restore();
  }

  // ── الارتطام: 2.4 → 1 في ٥ إطارات، اهتزاز ١٢ إطارًا، ومضة إطار واحد ──
  const framesSince = (beat) => t * FPS - b(beat) * FPS;
  function slamScale(beat, from = 2.4) {
    const df = framesSince(beat);
    if (df < 0) return from;
    if (df >= 5) return 1;
    const p = df / 5;
    return lerp(from, 1, 1 - (1 - p) * (1 - p));
  }
  const IMPACTS = TL.SLAMS.map((s) => ({ at: s.at, k: s.strength }))
    .concat([{ at: 32.5, k: 1.1 }, { at: TL.DROP, k: 1.3 }]);
  function shakeNow() {
    let x = 0, y = 0;
    const r = rng(frame * 7 + 3);
    for (const im of IMPACTS) {
      const df = framesSince(im.at);
      if (df < 0 || df >= 12) continue;
      const amp = S * 0.028 * im.k * Math.pow(1 - df / 12, 2);
      x += (r() - 0.5) * 2 * amp; y += (r() - 0.5) * 2 * amp;
    }
    return { x, y };
  }
  function flashNow() {
    for (const im of IMPACTS) { const df = framesSince(im.at); if (df >= 0 && df < 1) return 0.55; }
    return 0;
  }

  // ───────────────────────── المشهد ١ ─────────────────────────
  function s1Layout() {
    return memo(`s1:${W}x${H}`, () => {
      const px = fit("كودف", 900, S * 0.36, AR, W * 0.74);
      const fnt = font(900, px);
      const m = measure("كودف", fnt);
      const base = cy - S * 0.05 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
      const mask = textMask("كودف", fnt);
      const comps = components(mask).filter((q) => q.n > 20).sort((a, z) => a.n - z.n);
      const dotC = comps[0];
      const dot = { x: cx + dotC.x, y: base + dotC.y, r: Math.sqrt(dotC.n) * 0.78 };
      const pts = farthest(maskPoints(mask, Math.max(2, Math.round(px / 40))), 11, 11)
        .map((p) => ({ x: cx + p[0], y: base + p[1] }));
      const subPx = fit("تصميم وتطوير منتجات رقمية", 500, S * 0.052, AR, W * 0.8);
      const r = rng(2026);
      const types = ["diamond", "circle", "arc", "ring", "square", "line"];
      const shapes = [];
      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * TAU + (r() - 0.5) * 0.4;
        const rad = S * (0.24 + r() * 0.2);
        shapes.push({
          ang, rad,
          type: i === 0 ? "diamond" : types[i % types.length],
          size: i === 0 ? coreR() : S * (0.018 + r() * 0.03),
          spin: (r() - 0.5) * 8,
          color: i === 0 ? COL.lime : i % 3 === 0 ? COL.white : COL.lime,
          target: i === 0 ? dot : pts[(i - 1) % pts.length],
          delay: r() * 0.35,
        });
      }
      return { px, fnt, base, dot, shapes, subPx };
    });
  }
  function scene1(c) {
    const L = s1Layout();
    if (tb < 2) {
      const pre = 1 - 0.45 * expoIn(prog(tb, 1.35, 2));
      const trem = tb > 1.4 ? (hash(frame) - 0.5) * S * 0.004 * prog(tb, 1.4, 2) : 0;
      c.save(); c.translate(trem, 0); drawCore(c, pre); c.restore();
      return;
    }
    // موجة الانفجار
    const sw = prog(tb, 2, 3.1);
    if (sw < 1) {
      c.save(); c.strokeStyle = COL.lime; c.globalAlpha = 1 - sw; c.lineWidth = S * 0.006 * (1 - sw) + 1;
      c.beginPath(); c.arc(cx, cy, S * 0.55 * expoOut(sw), 0, TAU); c.stroke(); c.restore();
    }
    const wordOn = tb >= 6;
    for (let i = 0; i < 12; i++) {
      const sh = L.shapes[i];
      const e1 = expoOut(prog(tb, 2, 3.7));
      let x = cx + Math.cos(sh.ang) * sh.rad * e1;
      let y = cy + Math.sin(sh.ang) * sh.rad * e1;
      // تحويم خفيف قبل التجمّع
      const hov = prog(tb, 3, 4);
      x += Math.cos(tb * 3 + i) * S * 0.01 * hov; y += Math.sin(tb * 2.4 + i) * S * 0.01 * hov;
      let size = sh.size * (i === 0 ? 1.15 : 1);
      let rot = sh.spin * e1;
      const gStart = 4 + sh.delay * (i === 0 ? 0 : 1);
      const gEnd = i === 0 ? 5.95 : gStart + 1.5;
      const g = elasticOut(prog(tb, gStart, gEnd));
      if (tb >= gStart) {
        x = lerp(x, sh.target.x, g); y = lerp(y, sh.target.y, g);
        size = lerp(size, i === 0 ? L.dot.r : S * 0.012, clamp(g));
        rot = lerp(rot, i === 0 ? 0 : rot + 2, clamp(g));
      }
      if (i === 0) { sh._x = x; sh._y = y; sh._r = size; continue; }
      const a = wordOn ? 1 - prog(tb, 6, 6.3) : 1;
      if (a <= 0) continue;
      c.save(); c.globalAlpha = a;
      if (sh.color === COL.lime) glow(c, "rgba(200,255,46,0.45)", S * 0.02);
      shape(c, sh.type, x, y, size, rot, sh.color, S * 0.007);
      c.restore();
    }
    const d0 = L.shapes[0];
    // «كودف» تنبثق مرتطمةً حول نقطة الفاء
    if (wordOn) {
      const sc = slamScale(6);
      const push = 1 + 0.04 * expoIn(prog(tb, 7.3, 8));
      c.save();
      c.translate(L.dot.x, L.dot.y); c.scale(sc * push, sc * push); c.translate(-L.dot.x, -L.dot.y);
      setText(c, L.fnt); c.fillStyle = COL.white;
      c.fillText("كودف", cx, L.base);
      c.restore();
      const sp = prog(tb, 6.45, 7.2);
      if (sp > 0) {
        c.save(); c.globalAlpha = sp;
        setText(c, font(500, L.subPx)); c.fillStyle = COL.white;
        c.fillText("تصميم وتطوير منتجات رقمية", cx, baseFor(cy + S * 0.2, L.subPx) + (1 - expoOut(sp)) * S * 0.04);
        c.restore();
      }
      c.save(); glow(c, "rgba(200,255,46,0.6)", S * 0.02);
      diamond(c, L.dot.x, L.dot.y, L.dot.r * push, COL.lime);
      c.restore();
    } else {
      c.save(); glow(c, "rgba(200,255,46,0.55)", S * 0.03);
      diamond(c, d0._x, d0._y, d0._r, COL.lime); c.restore();
    }
  }

  // ───────────────────────── المشهد ٢ ─────────────────────────
  function s2Layout() {
    return memo(`s2:${W}x${H}`, () => {
      const l1 = TL.TYPE.hook.text, kIdx = 3 + TL.KASHIDA.hook.index;
      const px1 = fit(l1, 900, S * 0.15, AR, W * 0.7);
      const f1 = font(900, px1);
      const kmax = kMax(l1, kIdx, f1, W - S * 0.1);
      const px2 = fit("إلى منتج.", 900, S * 0.17, AR, W * 0.8);
      return { l1, kIdx, px1, f1, kmax, px2, y1: cy - S * 0.1, y2: cy + S * 0.15, headW: measure("من ", f1).width };
    });
  }
  function scene2(c) {
    const L = s2Layout();
    const K = TL.KASHIDA.hook, T = TL.TYPE.hook;
    const b1 = baseFor(L.y1, L.px1);
    const impact = framesSince(12) >= 0;
    const bump = impact ? -S * 0.025 * (1 - elasticOut(prog(tb, 12, 13))) * Math.sign(1) : 0;
    // السطر الأول
    if (tb < K.grow[0]) {
      const lay = layoutLetters(L.l1, L.f1);
      const rightX = cx + lay.width / 2;
      drawLetters(c, lay, L.f1, rightX, b1,
        (k) => popLetter(T.start + k.charIdx * T.step, 0.5, S * 0.08),
        (k) => (k.charIdx >= 3 ? COL.lime : COL.white));
    } else {
      let k;
      if (tb < K.hold) k = L.kmax * cubicInOut(prog(tb, K.grow[0], K.grow[1]));
      else k = lerp(L.kmax, K.rest, elasticOut(prog(tb, K.hold, K.hold + 1.2)));
      const w = kWidth(L.l1, L.kIdx, k, L.f1);
      const boundary = cx + w / 2 - L.headW;
      for (const side of [0, 1]) {
        c.save();
        c.beginPath();
        if (side === 0) c.rect(boundary, -H, W * 2, H * 3); else c.rect(-W, -H, boundary + W, H * 3);
        c.clip();
        drawKashida(c, L.l1, L.kIdx, k, cx, b1 + bump, L.f1, side === 0 ? COL.white : COL.lime);
        c.restore();
      }
    }
    // «إلى منتج.» ترتطم من الأعلى
    if (tb >= 11.45) {
      const fall = expoIn(prog(tb, 11.45, 12));
      const y = lerp(-S * 0.35, L.y2, fall);
      let sx = 1, sy = impact ? 1 : lerp(1, 1.35, fall);
      if (impact) { const q = 1 - elasticOut(prog(tb, 12, 12.9)); sx = 1 + 0.28 * q; sy = 1 - 0.28 * q; }
      const fam = impact ? SW : AR;   // الابتكار ٣: تبديل العائلة في إطار الارتطام فتنمو الذيول
      const fnt = font(900, L.px2, fam);
      const base = baseFor(y, L.px2);
      const whole = measure("إلى منتج.", fnt).width, head = measure("إلى منتج", fnt).width;
      c.save();
      c.translate(cx, base); c.scale(sx, sy); c.translate(-cx, -base);
      setText(c, fnt);
      const bnd = cx + whole / 2 - head;
      c.save(); c.beginPath(); c.rect(bnd, -H, W * 2, H * 3); c.clip(); c.fillStyle = COL.white; c.fillText("إلى منتج.", cx, base); c.restore();
      c.save(); c.beginPath(); c.rect(-W, -H, bnd + W, H * 3); c.clip(); c.fillStyle = COL.lime; c.fillText("إلى منتج.", cx, base); c.restore();
      c.restore();
      // الشرارة البرتقالية — لحظة الارتطام فقط
      if (impact) sparks(c, 12, cx, base + L.px2 * 0.08, whole, 40, 77);
    }
  }
  function sparks(c, at, x0, y0, spread, n, seed) {
    const p = prog(tb, at, at + 1.4);
    if (p <= 0 || p >= 1) return;
    const r = rng(seed);
    c.save();
    c.strokeStyle = COL.spark; c.lineCap = "round";
    glow(c, "rgba(255,106,31,0.8)", S * 0.012);
    for (let i = 0; i < n; i++) {
      const ox = x0 + (r() - 0.5) * spread;
      const ang = -Math.PI / 2 + (r() - 0.5) * 2.6;
      const sp = S * (0.12 + r() * 0.3);
      const e = expoOut(p);
      const x = ox + Math.cos(ang) * sp * e;
      const y = y0 + Math.sin(ang) * sp * e + S * 0.25 * p * p;
      const len = S * 0.03 * (1 - p) * (0.5 + r());
      c.globalAlpha = (1 - p) * (0.6 + 0.4 * r());
      c.lineWidth = S * 0.004 * (1 - p) + 0.5;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x - Math.cos(ang) * len, y - Math.sin(ang) * len + len * 0.3 * p); c.stroke();
    }
    c.restore();
  }

  // ───────────────────────── المشهد ٣ ─────────────────────────
  function s3Layout() {
    return memo(`s3:${W}x${H}`, () => {
      const bw = Math.min(W * 0.86, S * 1.25), bh = S * 0.105;
      const by = H - S * 0.19;
      const top = S * 0.11, bottom = by - bh / 2 - S * 0.05;
      const label = S * 0.085;
      const osz = Math.min(bottom - top - label, W * 0.62);
      const oy = top + osz / 2 + (bottom - top - label - osz) / 2;
      const tpx = Math.min(...TL.PROMPTS.map((p) => fit(p.text, 500, S * 0.04, AR, bw - S * 0.2)));
      return { bw, bh, by, osz, oy, labelY: oy + osz / 2 + label * 0.62, tpx };
    });
  }
  function typedCount(p) {
    const len = [...p.text].length;
    if (tb < p.typeStart) return 0;
    if (tb < p.delStart) return clamp(Math.floor((tb - p.typeStart) / p.typeStep) + 1, 0, len);
    return clamp(len - Math.floor((tb - p.delStart) / p.delStep) - 1, 0, len);
  }
  function scene3(c) {
    const L = s3Layout();
    const boxIn = backOut(prog(tb, 13.7, 14.3));
    const boxOut = prog(tb, 29.5, 30);
    if (tb < 30 && boxIn > 0) {
      c.save();
      c.globalAlpha = clamp(boxIn) * (1 - boxOut);
      const bx = cx - L.bw / 2, byTop = L.by - L.bh / 2;
      c.translate(cx, L.by); c.scale(lerp(0.8, 1, boxIn), lerp(0.8, 1, boxIn)); c.translate(-cx, -L.by);
      roundRect(c, bx, byTop, L.bw, L.bh, L.bh / 2);
      c.fillStyle = COL.panel; c.fill();
      c.strokeStyle = "rgba(242,237,227,0.22)"; c.lineWidth = Math.max(1, S * 0.0022); c.stroke();
      const idx = clamp(Math.floor((tb - 14) / 4), 0, 3);
      const P = TL.PROMPTS[idx];
      const n = tb >= 14 ? typedCount(P) : 0;
      const str = [...P.text].slice(0, n).join("");
      const fnt = font(500, L.tpx);
      const rightX = bx + L.bw - L.bh * 0.55;
      setText(c, fnt, "right");
      c.fillStyle = COL.white;
      const base = baseFor(L.by, L.tpx);
      if (str) c.fillText(str, rightX, base);
      const tw = str ? measure(str, fnt).width : 0;
      // مؤشر الكتابة على اليسار (النص من اليمين)
      const blink = n === [...P.text].length || n === 0 ? (Math.floor(tb * 2) % 2 === 0 ? 1 : 0.15) : 1;
      c.globalAlpha *= blink;
      c.fillStyle = COL.lime;
      c.fillRect(rightX - tw - S * 0.012, L.by - L.tpx * 0.55, Math.max(2, S * 0.0045), L.tpx * 1.1);
      c.restore();
      // زر الإرسال: معيّن ليموني على اليسار
      c.save(); c.globalAlpha = clamp(boxIn) * (1 - boxOut);
      const full = n === [...P.text].length;
      const pulse = full ? 1 + 0.25 * (1 - frac(tb * 2)) : 1;
      diamond(c, bx + L.bh * 0.55, L.by, L.bh * 0.2 * pulse, full ? COL.lime : "rgba(200,255,46,0.35)");
      c.restore();
    }
    // الكائنات
    TL.PROMPTS.forEach((P, i) => {
      if (tb < P.buildFrom - 0.05 || tb > P.at + 4) return;
      const p = prog(tb, P.buildFrom, P.buildTo);
      const ex = prog(tb, P.at + 3.35, P.at + 3.95);
      if (ex >= 1) return;
      c.save();
      c.globalAlpha = 1 - ex;
      const sc = (1 - 0.35 * expoIn(ex)) * lerp(0.85, 1, expoOut(prog(tb, P.buildFrom, P.buildFrom + 0.5)));
      c.translate(cx, L.oy); c.scale(sc, sc); c.translate(-cx, -L.oy);
      OBJ[P.obj](c, cx, L.oy, L.osz, p, i);
      const lp = prog(p, 0.5, 0.8);
      if (lp > 0) {
        const lpx = S * 0.05;
        c.globalAlpha *= lp;
        setText(c, font(700, lpx)); c.fillStyle = COL.lime;
        c.fillText(P.project, cx, baseFor(L.labelY, lpx) + (1 - expoOut(lp)) * S * 0.03);
      }
      c.restore();
    });
    if (tb >= 30) sceneTam(c);
  }

  const OBJ = {
    screens(c, x, y, s, p) {
      const w = s * 0.29, h = w * 0.64, gap = s * 0.045;
      for (let i = 0; i < 3; i++) {
        const px = x + (1 - i) * (w + gap);   // من اليمين
        const py = y - s * 0.04 + (i === 1 ? -s * 0.03 : 0);
        const pi = prog(p, i * 0.2, i * 0.2 + 0.4);
        const on = prog(p, i * 0.2 + 0.3, i * 0.2 + 0.55);
        if (pi <= 0) continue;
        c.save();
        c.strokeStyle = COL.white; c.lineWidth = Math.max(1.5, s * 0.008);
        const per = 2 * (w + h);
        c.setLineDash([per * expoOut(pi), per]);
        c.strokeRect(px - w / 2, py - h / 2, w, h);
        c.setLineDash([]);
        if (on > 0) {
          c.globalAlpha *= on;
          glow(c, "rgba(200,255,46,0.5)", s * 0.05 * on);
          c.fillStyle = COL.lime; c.fillRect(px - w / 2 + s * 0.012, py - h / 2 + s * 0.012, w - s * 0.024, h - s * 0.024);
          noGlow(c);
          c.fillStyle = COL.bg;
          const r = rng(i + 5);
          for (let j = 0; j < 3; j++) {
            const lw = (w - s * 0.07) * (0.4 + r() * 0.6) * expoOut(prog(on, j * 0.2, 1));
            c.fillRect(px + w / 2 - s * 0.035 - lw, py - h * 0.25 + j * h * 0.22, lw, h * 0.1);
          }
        }
        c.restore();
        c.save(); c.globalAlpha *= clamp(pi * 2);
        c.strokeStyle = "rgba(242,237,227,0.6)"; c.lineWidth = Math.max(1.5, s * 0.008);
        c.beginPath(); c.moveTo(px, py + h / 2); c.lineTo(px, py + h / 2 + s * 0.05);
        c.moveTo(px - w * 0.2, py + h / 2 + s * 0.05); c.lineTo(px + w * 0.2, py + h / 2 + s * 0.05); c.stroke();
        c.restore();
      }
    },
    calendar(c, x, y, s, p) {
      const cols = 7, rows = 5, cs = s * 0.105, g = cs * 0.2;
      const gw = cols * cs + (cols - 1) * g, gh = rows * cs + (rows - 1) * g;
      const x0 = x + gw / 2, y0 = y - gh / 2 + s * 0.06;
      c.save();
      c.fillStyle = COL.white; c.globalAlpha *= clamp(p * 4);
      c.fillRect(x - gw / 2, y0 - s * 0.11, gw * expoOut(prog(p, 0, 0.3)), s * 0.035);
      c.restore();
      const r = rng(99), order = [];
      for (let i = 0; i < cols * rows; i++) order.push([r(), i]);
      order.sort((a, z) => a[0] - z[0]);
      const rank = new Array(cols * rows);
      order.forEach((o, k) => (rank[o[1]] = k));
      for (let i = 0; i < cols * rows; i++) {
        const col = i % cols, row = Math.floor(i / cols);
        const px = x0 - col * (cs + g) - cs / 2, py = y0 + row * (cs + g) + cs / 2;
        c.save();
        c.globalAlpha *= clamp(p * 5 - row * 0.3);
        c.strokeStyle = "rgba(242,237,227,0.25)"; c.lineWidth = Math.max(1, s * 0.004);
        c.strokeRect(px - cs / 2, py - cs / 2, cs, cs);
        const fp = prog(p * 40 - rank[i] * 0.9, 0, 2.5);
        if (rank[i] < 24 && fp > 0) {
          const sz = cs * 0.78 * backOut(fp);
          c.fillStyle = rank[i] % 5 === 0 ? COL.white : COL.lime;
          c.fillRect(px - sz / 2, py - sz / 2, sz, sz);
        }
        c.restore();
      }
    },
    bars(c, x, y, s, p) {
      const n = 7, bw = s * 0.09, g = s * 0.035, tw = n * bw + (n - 1) * g;
      const baseY = y + s * 0.34, r = rng(31);
      const hs = [0.35, 0.5, 0.42, 0.66, 0.58, 0.82, 1.0].map((v) => v * s * 0.58);
      c.save();
      c.strokeStyle = "rgba(242,237,227,0.4)"; c.lineWidth = Math.max(1, s * 0.005);
      c.beginPath(); c.moveTo(x - tw / 2 - g, baseY); c.lineTo(x - tw / 2 - g + (tw + 2 * g) * expoOut(prog(p, 0, 0.3)), baseY); c.stroke();
      const tops = [];
      for (let i = 0; i < n; i++) {
        const bx = x + tw / 2 - bw - i * (bw + g);   // من اليمين إلى اليسار
        const e = elasticOut(prog(p, 0.1 + i * 0.07, 0.55 + i * 0.07));
        const h = hs[i] * e;
        c.fillStyle = i === n - 1 ? COL.lime : i % 2 ? "rgba(242,237,227,0.85)" : "rgba(200,255,46,0.55)";
        c.fillRect(bx, baseY - h, bw, h);
        tops.push([bx + bw / 2, baseY - h - s * 0.04]);
        r();
      }
      const lp = prog(p, 0.5, 0.95);
      if (lp > 0) {
        c.strokeStyle = COL.white; c.lineWidth = Math.max(1.5, s * 0.007); c.lineJoin = "round";
        c.beginPath();
        const m = (tops.length - 1) * lp;
        for (let i = 0; i <= Math.floor(m); i++) i === 0 ? c.moveTo(tops[0][0], tops[0][1]) : c.lineTo(tops[i][0], tops[i][1]);
        const fi = Math.floor(m);
        if (fi < tops.length - 1) c.lineTo(lerp(tops[fi][0], tops[fi + 1][0], m - fi), lerp(tops[fi][1], tops[fi + 1][1], m - fi));
        c.stroke();
      }
      const v = Math.round(87 * expoOut(prog(p, 0.1, 0.9)));
      const npx = s * 0.13;
      setText(c, font(900, npx)); c.fillStyle = COL.lime;
      c.globalAlpha *= clamp(p * 4);
      c.fillText(ad(v) + "٪", x - tw * 0.2, baseFor(y - s * 0.3, npx));
      c.restore();
    },
    beads(c, x, y, s, p) {
      const R = s * 0.4, br = s * 0.027;
      c.save();
      c.strokeStyle = "rgba(242,237,227,0.15)"; c.lineWidth = Math.max(1, s * 0.004);
      c.beginPath(); c.arc(x, y, R, 0, TAU); c.stroke();
      const lit = p * 33;
      for (let j = 0; j < 33; j++) {
        const a = -Math.PI / 2 - (j + 1) * (TAU / 34);   // عكس عقارب الساعة من الأعلى
        const bx = x + Math.cos(a) * R, by = y + Math.sin(a) * R;
        const q = clamp(lit - j);
        c.fillStyle = q > 0 ? COL.lime : "rgba(242,237,227,0.18)";
        c.beginPath(); c.arc(bx, by, br * (q > 0 ? lerp(0.6, 1, backOut(q)) : 0.55), 0, TAU); c.fill();
      }
      diamond(c, x, y - R, br * 1.6, lit >= 33 ? COL.lime : COL.white);
      const npx = s * 0.26;
      setText(c, font(900, npx)); c.fillStyle = COL.white;
      c.fillText(ad(Math.max(0, Math.min(33, Math.ceil(lit)))), x, baseFor(y, npx));
      c.restore();
    },
  };

  // «تم» — تكبر، تتمطط، ترتطم، تنفجر
  function tamLayout() {
    return memo(`tam:${W}x${H}`, () => {
      const px = fit("تم", 900, S * 0.38, AR, W * 0.5);
      const f = font(900, px), fs = font(900, px, SW);
      const kmax = kMax("تم", 0, f, W * 0.86);
      const base = baseFor(cy - S * 0.02, px);
      const mask = textMask(kstr("تم", 0, 1), fs);
      const pts = maskPoints(mask, Math.max(3, Math.round(px / 42))).map((q) => [cx + q[0], base + q[1]]);
      const r = rng(333);
      const parts = pts.map((q) => ({ x: q[0], y: q[1], a: r() * TAU, v: S * (0.1 + r() * 0.6), s: S * (0.004 + r() * 0.008), o: r() < 0.3 }));
      return { px, f, fs, kmax, base, parts };
    });
  }
  function sceneTam(c) {
    const L = tamLayout(), K = TL.KASHIDA.tam;
    if (tb < 32.5) {
      const pop = backOut(prog(tb, 30, 30.45));
      let k = 0;
      if (tb >= K.grow[0] && tb < K.hold) k = L.kmax * expoOut(prog(tb, K.grow[0], K.grow[1]));
      if (tb >= K.hold) k = lerp(L.kmax, K.rest, elasticOut(prog(tb, K.hold, K.hold + 0.5)));
      const slam = framesSince(K.hold) >= 0;
      const sc = pop * (slam ? slamScale(K.hold, 1.5) : 1);
      c.save();
      c.translate(cx, cy); c.scale(sc, sc); c.translate(-cx, -cy);
      drawKashida(c, "تم", 0, k, cx, L.base, slam ? L.fs : L.f, COL.lime);
      c.restore();
      return;
    }
    const p = prog(tb, 32.5, 33);
    const e = expoOut(p);
    c.save();
    for (const q of L.parts) {
      const dx = q.x - cx, dy = q.y - cy, d = Math.hypot(dx, dy) || 1;
      const x = q.x + (dx / d * 0.7 + Math.cos(q.a) * 0.5) * q.v * e;
      const y = q.y + (dy / d * 0.7 + Math.sin(q.a) * 0.5) * q.v * e + S * 0.1 * p * p;
      c.globalAlpha = 1 - p;
      c.fillStyle = q.o ? COL.spark : COL.lime;
      const s = q.s * (1 - p * 0.6);
      c.fillRect(x - s, y - s, s * 2, s * 2);
    }
    c.restore();
    if (p < 0.4) { c.save(); c.globalAlpha = 1 - p / 0.4; c.fillStyle = "rgba(255,106,31,0.25)"; c.beginPath(); c.arc(cx, cy, S * 0.5 * e, 0, TAU); c.fill(); c.restore(); }
  }

  // ───────────────────────── المشهد ٤ ─────────────────────────
  function scene4(c) {
    const Z = TL.S4;
    if (tb < TL.DROP) return countdown(c);
    if (tb < Z.rtl[0]) return rows(c);
    if (tb < Z.tiles[0]) return arabicRTL(c);
    if (tb < Z.cube[0]) return tiles(c);
    if (tb < Z.goo[0]) return cube(c);
    if (tb < Z.ibdaa[0]) return goo(c);
    if (tb < Z.tunnel[0]) return ibdaa(c);
    if (tb < Z.count[0]) return tunnel(c);
    return counters(c);
  }
  function countdown(c) {
    const i = clamp(Math.floor(tb - 33), 0, 2), C = TL.COUNTDOWN[i];
    const f = tb - C.at;
    const px = S * 0.5;
    // حلقات متسارعة (الصاعد)
    const rise = prog(tb, 33, 36);
    c.save();
    c.strokeStyle = "rgba(242,237,227,0.14)"; c.lineWidth = Math.max(1, S * 0.003);
    c.setLineDash([S * 0.01, S * 0.02]);
    c.lineDashOffset = -tb * S * 0.2 * (1 + rise * 6);
    c.beginPath(); c.arc(cx, cy, S * 0.36, 0, TAU); c.stroke();
    c.setLineDash([]);
    const rp = frac(tb - 33);
    c.strokeStyle = COL.lime; c.globalAlpha = 1 - rp; c.lineWidth = S * 0.006 * (1 - rp) + 1;
    c.beginPath(); c.arc(cx, cy, S * (0.2 + 0.4 * expoOut(rp)), 0, TAU); c.stroke();
    c.globalAlpha = 1;
    c.fillStyle = COL.lime; c.fillRect(W * 0.2, H - S * 0.14, W * 0.6 * rise, Math.max(2, S * 0.004));
    c.restore();
    const sc = lerp(0.4, 1, backOut(prog(f, 0, 0.3))) * (1 + 0.1 * prog(f, 0.3, 1));
    const a = 1 - prog(f, 0.8, 1);
    c.save(); c.globalAlpha = a;
    c.translate(cx, cy); c.scale(sc, sc); c.translate(-cx, -cy);
    setText(c, font(900, px)); c.fillStyle = C.d === 1 ? COL.lime : COL.white;
    c.fillText(ad(C.d), cx, baseFor(cy, px));
    c.restore();
    const wf = prog(tb, 35.55, 36);
    if (wf > 0) { c.save(); c.globalAlpha = expoIn(wf) * 0.9; c.fillStyle = COL.white; c.fillRect(-W, -H, W * 3, H * 3); c.restore(); }
  }
  function rowsLayout() {
    return memo(`rows:${W}x${H}`, () => {
      const rowH = (H * 0.84) / 4, px = rowH * 0.6;
      const f = font(900, px);
      return { rowH, px, f, units: TL.ROWS.map((w) => ({ w, tw: measure(w, f).width })), gap: px * 0.45 };
    });
  }
  function drawRows(c, squash) {
    const L = rowsLayout();
    const n = Math.floor(tb - 36), fr = frac(tb - 36);
    const stepped = n + expoOut(clamp(fr / 0.5));
    const enter = 1 - expoOut(prog(tb, 36, 36.6));
    for (let i = 0; i < 4; i++) {
      const U = L.units[i], dir = i % 2 ? -1 : 1;
      const u = U.tw + L.gap * 2;
      let y = H * 0.08 + L.rowH * (i + 0.5);
      if (squash > 0) y = lerp(y, cy, squash);
      const offX = dir * (S * 0.32 * stepped + W * enter);
      const base = baseFor(y, L.px);
      c.save();
      if (squash > 0) { c.translate(0, y); c.scale(1, 1 - squash * 0.95); c.translate(0, -y); c.globalAlpha = 1 - squash; }
      setText(c, L.f, "right");
      const hot = ((n % 4) + 4) % 4 === i;
      const start = ((offX % u) + u) % u - u;
      for (let x = W + start + u; x > -u; x -= u) {
        if (i % 2) { c.strokeStyle = hot ? COL.lime : "rgba(200,255,46,0.8)"; c.lineWidth = Math.max(1.5, L.px * 0.03); c.strokeText(U.w, x, base); }
        else { c.fillStyle = hot ? COL.lime : COL.white; c.fillText(U.w, x, base); }
        diamond(c, x - U.tw - L.gap, y, L.px * 0.09, COL.lime);
      }
      c.restore();
    }
  }
  function rows(c) {
    drawRows(c, 0);
    const fl = prog(tb, 36, 36.35);
    if (fl < 1) { c.save(); c.globalAlpha = 1 - expoOut(fl); c.fillStyle = COL.white; c.fillRect(-W, -H, W * 3, H * 3); c.restore(); }
  }
  function drawWord(c, str, fam, w, px, color, x, y) {
    setText(c, font(w, px, fam), "center", fam === LAT ? "ltr" : "rtl");
    c.fillStyle = color; c.fillText(str, x, baseFor(y, px, fam));
  }
  function rtlLayout() {
    return memo(`rtl:${W}x${H}`, () => ({
      ar: fit("عربي", 900, S * 0.42, AR, W * 0.78),
      la: fit("RTL", 400, S * 0.34, LAT, W * 0.7),
    }));
  }
  function drawRTLFinal(c) { const L = rtlLayout(); drawWord(c, "RTL", LAT, 400, L.la, COL.white, cx, cy); }
  function arabicRTL(c) {
    const L = rtlLayout();
    const sq = expoIn(prog(tb, 40, 40.45));
    if (sq < 1) drawRows(c, sq);
    const pop = backOut(prog(tb, 40.4, 40.8));
    const drawAr = () => {
      if (pop <= 0) return;
      c.save(); c.translate(cx, cy); c.scale(pop, pop); c.translate(-cx, -cy);
      drawWord(c, "عربي", AR, 900, L.ar, COL.lime, cx, cy); c.restore();
    };
    wipe(c, expoInOut(prog(tb, 41, 42)), drawAr, () => drawRTLFinal(c));
  }
  // المسح: قناع مائل ١٢° يعبر من اليمين
  function wipe(c, p, drawA, drawB) {
    if (p <= 0) return drawA();
    if (p >= 1) return drawB();
    const k = Math.tan((12 * Math.PI) / 180);          // ميل الحافة
    const sl = k * H, bw = S * 0.018;
    const x = lerp(W + sl + bw, -sl - bw, p);          // موضع الحافة في منتصف الارتفاع
    const ex = (yy) => x + (yy - H / 2) * k;           // x للحافة عند الارتفاع yy
    const y0 = -H, y1 = H * 2;
    c.save(); c.beginPath(); c.moveTo(-W * 2, y0); c.lineTo(ex(y0), y0); c.lineTo(ex(y1), y1); c.lineTo(-W * 2, y1); c.closePath(); c.clip(); drawA(); c.restore();
    c.save(); c.beginPath(); c.moveTo(ex(y0), y0); c.lineTo(W * 3, y0); c.lineTo(W * 3, y1); c.lineTo(ex(y1), y1); c.closePath(); c.clip(); drawB(); c.restore();
    c.save(); c.fillStyle = COL.lime;
    c.beginPath(); c.moveTo(ex(y0) - bw, y0); c.lineTo(ex(y0), y0); c.lineTo(ex(y1), y1); c.lineTo(ex(y1) - bw, y1); c.closePath(); c.fill();
    c.restore();
  }
  function tiles(c) {
    const n = 6, tw = W / n, th = H / n, ins = Math.max(1, S * 0.002);
    for (let col = 0; col < n; col++) for (let row = 0; row < n; row++) {
      const d = (n - 1 - col) * 0.09 + row * 0.035;
      const p1 = prog(tb, 42 + d, 42 + d + 0.32), p2 = prog(tb, 43 + d, 43 + d + 0.32);
      const x = col * tw + tw / 2, y = row * th + th / 2;
      let face, sx;
      if (p1 < 0.5) { face = 0; sx = Math.cos(p1 * Math.PI); }
      else if (p2 < 0.5) { face = 1; sx = p2 > 0 ? Math.cos(p2 * Math.PI) : -Math.cos(p1 * Math.PI); }
      else { face = 2; sx = -Math.cos(p2 * Math.PI); }
      const lift = 1 - 0.12 * Math.sin((p1 < 1 ? p1 : p2) * Math.PI);
      c.save();
      c.translate(x, y); c.scale(Math.max(0.001, Math.abs(sx)) * lift, lift);
      c.beginPath(); c.rect(-tw / 2 + ins, -th / 2 + ins, tw - 2 * ins, th - 2 * ins); c.clip();
      if (face === 0) { c.translate(-x, -y); drawRTLFinal(c); }
      else if (face === 1) { c.fillStyle = COL.lime; c.fillRect(-tw, -th, tw * 2, th * 2); diamond(c, 0, 0, Math.min(tw, th) * 0.12, COL.bg); }
      else { c.strokeStyle = "rgba(200,255,46,0.25)"; c.lineWidth = 2; c.strokeRect(-tw / 2 + ins, -th / 2 + ins, tw - 2 * ins, th - 2 * ins); c.globalAlpha = 1 - prog(tb, 43.5, 44); }
      c.restore();
    }
  }
  function cubeTex(i) {
    return memo(`cube${i}:${W}x${H}`, () => {
      const E = Math.round(S * 0.46), o = mk(E, E);
      const g = o.ctx, lime = i % 2 === 1;
      g.fillStyle = lime ? COL.lime : COL.panel; g.fillRect(0, 0, E, E);
      g.strokeStyle = lime ? COL.bg : COL.lime; g.lineWidth = E * 0.02; g.strokeRect(E * 0.04, E * 0.04, E * 0.92, E * 0.92);
      const w = TL.CUBE[i], px = Math.min(E * 0.34, E * 0.34 * (E * 0.8) / measure(w, font(900, E * 0.34)).width);
      setText(g, font(900, px)); g.fillStyle = lime ? COL.bg : COL.white;
      g.fillText(w, E / 2, baseFor(E * 0.5, px));
      setText(g, font(400, E * 0.07, LAT), "left", "ltr"); g.fillStyle = lime ? COL.bg : COL.lime;
      g.fillText("0" + (i + 1), E * 0.1, E * 0.17);
      diamond(g, E * 0.86, E * 0.86, E * 0.035, lime ? COL.bg : COL.lime);
      return { cv: o.cv, E };
    });
  }
  function cube(c) {
    const E = S * 0.46, a = E / 2, D = S * 1.7;
    const q = tb - 45;
    let turns = q < 0 ? 0 : Math.min(Math.floor(q), 2) + (Math.floor(q) < 3 ? expoOut(clamp(frac(q) / 0.5)) : 1);
    if (q >= 3) turns = 3;
    const enter = backOut(prog(tb, 44, 44.45));
    turns += -0.5 * (1 - expoOut(prog(tb, 44, 44.6)));
    const ex = expoIn(prog(tb, 47.55, 48));
    turns += ex * 0.6;
    const beatBump = tb >= 45 ? 1 + 0.06 * (1 - clamp(frac(tb) / 0.3)) : 1;
    const sc = enter * (1 - ex) * beatBump;
    if (sc <= 0.001) return;
    const faces = [];
    for (let i = 0; i < 4; i++) {
      const al = ((i - turns) * Math.PI) / 2;
      const nz = Math.cos(al);
      if (nz <= 0.001) continue;
      faces.push({ i, al, z: nz });
    }
    faces.sort((f1, f2) => f1.z - f2.z);
    c.save(); c.translate(cx, cy); c.scale(sc, sc); c.translate(-cx, -cy);
    const N = 64;
    for (const F of faces) {
      const tex = cubeTex(F.i);
      const ccx = a * Math.sin(F.al), ccz = a * Math.cos(F.al);
      const tx = Math.cos(F.al), tz = -Math.sin(F.al);
      const proj = (s) => { const X = ccx + s * a * tx, Zz = ccz + s * a * tz; const k = D / (D - Zz); return [cx + X * k, a * k]; };
      for (let k = 0; k < N; k++) {
        const s0 = -1 + (2 * k) / N, s1 = s0 + 2 / N;
        const [x0, h0] = proj(s0), [x1, h1] = proj(s1);
        const hm = (h0 + h1) / 2;
        c.drawImage(tex.cv, (k / N) * tex.E, 0, tex.E / N + 0.5, tex.E, Math.min(x0, x1), cy - hm, Math.abs(x1 - x0) + 0.8, hm * 2);
      }
      const [lx, lh] = proj(-1), [rx, rh] = proj(1);
      c.beginPath(); c.moveTo(lx, cy - lh); c.lineTo(rx, cy - rh); c.lineTo(rx, cy + rh); c.lineTo(lx, cy + lh); c.closePath();
      c.fillStyle = `rgba(0,0,0,${(1 - F.z) * 0.65})`; c.fill();
      c.strokeStyle = COL.lime; c.lineWidth = Math.max(1.5, S * 0.004); c.stroke();
    }
    c.restore();
  }
  function goo(c) {
    const gw = Math.round(W / 3), gh = Math.round(H / 3), k = gw / W;
    const o = off("goo", gw, gh, true), g = o.ctx;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, gw, gh);
    g.filter = `blur(${(S * 0.028 * k).toFixed(2)}px)`;
    g.fillStyle = "#fff";
    const Rd = S * 0.2;
    const targets = [[0, -Rd], [Rd, 0], [0, Rd], [-Rd, 0], [Rd / 2, -Rd / 2], [Rd / 2, Rd / 2], [-Rd / 2, Rd / 2], [-Rd / 2, -Rd / 2], [0, 0]];
    const r = rng(48);
    const burst = expoOut(prog(tb, 48, 48.6));
    const conv = elasticOut(prog(tb, 49.2, 49.85));
    for (let i = 0; i < 9; i++) {
      const a0 = (i / 9) * TAU + r(), R = S * (0.12 + r() * 0.22), sp = 1.5 + r() * 2, rad = S * (0.035 + r() * 0.035);
      const ang = a0 + (tb - 48) * sp;
      const wob = 0.65 + 0.35 * Math.sin((tb - 48) * 5 + i);
      let x = Math.cos(ang) * R * wob * burst, y = Math.sin(ang) * R * wob * burst;
      x = lerp(x, targets[i][0], conv); y = lerp(y, targets[i][1], conv);
      g.beginPath(); g.arc((cx + x) * k, (cy + y) * k, rad * k * lerp(1, 0.9, conv), 0, TAU); g.fill();
    }
    g.filter = "none";
    const id = g.getImageData(0, 0, gw, gh), d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const al = clamp((d[i + 3] - 120) * 10, 0, 255);
      d[i] = 200; d[i + 1] = 255; d[i + 2] = 46; d[i + 3] = al;
    }
    g.putImageData(id, 0, 0);
    const toD = prog(tb, 49.6, 49.95);
    c.save();
    c.globalAlpha = 1 - toD;
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = "high";
    c.drawImage(o.cv, 0, 0, W, H);
    c.restore();
    if (toD > 0) {
      c.save(); c.globalAlpha = toD; glow(c, "rgba(200,255,46,0.5)", S * 0.04);
      diamond(c, cx, cy, Rd * 1.08 * lerp(1, 1.05, toD), COL.lime); c.restore();
    }
  }
  function ibdaaLayout() {
    return memo(`ib:${W}x${H}`, () => {
      const px = fit("إبداع", 900, S * 0.3, AR, W * 0.6), f = font(900, px);
      return { px, f, kmax: kMax("إبداع", TL.KASHIDA.ibdaa.index, f, W * 0.95) };
    });
  }
  function ibdaa(c) {
    const L = ibdaaLayout(), K = TL.KASHIDA.ibdaa;
    let k;
    if (tb < K.back[0]) k = L.kmax * expoOut(prog(tb, K.grow[0], K.grow[1]));
    else k = lerp(L.kmax, 1, elasticOut(prog(tb, K.back[0], K.back[1])));
    const vel = tb < K.back[0] ? 1 - prog(tb, K.grow[0], K.grow[1]) : 0;
    const r = rng(50);
    c.save();
    for (let i = 0; i < 26; i++) {
      const y = r() * H, len = W * (0.1 + r() * 0.4), sp = 0.8 + r();
      const x = W - frac(r() + (tb - 50) * sp) * (W + len) * 1.2;
      c.globalAlpha = 0.12 + 0.5 * vel; c.fillStyle = i % 4 ? COL.white : COL.lime;
      c.fillRect(x, y, len, Math.max(1, S * 0.002));
    }
    c.restore();
    const pop = backOut(prog(tb, 50, 50.3));
    c.save(); c.translate(cx, cy); c.scale(lerp(0.6, 1, pop), lerp(0.6, 1, pop)); c.translate(-cx, -cy);
    drawKashida(c, "إبداع", K.index, k, cx, baseFor(cy, L.px), L.f, COL.lime);
    c.restore();
  }
  function tunnel(c) {
    const p = prog(tb, 52, 54);
    const travel = (tb - 52) * 0.8 + expoIn(p) * 2.2;
    const speed = 0.4 + 3 * expoIn(p);
    const r = rng(52);
    c.save();
    const gr = c.createRadialGradient(cx, cy, 0, cx, cy, S * 0.3);
    gr.addColorStop(0, `rgba(242,237,227,${0.15 + 0.4 * p})`); gr.addColorStop(1, "rgba(242,237,227,0)");
    c.fillStyle = gr; c.fillRect(0, 0, W, H);
    c.lineCap = "round";
    for (let i = 0; i < 260; i++) {
      const th = r() * TAU, z0 = r(), lime = r() < 0.18, wv = r();
      const z = 1 - frac(z0 + travel);
      const zz = Math.max(0.03, z);
      const r1 = (S * 0.05) / zz, r2 = r1 * (1 + 0.12 * speed);
      if (r1 > Math.hypot(W, H)) continue;
      c.globalAlpha = clamp((1 - z) * 1.4) * 0.9;
      c.strokeStyle = lime ? COL.lime : COL.white;
      c.lineWidth = Math.max(0.8, (S * 0.002 * (0.5 + wv)) / zz * 0.3);
      c.beginPath(); c.moveTo(cx + Math.cos(th) * r1, cy + Math.sin(th) * r1); c.lineTo(cx + Math.cos(th) * r2, cy + Math.sin(th) * r2); c.stroke();
    }
    for (let j = 0; j < 7; j++) {
      const z = Math.max(0.04, 1 - frac(j / 7 + travel * 0.5));
      const rr = (S * 0.07) / z;
      c.globalAlpha = clamp((1 - z) * 1.2) * 0.7;
      c.strokeStyle = j % 2 ? COL.lime : "rgba(242,237,227,0.8)";
      c.lineWidth = Math.max(1, (S * 0.0015) / z);
      c.save(); c.translate(cx, cy); c.rotate(tb * 0.6 + j * 0.3); diamond(c, 0, 0, rr); c.stroke(); c.restore();
    }
    c.restore();
    const fl = prog(tb, 53.7, 54);
    if (fl > 0) { c.save(); c.globalAlpha = expoIn(fl); c.fillStyle = COL.white; c.fillRect(-W, -H, W * 3, H * 3); c.restore(); }
  }
  function lemniscate(c, x, y, A, lw) {
    c.save(); c.strokeStyle = COL.lime; c.lineWidth = lw; c.lineJoin = "round"; c.beginPath();
    for (let i = 0; i <= 80; i++) {
      const u = (i / 80) * TAU, d = 1 + Math.sin(u) ** 2;
      const px = x + (A * Math.cos(u)) / d, py = y + (A * Math.sin(u) * Math.cos(u)) / d;
      i ? c.lineTo(px, py) : c.moveTo(px, py);
    }
    c.closePath(); c.stroke(); c.restore();
  }
  function counters(c) {
    const wide = W / H > 1.4;
    const npx = wide ? S * 0.24 : S * 0.15, lpx = wide ? S * 0.075 : S * 0.065;
    const fl = 1 - prog(tb, 54, 54.3);
    if (fl > 0) { c.save(); c.globalAlpha = expoIn(fl); c.fillStyle = COL.white; c.fillRect(-W, -H, W * 3, H * 3); c.restore(); }
    TL.COUNTERS.forEach((C, i) => {
      const st = 54 + i * 0.18;
      const pop = backOut(prog(tb, st, st + 0.35));
      if (pop <= 0) return;
      const pc = expoOut(prog(tb, st, st + 1.1));
      const beat = 1 + 0.05 * (1 - clamp(frac(tb) / 0.3));
      let x, y, nx, ny, lx, ly;
      if (wide) { x = cx + (1 - i) * W * 0.3; y = cy; nx = x; ny = y - S * 0.06; lx = x; ly = y + S * 0.2; }
      else { x = cx; y = cy + (i - 1) * S * 0.25; nx = x + S * 0.12; ny = y; lx = x - S * 0.2; ly = y; }
      c.save(); c.translate(x, y); c.scale(pop * beat, pop * beat); c.translate(-x, -y);
      if (C.to < 0) {
        if (tb < st + 1.0) {
          const v = 10 + Math.floor(hash(frame + i * 97) * 89);
          setText(c, font(900, npx)); c.fillStyle = COL.lime; c.fillText(ad(v), nx, baseFor(ny, npx));
        } else {
          const ip = backOut(prog(tb, st + 1.0, st + 1.3));
          lemniscate(c, nx, ny, npx * 0.55 * ip, npx * 0.12);
        }
      } else {
        const v = Math.round(C.to * pc);
        setText(c, font(900, npx)); c.fillStyle = COL.lime;
        c.fillText(C.prefix + ad(v) + C.suffix, nx, baseFor(ny, npx));
      }
      setText(c, font(500, lpx)); c.fillStyle = COL.white;
      c.fillText(C.label, lx, baseFor(ly, lpx));
      c.restore();
    });
  }

  // ───────────────────────── المشهد ٥ ─────────────────────────
  function s5Layout() {
    return memo(`s5:${W}x${H}`, () => {
      const text = TL.TYPE.final.text;
      const px = fit(text, 900, S * 0.105, AR, W * 0.8);
      const f = font(900, px);
      const lay = layoutLetters(text, f);
      const base = baseFor(cy - S * 0.04, px);
      const rightX = cx + lay.width / 2 + px * 0.12;
      const dot = { x: rightX - lay.width - px * 0.34, y: base - px * 0.08, r: px * 0.11 };
      const limeFrom = text.indexOf("بنقطة");
      return { text, px, f, lay, base, rightX, dot, limeFrom,
        webPx: S * 0.05, waPx: S * 0.04, webY: cy + S * 0.13, waY: cy + S * 0.215 };
    });
  }
  function scene5(c) {
    const L = s5Layout(), T = TL.TYPE.final, O = TL.OUTRO;
    const dotAt = T.start + [...T.text].length * T.step;
    const bl = prog(tb, O.blur[0], O.blur[1]);
    if (bl < 1) {
      c.save();
      if (bl > 0) { c.filter = `blur(${(24 * (S / 1080) * bl).toFixed(2)}px)`; c.globalAlpha = 1 - bl; }
      drawLetters(c, L.lay, L.f, L.rightX, L.base,
        (k) => popLetter(T.start + k.charIdx * T.step, 0.4, S * 0.04),
        (k) => (k.charIdx >= L.limeFrom ? COL.lime : COL.white));
      const ap = prog(tb, O.accounts, O.accounts + 0.6);
      if (ap > 0) {
        c.globalAlpha *= ap;
        const dy = (1 - expoOut(ap)) * S * 0.03;
        drawWord(c, "codef8.com", LAT, 400, L.webPx, COL.white, cx, L.webY + dy);
        const lab = "واتساب", num = "+966 56 284 8586";
        const fL = font(500, L.waPx), fN = font(400, L.waPx * 0.82, LAT);
        const wl = measure(lab, fL).width, wn = measure(num, fN, "ltr").width, gap = L.waPx * 0.5;
        const x0 = cx + (wl + gap + wn) / 2;
        setText(c, fL, "right"); c.fillStyle = "rgba(242,237,227,0.7)"; c.fillText(lab, x0, baseFor(L.waY + dy, L.waPx));
        setText(c, fN, "right", "ltr"); c.fillStyle = COL.lime; c.fillText(num, x0 - wl - gap, baseFor(L.waY + dy, L.waPx * 0.82, LAT));
      }
      c.restore();
    }
    // النقطة: تظهر آخر الجملة، ثم تطير وتستقر في المنتصف مطابقةً للإطار الأول
    if (tb >= dotAt) {
      const fp = prog(tb, O.dotFly[0], O.dotFly[1]);
      if (fp >= 1) return drawCore(c);
      const e = expoInOut(fp);
      const pop = backOut(prog(tb, dotAt, dotAt + 0.3));
      const x = lerp(L.dot.x, cx, e), y = lerp(L.dot.y, cy, e);
      const r = lerp(L.dot.r * pop, coreR() * breathe(t), e);
      c.save(); glow(c, "rgba(200,255,46,0.55)", S * 0.035 * lerp(0.5, 1, e));
      diamond(c, x, y, r, COL.lime); c.restore();
    }
  }

  // ───────────────────────── الواجهة (HUD) ─────────────────────────
  function hud(c) {
    const a = prog(tb, 0.25, 1) * (1 - prog(tb, TL.OUTRO.hudOut[0], TL.OUTRO.hudOut[1]));
    if (a <= 0) return;
    const m = S * 0.05, px = Math.max(11, S * 0.024);
    c.save(); c.globalAlpha = a * 0.9;
    // أعلى اليمين: كودف ● REC
    const fA = font(700, px), fL = font(400, px * 0.78, LAT);
    let x = W - m;
    const y = m + px * 0.4;
    setText(c, fA, "right"); c.fillStyle = COL.white; c.fillText("كودف", x, baseFor(y, px));
    x -= measure("كودف", fA).width + px * 0.55;
    const recOn = tb < 56 ? Math.floor(tb) % 2 === 0 : Math.floor(tb * 0.5) % 2 === 0;
    c.fillStyle = recOn ? COL.lime : "rgba(200,255,46,0.25)";
    c.beginPath(); c.arc(x - px * 0.22, y, px * 0.22, 0, TAU); c.fill();
    x -= px * 0.7;
    setText(c, fL, "right", "ltr"); c.fillStyle = COL.white; c.fillText("REC", x, baseFor(y, px * 0.78, LAT));
    // أعلى اليسار: العدّاد الزمني
    const cs = Math.floor(t * 100 + 1e-6);
    const mm = Math.floor(cs / 6000), ss = Math.floor(cs / 100) % 60, cc = cs % 100;
    const str = [mm, ss, cc].map((v) => String(v).padStart(2, "0")).join(":");
    const fD = font(500, px);
    const slot = measure("٠", fD).width * 1.05, colon = px * 0.35;
    let tx = m;
    setText(c, fD, "center");
    c.fillStyle = COL.white;
    for (const ch of str) {
      if (ch === ":") { c.fillStyle = "rgba(242,237,227,0.5)"; c.fillRect(tx + colon / 2 - px * 0.04, y - px * 0.18, px * 0.08, px * 0.08); c.fillRect(tx + colon / 2 - px * 0.04, y + px * 0.08, px * 0.08, px * 0.08); c.fillStyle = COL.white; tx += colon; continue; }
      c.fillText(ad(ch), tx + slot / 2, baseFor(y, px)); tx += slot;
    }
    // أسفل اليمين: رقم المشهد
    const sc = TL.SCENES.find((s) => tb >= s.from && tb < s.to) || TL.SCENES[4];
    const yb = H - m - px * 0.2;
    setText(c, fA, "right"); c.fillStyle = COL.white;
    c.fillText(`مشهد ${ad(sc.n)}/${ad(5)}`, W - m, baseFor(yb, px));
    // أسفل اليسار: 128 BPM مع مؤشر ينبض
    const live = tb < 56;
    const pulse = live ? 1 - clamp(frac(tb) / 0.35) : 0;
    c.save(); glow(c, "rgba(200,255,46,0.7)", px * pulse);
    diamond(c, m + px * 0.3, yb, px * (0.22 + 0.16 * pulse), live ? COL.lime : "rgba(200,255,46,0.3)");
    c.restore();
    setText(c, fL, "left", "ltr"); c.fillStyle = COL.white;
    c.fillText("128 BPM", m + px * 0.85, baseFor(yb, px * 0.78, LAT));
    for (let i = 0; i < 4; i++) {
      const on = live && ((Math.floor(tb) % 4) + 4) % 4 === i;
      c.fillStyle = on ? COL.lime : "rgba(242,237,227,0.2)";
      c.fillRect(m + px * 0.85 + measure("128 BPM", fL, "ltr").width + px * 0.5 + i * px * 0.4, yb - px * 0.08, px * 0.25, px * 0.16);
    }
    c.restore();
  }

  // ───────────────────────── الخلفية ─────────────────────────
  function grainTile() {
    return memo("grain", () => {
      const n = 256, o = mk(n, n, true), id = o.ctx.createImageData(n, n), r = rng(7);
      for (let i = 0; i < n * n; i++) { const v = r() * 255; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; }
      o.ctx.putImageData(id, 0, 0);
      return o.cv;
    });
  }
  function finish(c) {
    const vg = memo(`vig:${W}x${H}`, () => {
      const g = c.createRadialGradient(cx, cy, S * 0.3, cx, cy, Math.hypot(W, H) * 0.62);
      g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,0.55)");
      return g;
    });
    c.fillStyle = vg; c.fillRect(0, 0, W, H);
    // حبيبات: البذرة = الإطار مقسومًا على ١٧٩٩ فيتطابق الإطار الأخير مع الأول
    const seed = frame % (TL.FRAMES - 1);
    const r = rng(seed + 1);
    const pat = c.createPattern(grainTile(), "repeat");
    c.save();
    c.globalAlpha = 0.055; c.globalCompositeOperation = "overlay";
    c.translate(-Math.floor(r() * 256), -Math.floor(r() * 256));
    c.fillStyle = pat; c.fillRect(0, 0, W + 256, H + 256);
    c.restore();
  }

  // ───────────────────────── الإطار ─────────────────────────
  function scenes(c) {
    if (tb < 8) return scene1(c);
    if (tb < 13.5) return scene2(c);
    if (tb < 14.5) return wipe(c, expoInOut(prog(tb, 13.5, 14.5)), () => scene2(c), () => scene3(c));
    if (tb < 33) return scene3(c);
    if (tb < 56) return scene4(c);
    return scene5(c);
  }
  function renderAt(time, w = 1080, h = 1080) {
    // أول رسم بعد تغيير المقاس يختلف ببكسلات قليلة (ذاكرة الظلال)، فيُرسم إطار تمهيدي يُهمل
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; draw(time, w, h); }
    return draw(time, w, h);
  }
  function draw(time, w, h) {
    W = w; H = h; S = Math.min(W, H); cx = W / 2; cy = H / 2;
    t = ((time % DUR) + DUR) % DUR;
    frame = Math.round(t * FPS);
    tb = t / BEAT;
    const c = ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1; c.globalCompositeOperation = "source-over"; c.filter = "none"; noGlow(c);
    c.fillStyle = COL.bg; c.fillRect(0, 0, W, H);
    const sh = shakeNow();
    c.save(); c.translate(sh.x, sh.y);
    scenes(c);
    c.restore();
    c.setTransform(1, 0, 0, 1, 0, 0); c.filter = "none"; c.globalAlpha = 1; noGlow(c);
    const fl = flashNow();
    if (fl) { c.fillStyle = `rgba(242,237,227,${fl})`; c.fillRect(0, 0, W, H); }
    finish(c);
    hud(c);
    return cv;
  }

  window.renderAt = renderAt;
  window.REEL = { T_LAST, COL };
})();
