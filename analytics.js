(() => {
  "use strict";

  const SUPABASE_URL = "https://yqkkjjfeupfmywadqlwd.supabase.co";
  const SUPABASE_KEY = "sb_publishable_EtaamtevjICX2rqCN_JoPw__fgGG3w4";
  const path = location.pathname || "/";

  if (path.startsWith("/stats")) return;

  const property = path.startsWith("/p/adkar/") ? "adkar" : "codef";
  const allowedEvents = new Set(["page_view", "tasbeeh_open", "tasbeeh_count"]);

  function track(eventName) {
    if (!allowedEvents.has(eventName)) return;

    fetch(SUPABASE_URL + "/rest/v1/rpc/codef_analytics_track", {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: "Bearer " + SUPABASE_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        p_property_key: property,
        p_event_name: eventName,
        p_page_path: path.slice(0, 512)
      }),
      keepalive: true,
      credentials: "omit"
    }).catch(() => {});
  }

  track("page_view");

  if (property === "adkar" && /\/tasbeeh\.html$/.test(path)) {
    track("tasbeeh_open");
    document.addEventListener("click", (event) => {
      if (event.target.closest("#tapArea")) track("tasbeeh_count");
    }, { passive: true });
  }

  window.CODEF_ANALYTICS = Object.freeze({ track });
})();
