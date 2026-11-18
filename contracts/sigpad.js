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
})();
