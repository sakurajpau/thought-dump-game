// 気づきノート
// クライアントが気づきを書き、麻美さん（カウンセラー）があとでまとめて返信する。
// 相談内容は必ず textContent で表示し、HTML として解釈させない。
(() => {
  const cfg = window.APP_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const VIEWS = ["setup", "login", "name", "journal", "clients", "thread", "settings"];

  let sb = null;
  let me = null; // { id, role, display_name }
  let names = {}; // profile id -> 表示名
  let current = null; // 表示中の画面
  let homeView = null; // journal か clients
  let threadClientId = null;

  const counselorName = cfg.COUNSELOR_NAME || "カウンセラー";
  const appName = cfg.APP_NAME || "気づきノート";

  // ---------- 画面の切り替え ----------

  function show(view, title) {
    current = view;
    for (const v of VIEWS) $("view-" + v).hidden = v !== view;
    $("title").textContent = title || appName;
    $("back").hidden = !(view === "thread" || view === "settings");
    $("menu-btn").hidden = !(view === "journal" || view === "clients");
    window.scrollTo(0, 0);
  }

  function busy(form, on) {
    for (const el of form.querySelectorAll("button, input, textarea")) el.disabled = on;
  }

  function setError(id, err) {
    $(id).textContent = err ? friendly(err) : "";
  }

  function friendly(err) {
    const msg = (err && err.message) || String(err);
    if (/Invalid login credentials/i.test(msg)) return "メールアドレスかパスワードが違います。";
    if (/Failed to fetch|NetworkError|network/i.test(msg)) return "通信できませんでした。電波の良いところでもう一度お試しください。";
    if (/Password should be/i.test(msg)) return "パスワードは8文字以上にしてください。";
    if (/same.*password|different from the old/i.test(msg)) return "今と同じパスワードは使えません。";
    return "うまくいきませんでした（" + msg + "）";
  }

  // ---------- 日付と一覧の表示 ----------

  const dayFmt = new Intl.DateTimeFormat("ja-JP", { month: "long", day: "numeric", weekday: "short" });
  const timeFmt = new Intl.DateTimeFormat("ja-JP", { hour: "2-digit", minute: "2-digit" });
  const shortFmt = new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric" });

  function dayKey(d) {
    return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate();
  }

  // 最後の返信より後のクライアントの書き込み（＝まだ返信していないもの）
  function unansweredIds(messages, clientId) {
    const ids = [];
    for (const m of messages) {
      if (m.author_id === clientId) ids.push(m.id);
      else ids.length = 0;
    }
    return ids;
  }

  function renderTimeline(listEl, messages, { viewerId, highlight = [] }) {
    listEl.replaceChildren();
    let lastDay = null;
    for (const m of messages) {
      const d = new Date(m.created_at);
      if (dayKey(d) !== lastDay) {
        lastDay = dayKey(d);
        const day = document.createElement("li");
        day.className = "day";
        day.textContent = dayFmt.format(d);
        listEl.append(day);
      }
      const isReply = me.role === "client" ? m.author_id !== viewerId : m.author_id === viewerId;
      const li = document.createElement("li");
      li.className = "entry" + (isReply ? " reply" : "") + (highlight.includes(m.id) ? " new" : "");

      const meta = document.createElement("div");
      meta.className = "entry-meta";
      const who = document.createElement("strong");
      who.textContent = m.author_id === viewerId ? "あなた" : names[m.author_id] || counselorName;
      const time = document.createElement("span");
      time.textContent = timeFmt.format(d);
      meta.append(who, time);

      const body = document.createElement("p");
      body.className = "entry-body";
      body.textContent = m.body;

      li.append(meta, body);
      listEl.append(li);
    }
    if (!messages.length) {
      const empty = document.createElement("li");
      empty.className = "hint center";
      empty.textContent = me.role === "client" ? "まだ何も書かれていません。最初の気づきを書いてみましょう。" : "まだ書き込みはありません。";
      listEl.append(empty);
    }
  }

  function scrollToBottom() {
    window.scrollTo(0, document.body.scrollHeight);
  }

  // ---------- 起動とログイン ----------

  async function init() {
    document.title = appName;
    $("crisis-note").textContent = cfg.CRISIS_NOTE || "";
    $("crisis-note").hidden = !cfg.CRISIS_NOTE;
    $("name-label").textContent = counselorName + "に表示されるお名前";

    const configured = cfg.SUPABASE_URL && !/YOUR-PROJECT/.test(cfg.SUPABASE_URL) && cfg.SUPABASE_ANON_KEY && !/YOUR-ANON-KEY/.test(cfg.SUPABASE_ANON_KEY);
    if (!configured || !window.supabase) {
      show("setup");
      return;
    }

    sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    sb.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        me = null;
        sb.removeAllChannels();
        show("login");
      }
    });

    const { data } = await sb.auth.getSession();
    if (data.session) await enter(data.session.user);
    else show("login");
  }

  async function enter(user) {
    const { data: profile, error } = await sb.from("profiles").select("id, role, display_name").eq("id", user.id).single();
    if (error || !profile) {
      show("login");
      setError("login-error", error || "プロフィールが見つかりません。");
      return;
    }
    me = profile;
    homeView = me.role === "counselor" ? "clients" : "journal";

    if (!me.display_name) {
      show("name");
      return;
    }
    subscribe();
    await goHome();
  }

  async function goHome() {
    if (homeView === "clients") await openClients();
    else await openJournal();
  }

  $("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    setError("login-error");
    busy(form, true);
    const { data, error } = await sb.auth.signInWithPassword({
      email: $("login-email").value.trim(),
      password: $("login-password").value,
    });
    busy(form, false);
    if (error) return setError("login-error", error);
    $("login-password").value = "";
    await enter(data.user);
  });

  $("name-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const name = $("name-input").value.trim();
    if (!name) return;
    busy(form, true);
    const { error } = await sb.from("profiles").update({ display_name: name }).eq("id", me.id);
    busy(form, false);
    if (error) return setError("name-error", error);
    me.display_name = name;
    subscribe();
    await goHome();
  });

  // ---------- 新しい書き込みをすぐ反映する ----------

  function subscribe() {
    sb.removeAllChannels();
    sb.channel("messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => refresh())
      .subscribe();
  }

  async function refresh() {
    if (current === "journal") await loadJournal(false);
    else if (current === "clients") await openClients();
    else if (current === "thread") await loadThread(false);
  }

  // スマホでアプリに戻ってきたときは、念のため読み込み直す
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && me) refresh();
  });

  // ---------- クライアント：ノート ----------

  async function openJournal() {
    show("journal");
    await loadJournal(true);
  }

  async function loadJournal(jump) {
    const [{ data: counselors }, { data: messages, error }] = await Promise.all([
      sb.from("profiles").select("id, display_name").eq("role", "counselor"),
      sb.from("messages").select("id, author_id, body, created_at").eq("client_id", me.id).order("created_at"),
    ]);
    if (error) return setError("journal-error", error);
    for (const c of counselors || []) names[c.id] = c.display_name || counselorName;
    renderTimeline($("journal-list"), messages, { viewerId: me.id });
    if (jump) scrollToBottom();
  }

  $("journal-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const body = $("journal-input").value.trim();
    if (!body) return;
    setError("journal-error");
    busy(form, true);
    const { error } = await sb.from("messages").insert({ client_id: me.id, author_id: me.id, body });
    busy(form, false);
    if (error) return setError("journal-error", error);
    $("journal-input").value = "";
    await loadJournal(true);
  });

  // ---------- 麻美さん：クライアント一覧 ----------

  async function openClients() {
    const [{ data: profiles, error: pErr }, { data: messages, error: mErr }] = await Promise.all([
      sb.from("profiles").select("id, role, display_name, created_at"),
      sb.from("messages").select("id, client_id, author_id, body, created_at").order("created_at"),
    ]);
    if (current !== "clients") show("clients");
    const list = $("client-list");
    if (pErr || mErr) {
      list.replaceChildren();
      $("client-empty").hidden = false;
      $("client-empty").textContent = friendly(pErr || mErr);
      return;
    }

    for (const p of profiles) names[p.id] = p.display_name || "（名前未設定）";
    const byClient = {};
    for (const m of messages) (byClient[m.client_id] ||= []).push(m);

    const rows = profiles
      .filter((p) => p.role === "client")
      .map((p) => {
        const ms = byClient[p.id] || [];
        const last = ms[ms.length - 1];
        return { p, last, waiting: unansweredIds(ms, p.id).length, at: last ? last.created_at : p.created_at };
      })
      .sort((a, b) => (b.waiting > 0) - (a.waiting > 0) || (a.at < b.at ? 1 : -1));

    list.replaceChildren();
    $("client-empty").hidden = rows.length > 0;
    $("client-empty").textContent = "まだクライアントがいません。README.md の手順でアカウントを追加してください。";
    for (const { p, last, waiting } of rows) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      const main = document.createElement("div");
      main.className = "client-main";
      const name = document.createElement("div");
      name.className = "client-name";
      name.textContent = names[p.id];
      const sub = document.createElement("div");
      sub.className = "client-sub";
      sub.textContent = last ? shortFmt.format(new Date(last.created_at)) + "　" + last.body.replace(/\s+/g, " ") : "まだ書き込みはありません";
      main.append(name, sub);
      btn.append(main);
      if (waiting) {
        const badge = document.createElement("span");
        badge.className = "badge";
        badge.textContent = "未返信 " + waiting;
        btn.append(badge);
      }
      btn.addEventListener("click", () => openThread(p.id));
      li.append(btn);
      list.append(li);
    }
  }

  // ---------- 麻美さん：一人のノートと返信 ----------

  async function openThread(clientId) {
    threadClientId = clientId;
    show("thread", names[clientId]);
    $("reply-input").value = "";
    setError("reply-error");
    await loadThread(true);
  }

  async function loadThread(jump) {
    const clientId = threadClientId;
    const { data: messages, error } = await sb
      .from("messages")
      .select("id, author_id, body, created_at")
      .eq("client_id", clientId)
      .order("created_at");
    if (clientId !== threadClientId) return;
    if (error) return setError("reply-error", error);
    const waiting = unansweredIds(messages, clientId);
    renderTimeline($("thread-list"), messages, { viewerId: me.id, highlight: waiting });
    $("reply-hint").textContent = waiting.length ? "未返信の " + waiting.length + " 件にまとめて返信します" : "未返信の書き込みはありません";
    if (jump) scrollToBottom();
  }

  $("reply-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const body = $("reply-input").value.trim();
    if (!body) return;
    setError("reply-error");
    busy(form, true);
    const { error } = await sb.from("messages").insert({ client_id: threadClientId, author_id: me.id, body });
    busy(form, false);
    if (error) return setError("reply-error", error);
    $("reply-input").value = "";
    await loadThread(true);
  });

  // ---------- 設定 ----------

  $("menu-btn").addEventListener("click", () => {
    show("settings", "設定");
    $("settings-name").value = me.display_name;
    $("settings-msg").textContent = "";
  });

  $("back").addEventListener("click", () => {
    if (current === "thread" || homeView === "clients") openClients();
    else openJournal();
  });

  $("settings-name-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const name = $("settings-name").value.trim();
    if (!name) return;
    busy(form, true);
    const { error } = await sb.from("profiles").update({ display_name: name }).eq("id", me.id);
    busy(form, false);
    if (error) return ($("settings-msg").textContent = friendly(error));
    me.display_name = name;
    $("settings-msg").textContent = "表示名を変更しました。";
  });

  $("password-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    busy(form, true);
    const { error } = await sb.auth.updateUser({ password: $("new-password").value });
    busy(form, false);
    if (error) return ($("settings-msg").textContent = friendly(error));
    $("new-password").value = "";
    $("settings-msg").textContent = "パスワードを変更しました。";
  });

  $("logout").addEventListener("click", () => sb.auth.signOut());

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  init();
})();
