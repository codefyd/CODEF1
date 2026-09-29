/* «نقطة» — جدول الأحداث الموحّد
   مصدر واحد تقرأ منه الحركة (reel.js) والصوت (audio.py عبر timeline.json).
   كل زمن هنا بالنبضات. النبضة = 60 / 128 = 0.46875 ث. */
(function (root) {
  const BPM = 128, BEAT = 60 / BPM, FPS = 60, BEATS = 64;
  const DURATION = BEATS * BEAT;            // 30.000
  const FRAMES = Math.round(DURATION * FPS); // 1800
  const b = (n) => n * BEAT;

  const SCENES = [
    { n: 1, from: 0,  to: 8  },
    { n: 2, from: 8,  to: 14 },
    { n: 3, from: 14, to: 33 },
    { n: 4, from: 33, to: 56 },
    { n: 5, from: 56, to: 64 },
  ];

  // ── الكتابة حرفًا حرفًا (كل حرف = نقرة مفتاح) ──
  const TYPE = {
    hook:  { text: "من الفكرة", start: 8.25, step: 0.16 },
    final: { text: "مشروعك القادم يبدأ بنقطة", start: 56.75, step: 0.125 },
  };

  // ── طلبات المحادثة: كل طلب ٤ نبضات ──
  const PROMPTS = [
    { text: "ابنِ لي منصة تدير شاشات العرض",       project: "سماراتس",    obj: "screens"  },
    { text: "أبغى نظام حجوزات ومالية بمسار واحد",  project: "سلس",        obj: "calendar" },
    { text: "لوحة تقيس الأداء التسويقي",           project: "نظام ولاء",  obj: "bars"     },
    { text: "موقع أذكار يرافقني كل يوم",           project: "أذكار كودف", obj: "beads"    },
  ].map((p, i) => {
    const at = 14 + i * 4;
    return Object.assign(p, {
      at,
      typeStart: at + 0.1, typeStep: 0.055,          // كتابة سريعة
      buildFrom: at + 0.9, buildTo: at + 3.1,          // بناء الكائن
      delStart: at + 3.25, delStep: 0.018,             // حذف سريع جدًا
    });
  });

  // ── الكشيدة: عدد عشري من التطويلات بعد حرف محدد ──
  const KASHIDA = {
    hook:  { word: "الفكرة", index: 3, grow: [9.6, 11.5],  hold: 12,   rest: 1.5 },
    tam:   { word: "تم",     index: 0, grow: [30.55, 31.8], hold: 32,  rest: 1.0 },
    ibdaa: { word: "إبداع",  index: 1, grow: [50.05, 51.2], back: [51.2, 52] },
  };

  // ── الارتطامات: الحجم 2.4←1 في ٥ إطارات + اهتزاز ١٢ إطارًا + ومضة إطار واحد ──
  const SLAMS = [
    { at: 6,  strength: 1.0, swash: false, id: "codef" },
    { at: 12, strength: 1.1, swash: true,  id: "product" },
    { at: 32, strength: 1.6, swash: true,  id: "tam" },
  ];

  const COUNTDOWN = [{ at: 33, d: 3 }, { at: 34, d: 2 }, { at: 35, d: 1 }];
  const DROP = 36;

  // ── المشهد ٤ بعد السقوط ──
  const S4 = {
    rows:   [36, 40],
    rtl:    [40, 42],
    tiles:  [42, 44],
    cube:   [44, 48],
    goo:    [48, 50],
    ibdaa:  [50, 52],
    tunnel: [52, 54],
    count:  [54, 56],
  };
  const ROWS = ["بوابات مؤسسية", "أنظمة إدارية", "لوحات متابعة", "منصات تفاعلية"];
  const CUBE = ["أصمّم", "أبرمج", "أُطلق", "أطوّر"];
  const COUNTERS = [
    { to: 10,  prefix: "+", suffix: "",  label: "مشاريع" },
    { to: 100, prefix: "",  suffix: "٪", label: "عربي" },
    { to: -1,  prefix: "",  suffix: "",  label: "تفاصيل" }, // ∞
  ];

  const OUTRO = { accounts: 60, dotFly: [62, 63.25], blur: [62, 63], hudOut: [61.75, 63] };

  // ── قائمة الأحداث الصوتية المشتقة من كل ما سبق ──
  function isArabicLetter(ch) { return /[ء-يٱ-ۓ]/.test(ch); }
  function events() {
    const ev = [];
    const push = (beat, type, extra) => ev.push(Object.assign({ beat: +beat.toFixed(5), type }, extra || {}));

    // المشهد ١
    push(0.0, "blip", { freq: 1320, gain: 0.18 });
    push(2, "whoosh", { dur: 1.4, gain: 0.8, dir: "up" });
    push(2, "pop", { freq: 900, gain: 0.5 });
    push(4, "whoosh", { dur: 1.8, gain: 0.55, dir: "down" });

    // الكتابة
    let n = 0;
    for (const key of Object.keys(TYPE)) {
      const s = TYPE[key];
      [...s.text].forEach((ch, i) => { if (ch !== " ") push(s.start + i * s.step, "key", { i: n++, gain: key === "final" ? 0.55 : 0.5 }); });
    }
    push(TYPE.final.start + TYPE.final.text.length * TYPE.final.step, "pop", { freq: 1500, gain: 0.35 }); // النقطة

    for (const p of PROMPTS) {
      [...p.text].forEach((ch, i) => { if (ch !== " ") push(p.typeStart + i * p.typeStep, "key", { i: n++, gain: 0.32 }); });
      push(p.buildFrom, "pop", { freq: 700, gain: 0.35 });
      push(p.buildTo - 0.3, "blip", { freq: 1760, gain: 0.2 });
      push(p.delStart, "whoosh", { dur: 0.5, gain: 0.25, dir: "down" });
    }

    // الكشيدة
    for (const k of Object.values(KASHIDA)) push(k.grow[0], "kashida", { dur: k.grow[1] - k.grow[0], f0: 220, f1: 880 });

    // الارتطامات
    for (const s of SLAMS) {
      push(s.at - 0.5, "whoosh", { dur: 0.5, gain: 0.5, dir: "up" });
      push(s.at, "impact", { gain: s.strength });
    }
    push(32.5, "impact", { gain: 1.2, low: true });
    push(32.5, "whoosh", { dur: 1.2, gain: 0.7, dir: "up" });
    push(14, "whoosh", { dur: 0.6, gain: 0.45, dir: "up" });

    // العدّ التنازلي + الصاعد + السقوط
    COUNTDOWN.forEach((c, i) => push(c.at, "blip", { freq: [660, 780, 990][i], gain: 0.55, dur: 0.35 }));
    push(33, "riser", { dur: 3 });
    push(DROP, "impact", { gain: 1.4, low: true });

    // الإيقاع الكامل ٣٦ ← ٥٦
    for (let x = DROP; x < 56; x += 0.5) {
      const whole = Math.abs(x - Math.round(x)) < 1e-6;
      if (whole) push(x, "kick");
      if (whole && ((x - DROP) % 2 === 1)) push(x, "clap");
      push(x, "hat", { open: !whole });
    }
    [40, 41, 42, 48, 50, 52].forEach(x => push(x, "whoosh", { dur: 0.45, gain: 0.35, dir: "up" }));
    for (let x = 44; x < 48; x++) push(x, "whoosh", { dur: 0.3, gain: 0.3, dir: "down" });
    for (let x = 54; x < 55.6; x += 0.125) push(x, "blip", { freq: 1400 + (x - 54) * 400, gain: 0.12, dur: 0.05 });

    // الختام
    push(56, "impact", { gain: 0.5 }); // آخر ضربة ثم سكون
    push(OUTRO.accounts, "blip", { freq: 1100, gain: 0.2 });
    push(OUTRO.dotFly[0], "whoosh", { dur: 1.2, gain: 0.35, dir: "down" });
    push(OUTRO.dotFly[1], "blip", { freq: 1320, gain: 0.18 });

    ev.sort((a, c) => a.beat - c.beat);
    return ev;
  }

  const TL = { BPM, BEAT, FPS, BEATS, DURATION, FRAMES, b, SCENES, TYPE, PROMPTS, KASHIDA, SLAMS,
    COUNTDOWN, DROP, S4, ROWS, CUBE, COUNTERS, OUTRO, isArabicLetter, events };

  if (typeof module !== "undefined" && module.exports) module.exports = TL;
  else root.TL = TL;
})(typeof window !== "undefined" ? window : globalThis);
