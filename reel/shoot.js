// لقطات الموقع بعرض 1440 و390 ← reel/preview/site-<w>.png
const { chromium } = require("playwright");
const { serve } = require("./serve");
const path = require("path");
(async () => {
  const { srv, url } = await serve();
  const br = await chromium.launch();
  for (const [w, h, mobile] of [[1440, 900, false], [390, 844, true]]) {
    const ctx = await br.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
    const p = await ctx.newPage();
    await p.route("**/analytics.js", (r) => r.abort());   // لا نسجّل زيارات وهمية
    const errs = [];
    p.on("pageerror", (e) => errs.push(e.message));
    p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
    await p.goto(url + "/index.html", { waitUntil: "load" });
    await p.waitForTimeout(3500);
    const info = await p.evaluate(() => {
      const v = document.getElementById("reelVideo");
      return { src: v.currentSrc.split("/").pop(), paused: v.paused, t: +v.currentTime.toFixed(2), fonts: [...document.fonts].filter(f => f.status === "loaded").map(f => f.family + " " + f.weight).join(", "),
        overflowX: document.documentElement.scrollWidth > innerWidth, gfonts: !!document.querySelector('link[href*="fonts.googleapis"]') };
    });
    console.log(w, JSON.stringify(info), errs.length ? "ERRORS: " + errs.join(" | ") : "no errors");
    await p.screenshot({ path: path.join(__dirname, "preview", `site-${w}.png`) });
    for (let y = 0; y < await p.evaluate(() => document.body.scrollHeight); y += h * 0.6) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(250); }
    await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(400);
    await p.screenshot({ path: path.join(__dirname, "preview", `site-${w}-full.png`), fullPage: true });
    await ctx.close();
  }
  await br.close(); srv.close();
})();
