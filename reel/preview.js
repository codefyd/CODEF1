// ورقة المعاينة: إطار عند كل نبضة مفتاحية بالمقاسين ← reel/preview/contact.png
// الاستخدام: node reel/preview.js [نبضات إضافية مفصولة بفواصل]
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { serve } = require("./serve");

const KEY = [0, 6, 12, 22, 31, 35, 38, 45, 50, 55, 60, 63.9];
const extra = (process.argv[2] || "").split(",").filter(Boolean).map(Number);
const BEATS = extra.length ? extra : KEY;
const OUT = path.join(__dirname, "preview");

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const { srv, url } = await serve();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => console.error("PAGE ERROR:", e.message));
  await page.goto(url + "/reel/index.html?still=1");
  await page.evaluate(() => window.reelReady);

  const res = await page.evaluate(async ({ BEATS, extra }) => {
    const sizes = [[1080, 1080], [1920, 720]];
    const cell = 360, gap = 16, lab = 30;
    const cols = BEATS.length;
    const rowH = [cell, Math.round(cell * 720 / 1920 * 1.6)];
    const cw = [cell, Math.round(cell * 1.6)];
    const sheet = document.createElement("canvas");
    const perRow = 6;
    const rowsN = Math.ceil(cols / perRow);
    sheet.width = gap + perRow * (cw[1] + gap);
    sheet.height = gap + rowsN * (rowH[0] + lab + gap) + rowsN * (rowH[1] + lab + gap);
    const g = sheet.getContext("2d");
    g.fillStyle = "#1c1c22"; g.fillRect(0, 0, sheet.width, sheet.height);
    g.font = "16px monospace"; g.fillStyle = "#ddd";
    const frames = {};
    let y = gap;
    for (let s = 0; s < 2; s++) {
      const [W, H] = sizes[s];
      for (let r = 0; r < rowsN; r++) {
        for (let i = 0; i < perRow; i++) {
          const k = r * perRow + i;
          if (k >= cols) break;
          const beat = BEATS[k];
          const t = Math.min(beat * TL.BEAT, (TL.FRAMES - 1) / TL.FPS);
          const cv = renderAt(t, W, H);
          const x = gap + i * (cw[1] + gap);
          g.drawImage(cv, x, y + lab, cw[s], rowH[s]);
          g.fillStyle = "#ddd";
          g.fillText(`${W}x${H}  beat ${beat}  f${Math.round(t * 60)}`, x, y + 20);
          frames[`${W}x${H}_b${beat}`] = cv.toDataURL("image/png");
        }
        y += rowH[s] + lab + gap;
      }
    }
    // الحلقة: قارن الإطار ٠ بالإطار ١٧٩٩ بالبكسل
    const loop = {};
    for (const [W, H] of sizes) {
      const a = renderAt(0, W, H).getContext("2d").getImageData(0, 0, W, H).data.slice();
      const bcv = renderAt((TL.FRAMES - 1) / TL.FPS, W, H);
      const bb = bcv.getContext("2d").getImageData(0, 0, W, H).data;
      let diff = 0, maxd = 0;
      for (let i = 0; i < a.length; i++) { const d = Math.abs(a[i] - bb[i]); diff += d; if (d > maxd) maxd = d; }
      loop[`${W}x${H}`] = { meanAbsDiff: diff / a.length, maxDiff: maxd };
    }
    return { sheet: sheet.toDataURL("image/png"), frames, loop };
  }, { BEATS, extra });

  const png = (d) => Buffer.from(d.split(",")[1], "base64");
  const name = extra.length ? "contact-extra.png" : "contact.png";
  fs.writeFileSync(path.join(OUT, name), png(res.sheet));
  for (const [k, v] of Object.entries(res.frames)) fs.writeFileSync(path.join(OUT, `${k}.png`), png(v));
  console.log("sheet:", path.join(OUT, name));
  console.log("loop check (frame 0 vs 1799):", JSON.stringify(res.loop));
  await browser.close();
  srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
