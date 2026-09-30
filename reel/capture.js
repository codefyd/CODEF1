// الالتقاط: يستدعي renderAt لكل إطار ويحفظ PNG في reel/frames-<W>x<H>/
// الاستخدام: node reel/capture.js 1080x1080 1920x720   [--workers 4] [--from 0 --to 1800]
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { serve } = require("./serve");
const TL = require("./timeline.js");

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? +args[i + 1] : d; };
const sizes = args.filter((a) => /^\d+x\d+$/.test(a));
if (!sizes.length) sizes.push("1080x1080", "1920x720");
const WORKERS = opt("--workers", 4);
const FROM = opt("--from", 0), TO = opt("--to", TL.FRAMES);

(async () => {
  const { srv, url } = await serve();
  const browser = await chromium.launch();
  for (const size of sizes) {
    const [W, H] = size.split("x").map(Number);
    const dir = path.join(__dirname, `frames-${size}`);
    fs.mkdirSync(dir, { recursive: true });
    const total = TO - FROM;
    let done = 0;
    const t0 = Date.now();
    const work = async (w) => {
      const page = await browser.newPage({ viewport: { width: 400, height: 400 }, deviceScaleFactor: 1 });
      page.on("pageerror", (e) => { console.error("PAGE ERROR:", e.message); process.exit(1); });
      await page.goto(`${url}/reel/index.html?still=1&w=${W}&h=${H}`);
      await page.evaluate(() => window.reelReady);
      for (let f = FROM + w; f < TO; f += WORKERS) {
        const data = await page.evaluate(([f, W, H]) => renderAt(f / TL.FPS, W, H).toDataURL("image/png"), [f, W, H]);
        fs.writeFileSync(path.join(dir, `f_${String(f).padStart(5, "0")}.png`), Buffer.from(data.slice(22), "base64"));
        done++;
        if (done % 60 === 0 || done === total) {
          const el = (Date.now() - t0) / 1000;
          process.stdout.write(`\r${size}: ${done}/${total}  ${(done / el).toFixed(1)} fps  eta ${((total - done) / (done / el)).toFixed(0)}s   `);
        }
      }
      await page.close();
    };
    await Promise.all(Array.from({ length: WORKERS }, (_, w) => work(w)));
    process.stdout.write("\n");
  }
  await browser.close();
  srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
