/* لوحة توقيع بالإصبع أو الماوس — بدون مكتبات. تستخدمها صفحة العميل والإعدادات.
   const pad = SigPad(document.querySelector('.pad canvas'), { onChange(empty) {} });
   pad.isEmpty() · pad.clear() · pad.toDataURL()  (PNG شفاف مقصوص على حدود التوقيع) */
(function () {
  window.SigPad = function (canvas, opts) {
    opts = opts || {};
    var ctx = canvas.getContext('2d');
    var strokes = [], cur = null, ratio = 1;

    function size() {
      ratio = Math.max(window.devicePixelRatio || 1, 1);
      var r = canvas.getBoundingClientRect();
      canvas.width = Math.round(r.width * ratio);
      canvas.height = Math.round(r.height * ratio);
      redraw();
    }
    function pos(e) {
      var r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) * ratio, y: (e.clientY - r.top) * ratio };
    }
    function drawStroke(s) {
      ctx.lineWidth = 2.6 * ratio; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#14204f';
      ctx.beginPath();
      if (s.length === 1) { ctx.arc(s[0].x, s[0].y, 1.4 * ratio, 0, Math.PI * 2); ctx.fillStyle = '#14204f'; ctx.fill(); return; }
      ctx.moveTo(s[0].x, s[0].y);
      for (var i = 1; i < s.length - 1; i++) {
        var mx = (s[i].x + s[i + 1].x) / 2, my = (s[i].y + s[i + 1].y) / 2;
        ctx.quadraticCurveTo(s[i].x, s[i].y, mx, my);
      }
      ctx.lineTo(s[s.length - 1].x, s[s.length - 1].y);
      ctx.stroke();
    }
    function redraw() { ctx.clearRect(0, 0, canvas.width, canvas.height); strokes.forEach(drawStroke); }
    function changed() { if (opts.onChange) opts.onChange(strokes.length === 0); }

    canvas.addEventListener('pointerdown', function (e) {
      e.preventDefault(); canvas.setPointerCapture(e.pointerId);
      cur = [pos(e)]; strokes.push(cur); redraw(); changed();
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!cur) return; e.preventDefault();
      cur.push(pos(e)); redraw();
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (t) {
      canvas.addEventListener(t, function () { cur = null; });
    });
    window.addEventListener('resize', function () {
      // نعيد الرسم بنفس النسبة لو تغيّر عرض الشاشة (تدوير الجوال)
      var old = canvas.width; size();
      if (old && canvas.width !== old) { var k = canvas.width / old; strokes = strokes.map(function (s) { return s.map(function (p) { return { x: p.x * k, y: p.y * k }; }); }); redraw(); }
    });
    size();

    return {
      isEmpty: function () {
        // نقطة أو خط صغير جداً ما يعتبر توقيع
        var n = 0; strokes.forEach(function (s) { n += s.length; }); return n < 12;
      },
      clear: function () { strokes = []; redraw(); changed(); },
      toDataURL: function () {
        var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        strokes.forEach(function (s) { s.forEach(function (p) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); }); });
        var pad = 8 * ratio;
        minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
        maxX = Math.min(canvas.width, maxX + pad); maxY = Math.min(canvas.height, maxY + pad);
        var w = Math.max(1, maxX - minX), h = Math.max(1, maxY - minY);
        // نصغّرها لارتفاع ٢٠٠ بكسل بالكثير: تكفي للطباعة وما تكبّر الملف
        var k = Math.min(1, 200 / h), out = document.createElement('canvas');
        out.width = Math.round(w * k); out.height = Math.round(h * k);
        out.getContext('2d').drawImage(canvas, minX, minY, w, h, 0, 0, out.width, out.height);
        return out.toDataURL('image/png');
      }
    };
  };

  /* نافذة توقيع تطلع لما ينضغط مكان التوقيع في العقد. فيها مسح وإلغاء واعتماد.
     SigPad.open({ title, note, extra }) → Promise: { image, extra } أو null لو ألغى.
     extra (اختياري) = نص مربع اختيار تحت اللوحة، مثل «احفظه لعقودي الجاية» */
  var css = '.sgm{position:fixed;inset:0;z-index:100;background:rgba(10,10,13,.72);display:flex;align-items:flex-end;justify-content:center;font-family:"Fatimah","Segoe UI",Tahoma,sans-serif;direction:rtl}' +
    '@media(min-width:640px){.sgm{align-items:center}}' +
    '.sgm-box{background:#fff;color:#1b1a17;width:100%;max-width:560px;border-radius:20px 20px 0 0;padding:18px 16px calc(16px + env(safe-area-inset-bottom));box-shadow:0 -10px 40px rgba(0,0,0,.3)}' +
    '@media(min-width:640px){.sgm-box{border-radius:20px}}' +
    '.sgm h3{margin:0 0 2px;font-size:19px;color:#0A0A0D}.sgm p{margin:0 0 12px;color:#6b6352;font-size:14px}' +
    '.sgm-pad{position:relative;background:#fffdf8;border:2px dashed #C9A96E;border-radius:14px;touch-action:none}' +
    '.sgm-pad canvas{display:block;width:100%;height:220px;touch-action:none;cursor:crosshair}' +
    '.sgm-pad .ln{position:absolute;inset-inline:22px;bottom:48px;border-bottom:1px solid #eadfc6;pointer-events:none}' +
    '.sgm-pad .ht{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#c2b597;pointer-events:none;font-size:17px}' +
    '.sgm-x{display:flex;gap:8px;align-items:center;margin:10px 0 0;font-size:14.5px;cursor:pointer}.sgm-x input{width:20px;height:20px;accent-color:#A88A52}' +
    '.sgm-b{display:flex;gap:8px;margin-top:14px}.sgm-b button{flex:1;font:inherit;font-size:16px;min-height:50px;border-radius:12px;cursor:pointer;border:1.5px solid #e4d8be;background:#fff;color:#1b1a17}' +
    '.sgm-b .ok{flex:2;border:0;font-weight:700;background:linear-gradient(135deg,#E8D5AA,#C9A96E 55%,#A88A52);color:#17130b}.sgm-b .ok[disabled]{opacity:.45;cursor:not-allowed}';

  window.SigPad.open = function (o) {
    o = o || {};
    if (!document.getElementById('sgm-css')) { var st = document.createElement('style'); st.id = 'sgm-css'; st.textContent = css; document.head.appendChild(st); }
    return new Promise(function (resolve) {
      var m = document.createElement('div');
      m.className = 'sgm';
      m.innerHTML = '<div class="sgm-box" role="dialog" aria-modal="true"><h3></h3><p></p>' +
        '<div class="sgm-pad"><canvas></canvas><div class="ln"></div><div class="ht">وقّع هنا بإصبعك</div></div>' +
        (o.extra ? '<label class="sgm-x"><input type="checkbox" checked><span></span></label>' : '') +
        '<div class="sgm-b"><button type="button" class="ok" disabled>اعتماد التوقيع</button><button type="button" class="cl">مسح</button><button type="button" class="no">إلغاء</button></div></div>';
      m.querySelector('h3').textContent = o.title || 'توقيعك';
      m.querySelector('p').textContent = o.note || 'وقّع داخل المربع. أخطأت؟ اضغط «مسح» ووقّع من جديد.';
      if (o.extra) m.querySelector('.sgm-x span').textContent = o.extra;
      document.body.appendChild(m);
      var prevOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
      var ok = m.querySelector('.ok'), ht = m.querySelector('.ht'), cv = m.querySelector('canvas');
      var pad = window.SigPad(cv, { onChange: function (empty) { ht.style.display = empty ? '' : 'none'; ok.disabled = pad.isEmpty(); } });
      cv.addEventListener('pointerup', function () { ok.disabled = pad.isEmpty(); });
      function close(v) { document.body.style.overflow = prevOverflow; m.remove(); resolve(v); }
      m.querySelector('.cl').onclick = function () { pad.clear(); ok.disabled = true; };
      m.querySelector('.no').onclick = function () { close(null); };
      m.addEventListener('click', function (e) { if (e.target === m) close(null); });
      ok.onclick = function () { if (pad.isEmpty()) return; var x = m.querySelector('.sgm-x input'); close({ image: pad.toDataURL(), extra: x ? x.checked : false }); };
    });
  };
})();
