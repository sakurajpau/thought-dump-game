// ホーム画面に置いたときのための最小限のサービスワーカー。
// 画面の部品だけを保存し、相談の内容（Supabase とのやり取り）は一切保存しない。
const CACHE = "kizuki-note-v1";
const SHELL = ["./", "./index.html", "./style.css", "./app.js", "./config.js", "./manifest.webmanifest", "./icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// 同じサイトの画面部品だけ、ネット優先・つながらないときは保存分を使う
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
