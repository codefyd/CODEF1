/* Service Worker — أذكار CODEF */
const CACHE = "adkar-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./morning.html",
  "./evening.html",
  "./style.css",
  "./app.js",
  "./data.js",
  "./manifest.json"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  e.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});

self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "أذكار", body: event.data ? event.data.text() : "حان وقت الذكر" };
  }

  const title = data.title || "أذكار";
  const options = {
    body: data.body || "حان وقت الذكر",
    icon: data.icon || "https://i.ibb.co/20J7vkNM/image.png",
    badge: data.badge || "https://i.ibb.co/20J7vkNM/image.png",
    tag: data.tag || "adkar-reminder",
    renotify: true,
    data: {
      url: data.url || "./"
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification?.data?.url || "./";
  const urlToOpen = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === urlToOpen && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })
  );
});
