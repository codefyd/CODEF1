// خادم ملفات ثابت صغير لجذر المستودع (الخطوط لا تُحمَّل بثقة عبر file://)
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".woff2": "font/woff2", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".mp4": "video/mp4", ".webm": "video/webm", ".svg": "image/svg+xml" };

function serve(port = 0) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const u = decodeURIComponent(new URL(req.url, "http://x").pathname);
      let f = path.join(ROOT, u);
      if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
      if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
      if (!fs.existsSync(f)) { res.writeHead(404); return res.end("404"); }
      const stat = fs.statSync(f), type = TYPES[path.extname(f)] || "application/octet-stream";
      const range = req.headers.range;
      if (range) {
        const [a, z] = range.replace("bytes=", "").split("-");
        const start = +a, end = z ? +z : stat.size - 1;
        res.writeHead(206, { "Content-Type": type, "Content-Range": `bytes ${start}-${end}/${stat.size}`, "Accept-Ranges": "bytes", "Content-Length": end - start + 1 });
        return fs.createReadStream(f, { start, end }).pipe(res);
      }
      res.writeHead(200, { "Content-Type": type, "Content-Length": stat.size, "Accept-Ranges": "bytes" });
      fs.createReadStream(f).pipe(res);
    });
    srv.listen(port, "127.0.0.1", () => resolve({ srv, url: `http://127.0.0.1:${srv.address().port}` }));
  });
}

module.exports = { serve, ROOT };
if (require.main === module) serve(+process.argv[2] || 8080).then(({ url }) => console.log("serving", url));
