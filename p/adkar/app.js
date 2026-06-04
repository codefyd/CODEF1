/* =========================================================
   أذكار CODEF — منطق مشترك
   ========================================================= */
(function () {
  "use strict";

  const LS = {
    theme: "adk_theme",
    size: "adk_size",
    notif: "adk_notif",      // {morning:{on,time}, evening:{on,time}}
    prog: (id) => "adk_prog_" + id,
    progDay: (id) => "adk_progday_" + id
  };

  const THEMES = ["sand", "olive", "sky", "rose"];

  /* ---------- الثيم والحجم ---------- */
  function applyTheme(t) {
    if (!THEMES.includes(t)) t = "sand";
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem(LS.theme, t);
    const meta = document.querySelector('meta[name="theme-color"]');
    const colors = { sand:"#f4ecd8", olive:"#f0f2e4", sky:"#eaf1f5", rose:"#f8ecea" };
    if (meta) meta.content = colors[t];
  }
  function applySize(s) {
    if (!["s","m","l"].includes(s)) s = "m";
    document.documentElement.setAttribute("data-size", s);
    localStorage.setItem(LS.size, s);
  }
  applyTheme(localStorage.getItem(LS.theme) || "sand");
  applySize(localStorage.getItem(LS.size) || "m");

  /* ---------- أدوات ---------- */
  function todayKey() {
    const d = new Date();
    return d.getFullYear() + "-" + (d.getMonth()+1) + "-" + d.getDate();
  }
  function svg(name, cls) {
    const P = {
      back:'<path d="M9 6l6 6-6 6"/>',
      gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>',
      sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
      moon:'<path d="M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z"/>',
      go:'<path d="M15 6l-6 6 6 6"/>',
      check:'<path d="M20 6L9 17l-5-5"/>',
      rotate:'<path d="M3 12a9 9 0 109-9 9 9 0 00-6.3 2.6L3 8"/><path d="M3 3v5h5"/>',
      star:'<path d="M12 2l2.4 7.4H22l-6 4.4 2.3 7.2L12 16.6 5.7 21l2.3-7.2-6-4.4h7.6z"/>',
      bell:'<path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/>',
      type:'<path d="M4 7V5h16v2M9 19h6M12 5v14"/>',
      palette:'<circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/><path d="M12 2a10 10 0 000 20c1 0 1.5-1 1.5-2a1.5 1.5 0 011.5-1.5H17a5 5 0 005-5c0-6-4.5-11.5-10-11.5z"/>',
      app:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'
    };
    return '<svg class="'+(cls||"")+'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+(P[name]||"")+'</svg>';
  }

  /* ---------- لوحة الإعدادات ---------- */
  function buildSettingsSheet() {
    if (document.getElementById("adkSheet")) return;
    const notif = getNotif();

    const backdrop = document.createElement("div");
    backdrop.className = "sheet-backdrop";
    backdrop.id = "adkBackdrop";

    const sheet = document.createElement("div");
    sheet.className = "sheet";
    sheet.id = "adkSheet";
    sheet.innerHTML = `
      <div class="sheet-grab"></div>
      <h2>الإعدادات</h2>
      <p class="sub">خصّص المظهر والتنبيهات حسب ذوقك</p>

      <div class="set-group">
        <div class="set-label">${svg("palette")} لون السمة</div>
        <div class="theme-grid" id="themeGrid">
          ${themeChip("sand","رملي", ["#9c6b3f","#c69a5e","#f4ecd8"])}
          ${themeChip("olive","زيتوني", ["#5a7d3c","#8fae5e","#f0f2e4"])}
          ${themeChip("sky","سماوي", ["#3c7196","#6fa3c4","#eaf1f5"])}
          ${themeChip("rose","وردي", ["#bd6b66","#e0a097","#f8ecea"])}
        </div>
      </div>

      <div class="set-group">
        <div class="set-label">${svg("type")} حجم الخط</div>
        <div class="seg" id="sizeSeg">
          <button data-size="s">صغير</button>
          <button data-size="m">متوسط</button>
          <button data-size="l">كبير</button>
        </div>
      </div>

      <div class="set-group">
        <div class="set-label">${svg("bell")} التنبيهات اليومية</div>
        <div class="notif-row">
          <div>
            <label>تذكير أذكار الصباح</label>
            <div class="desc">تنبيه يومي في الوقت المحدد</div>
          </div>
          <input class="time-input" type="time" id="timeMorning" value="${notif.morning.time}">
          <label class="switch"><input type="checkbox" id="onMorning" ${notif.morning.on?"checked":""}><span class="track"></span></label>
        </div>
        <div class="notif-row">
          <div>
            <label>تذكير أذكار المساء</label>
            <div class="desc">تنبيه يومي في الوقت المحدد</div>
          </div>
          <input class="time-input" type="time" id="timeEvening" value="${notif.evening.time}">
          <label class="switch"><input type="checkbox" id="onEvening" ${notif.evening.on?"checked":""}><span class="track"></span></label>
        </div>
        <p class="notif-hint" id="notifHint">للتنبيهات الثابتة كل يوم: أضف الصفحة إلى الشاشة الرئيسية، وافتحها مرة بعد ضبط الوقت لتفعيل التذكير. سيظهر التنبيه عند فتح التطبيق إن حان وقته.</p>
      </div>

      <button class="btn-wide" id="addHomeBtn">${"كيف أضيف الصفحة للشاشة الرئيسية؟"}</button>
    `;

    document.body.appendChild(backdrop);
    document.body.appendChild(sheet);

    // ربط الأحداث
    backdrop.addEventListener("click", closeSettings);
    sheet.querySelectorAll(".theme-chip").forEach(chip=>{
      chip.addEventListener("click", ()=>{ applyTheme(chip.dataset.t); markActiveTheme(); });
    });
    sheet.querySelectorAll("#sizeSeg button").forEach(b=>{
      b.addEventListener("click", ()=>{ applySize(b.dataset.size); markActiveSize(); });
    });
    async function saveNotif(){
      const settings = {
        morning:{ on:document.getElementById("onMorning").checked, time:document.getElementById("timeMorning").value || "06:00" },
        evening:{ on:document.getElementById("onEvening").checked, time:document.getElementById("timeEvening").value || "17:30" }
      };

      setNotif(settings);

      if (settings.morning.on || settings.evening.on){
        const granted = await requestNotifPermission();
        if (granted) checkDueNotifications();
      }
    }
    ["onMorning","onEvening","timeMorning","timeEvening"].forEach(id=>{
      document.getElementById(id).addEventListener("change", saveNotif);
    });
    document.getElementById("addHomeBtn").addEventListener("click", showInstallGuide);

    markActiveTheme(); markActiveSize();
  }

  function themeChip(t, label, dots){
    return `<div class="theme-chip" data-t="${t}">
      <div class="theme-dots">${dots.map(c=>`<i style="background:${c}"></i>`).join("")}</div>
      ${label}
    </div>`;
  }
  function markActiveTheme(){
    const cur = document.documentElement.getAttribute("data-theme");
    document.querySelectorAll(".theme-chip").forEach(c=>c.classList.toggle("active", c.dataset.t===cur));
  }
  function markActiveSize(){
    const cur = document.documentElement.getAttribute("data-size");
    document.querySelectorAll("#sizeSeg button").forEach(b=>b.classList.toggle("active", b.dataset.size===cur));
  }

  function openSettings(){ buildSettingsSheet(); document.getElementById("adkBackdrop").classList.add("show"); document.getElementById("adkSheet").classList.add("show"); }
  function closeSettings(){ const b=document.getElementById("adkBackdrop"), s=document.getElementById("adkSheet"); if(b)b.classList.remove("show"); if(s)s.classList.remove("show"); }

  /* ---------- التنبيهات ---------- */
  function getNotif(){
    try { return JSON.parse(localStorage.getItem(LS.notif)) || defNotif(); }
    catch(e){ return defNotif(); }
  }
  function defNotif(){ return { morning:{on:false,time:"06:00"}, evening:{on:false,time:"17:30"} }; }
  function setNotif(n){ localStorage.setItem(LS.notif, JSON.stringify(n)); }

  async function requestNotifPermission(){
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;

    try {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    } catch(e){
      return false;
    }
  }

  async function showAppNotification(title, body, tag){
    const options = {
      body,
      tag,
      icon: window.ADK_LOGO || undefined
    };

    try {
      if ("serviceWorker" in navigator){
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, options);
        return true;
      }

      new Notification(title, options);
      return true;
    } catch(e){
      return false;
    }
  }

  // فحص عند فتح التطبيق: إن حان وقت التذكير ولم يُرسل اليوم، أرسل تنبيهاً
  async function checkDueNotifications(){
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const n = getNotif();
    const now = new Date();
    const cur = now.getHours()*60 + now.getMinutes();
    const day = todayKey();

    for (const [k,title,body] of [
      ["morning","أذكار الصباح","حان وقت أذكار الصباح 🌅"],
      ["evening","أذكار المساء","حان وقت أذكار المساء 🌙"]
    ]){
      const c = n[k];
      if (!c.on) continue;

      const [h,m] = c.time.split(":").map(Number);
      const target = h*60 + m;
      const sentKey = "adk_notif_sent_"+k+"_"+day;

      if (cur >= target && cur < target+120 && !localStorage.getItem(sentKey)){
        const sent = await showAppNotification(title, body, "adk-"+k);
        if (sent) localStorage.setItem(sentKey, "1");
      }
    }
  }

  function showInstallGuide(){
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    let msg;
    if (isIOS){
      msg = "على الآيفون:\n\n1) افتح الصفحة في متصفح Safari\n2) اضغط زر المشاركة (مربع وسهم لأعلى)\n3) اختر «إضافة إلى الشاشة الرئيسية»\n\nبعدها افتح التطبيق من الأيقونة، وستصلك التنبيهات عند حلول وقتها.";
    } else {
      msg = "على الأندرويد:\n\n1) افتح الصفحة في متصفح Chrome\n2) اضغط القائمة (⋮) أعلى اليمين\n3) اختر «إضافة إلى الشاشة الرئيسية» أو «تثبيت التطبيق»\n\nبعدها افتح التطبيق من الأيقونة، وستصلك التنبيهات عند حلول وقتها.";
    }
    alert(msg);
  }

  /* ---------- حقن الترويسة ---------- */
  function injectHeader(opts){
    // opts: { title, back }
    const top = document.createElement("div");
    top.className = "top";
    top.innerHTML = `<div class="top-inner">
      <button class="icon-btn" id="openSettingsBtn" aria-label="الإعدادات">${svg("gear")}</button>
      <div class="top-spacer"></div>
      <div class="top-title">${opts.title}</div>
      ${opts.back ? `<a href="${opts.back}" class="back-btn" aria-label="رجوع">${svg("back")}</a>` : `<span style="width:42px"></span>`}
    </div>`;
    document.body.prepend(top);
    document.getElementById("openSettingsBtn").addEventListener("click", openSettings);
  }

  /* ---------- محرّك صفحة الأذكار ---------- */
  function renderAdhkarPage(group){
    const wrap = document.getElementById("adkWrap");
    if (!wrap || !group) return;

    const day = todayKey();
    // إعادة تعيين التقدم لو تغيّر اليوم
    if (localStorage.getItem(LS.progDay(group.id)) !== day){
      localStorage.removeItem(LS.prog(group.id));
      localStorage.setItem(LS.progDay(group.id), day);
    }
    let prog = {};
    try { prog = JSON.parse(localStorage.getItem(LS.prog(group.id))) || {}; } catch(e){ prog = {}; }

    function save(){ localStorage.setItem(LS.prog(group.id), JSON.stringify(prog)); }

    // شريط التقدم
    const pb = document.createElement("div");
    pb.className = "progress-bar";
    pb.innerHTML = `<div class="pb-inner">
      <div class="pb-meta"><span id="pbText">٠ من ${toAr(group.items.length)}</span><span id="pbPct">٠٪</span></div>
      <div class="pb-track"><div class="pb-fill" id="pbFill"></div></div>
    </div>`;
    wrap.parentNode.insertBefore(pb, wrap);

    // البطاقات
    group.items.forEach((item, i) => {
      const card = document.createElement("div");
      card.className = "dhikr";
      const cur = prog[i] || 0;
      const isDone = cur >= item.count;

      const lines = item.text.split("\n\n").map(l=>`<span class="ayah">${l.replace(/\n/g,"<br>")}</span>`).join("");

      let actionHTML;
      if (item.count > 1){
        actionHTML = `<div class="counter-row">
          <button class="count-btn ${isDone?"done":""}" data-i="${i}">
            ${isDone ? svg("check")+" تم بحمد الله" : "سبّح · اضغط للعد"}
          </button>
          <div class="count-pill"><span data-pill="${i}">${toAr(Math.min(cur,item.count))}</span><small>من ${toAr(item.count)}</small></div>
          <button class="reset-one" data-reset="${i}" aria-label="إعادة">${svg("rotate")}</button>
        </div>`;
      } else {
        actionHTML = `<div class="simple-done">
          <button class="count-btn ${isDone?"done":""}" data-i="${i}" style="flex:none;min-width:160px">
            ${isDone ? svg("check")+" تم بحمد الله" : "اضغط عند الانتهاء"}
          </button>
        </div>`;
      }

      card.innerHTML = `<div class="dhikr-card ${isDone?"done":""}" id="card-${i}">
        <div class="dhikr-head">
          <span class="dhikr-num">${toAr(i+1)}</span>
          ${item.note ? `<span class="dhikr-note">${item.note}</span>` : ""}
          ${item.count>1 ? `<span class="dhikr-note" style="margin-inline-start:auto;color:var(--ink-soft)">×${toAr(item.count)}</span>`:""}
        </div>
        <div class="dhikr-text">${lines}</div>
        ${actionHTML}
      </div>`;
      wrap.appendChild(card);
    });

    // شاشة الإكمال
    const finish = document.createElement("div");
    finish.className = "finish";
    finish.id = "finishBox";
    finish.innerHTML = `${svg("star")}<h3>تقبّل الله منك</h3><p>أتممت ${group.title} لهذا اليوم 🤲</p>
      <button class="btn-wide" id="resetAll" style="max-width:240px;margin:16px auto 0">إعادة من جديد</button>`;
    wrap.appendChild(finish);

    // الأحداث
    function tap(i){
      const item = group.items[i];
      let cur = prog[i] || 0;
      if (cur >= item.count){ // إعادة عند الضغط بعد الإتمام (للعدّاد المفرد فقط)
        if (item.count === 1){ cur = 0; }
        else return;
      } else {
        cur++;
      }
      prog[i] = cur;
      save();
      refreshCard(i);
      updateProgress();
    }
    function refreshCard(i){
      const item = group.items[i];
      const cur = prog[i] || 0;
      const done = cur >= item.count;
      const card = document.getElementById("card-"+i);
      const btn = card.querySelector(".count-btn");
      const pill = card.querySelector('[data-pill="'+i+'"]');
      card.classList.toggle("done", done);
      btn.classList.toggle("done", done);
      if (item.count > 1){
        btn.innerHTML = done ? svg("check")+" تم بحمد الله" : "سبّح · اضغط للعد";
        if (pill) pill.textContent = toAr(Math.min(cur,item.count));
      } else {
        btn.innerHTML = done ? svg("check")+" تم بحمد الله" : "اضغط عند الانتهاء";
      }
      if (done && navigator.vibrate) navigator.vibrate(18);
    }
    function updateProgress(){
      let doneCount = 0;
      group.items.forEach((item,i)=>{ if((prog[i]||0) >= item.count) doneCount++; });
      const total = group.items.length;
      const pct = Math.round(doneCount/total*100);
      document.getElementById("pbFill").style.width = pct+"%";
      document.getElementById("pbText").textContent = toAr(doneCount)+" من "+toAr(total);
      document.getElementById("pbPct").textContent = toAr(pct)+"٪";
      document.getElementById("finishBox").classList.toggle("show", doneCount===total);
      if (doneCount===total && navigator.vibrate) navigator.vibrate([20,40,20]);
    }

    wrap.addEventListener("click", (e)=>{
      const btn = e.target.closest("[data-i]");
      if (btn){ tap(parseInt(btn.dataset.i,10)); return; }
      const rst = e.target.closest("[data-reset]");
      if (rst){ const i=parseInt(rst.dataset.reset,10); prog[i]=0; save(); refreshCard(i); updateProgress(); }
    });
    document.getElementById("resetAll").addEventListener("click", ()=>{
      prog = {}; save();
      group.items.forEach((_,i)=>refreshCard(i));
      updateProgress();
      window.scrollTo({top:0, behavior:"smooth"});
    });

    updateProgress();
    checkDueNotifications();
  }

  // أرقام عربية
  function toAr(n){
    return String(n).replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
  }

  /* ---------- زر التثبيت الذكي (يظهر مرة) ---------- */
  function maybeShowInstallTip(){
    const dismissed = localStorage.getItem("adk_install_dismissed");
    const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
    if (dismissed || standalone) return;
    const tip = document.createElement("div");
    tip.className = "install-tip";
    tip.innerHTML = `<span class="it-ic">${svg("app")}</span>
      <div class="it-txt"><b>أضف الأذكار لشاشتك الرئيسية</b><br>لتصلك التنبيهات وتفتحها بضغطة كالتطبيق.</div>
      <button id="tipHow">الطريقة</button>
      <button class="it-close" id="tipClose">✕</button>`;
    document.body.appendChild(tip);
    setTimeout(()=>tip.classList.add("show"), 1400);
    document.getElementById("tipHow").addEventListener("click", showInstallGuide);
    document.getElementById("tipClose").addEventListener("click", ()=>{
      tip.classList.remove("show");
      localStorage.setItem("adk_install_dismissed","1");
    });
  }

  // إعادة الفحص عند عودة المستخدم للتطبيق أو النافذة
  document.addEventListener("visibilitychange", ()=>{
    if (document.visibilityState === "visible") checkDueNotifications();
  });
  window.addEventListener("focus", checkDueNotifications);

  /* ---------- التصدير ---------- */
  window.ADK = {
    svg, injectHeader, openSettings, renderAdhkarPage,
    maybeShowInstallTip, checkDueNotifications, toAr
  };

})();
