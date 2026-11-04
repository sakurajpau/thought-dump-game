/*
 * さわって覚えるGitHub - アプリ全体の土台
 *
 * - 画面の切り替え（ステージ一覧 ⇔ 各ステージ）
 * - 進み具合の保存（ブラウザの localStorage）
 * - ステージ共通の流れ：説明 → 操作 → 図が動く → コマンド表示 → 確認問題
 *
 * 各ステージの中身は js/stages/ の中のファイルで
 *   GitPractice.registerStage({ id: 1, ... })
 * のように登録します（書き方は README.md を参照）。
 */
(function () {
  'use strict';

  // ------------------------------------------------------------
  // 全ステージの一覧（中身がまだないステージは「準備中」と表示）
  // ------------------------------------------------------------
  var STAGE_LIST = [
    { id: 1, title: 'リポジトリ', summary: 'プロジェクトの「入れ物」をつくる', icon: '📁' },
    { id: 2, title: 'コミット', summary: '変更を「セーブポイント」として記録する', icon: '📸' },
    { id: 3, title: 'プッシュ', summary: '記録した変更をGitHubへ送る', icon: '⬆️' },
    { id: 4, title: 'プル', summary: 'GitHubの最新の状態を受け取る', icon: '⬇️' },
    { id: 5, title: 'ブランチとマージ', summary: '作業を枝分かれさせて、あとで合流する', icon: '🌿' },
    { id: 6, title: 'コンフリクト', summary: '変更がぶつかったときの直し方', icon: '⚡' }
  ];

  var stageDefs = {};
  var app = document.getElementById('app');
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ------------------------------------------------------------
  // 小さな便利関数
  // ------------------------------------------------------------
  function esc(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // 本物のgitのコミットIDっぽい7桁の英数字
  function randomId() {
    var s = '';
    for (var i = 0; i < 7; i++) s += '0123456789abcdef'[Math.floor(Math.random() * 16)];
    return s;
  }

  function resolve(value, ctx) {
    return typeof value === 'function' ? value(ctx) : value;
  }

  function scrollToEl(el) {
    if (!el) return;
    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  function isAbove(el) {
    var r = el.getBoundingClientRect();
    return r.top < 56;
  }

  // ------------------------------------------------------------
  // 進み具合の保存（保存できない環境でも動くようにする）
  // ------------------------------------------------------------
  var Progress = (function () {
    var KEY = 'git-practice-progress-v1';
    var memory = { cleared: [] };

    function load() {
      try {
        var data = JSON.parse(localStorage.getItem(KEY));
        if (data && Array.isArray(data.cleared)) memory = data;
      } catch (e) { /* 保存領域が使えないときはメモリだけで動かす */ }
      return memory;
    }
    function save() {
      try { localStorage.setItem(KEY, JSON.stringify(memory)); } catch (e) { /* 無視 */ }
    }
    return {
      isCleared: function (id) { return load().cleared.indexOf(id) !== -1; },
      markCleared: function (id) {
        load();
        if (memory.cleared.indexOf(id) === -1) memory.cleared.push(id);
        save();
      },
      count: function () { return load().cleared.length; },
      reset: function () { memory = { cleared: [] }; save(); }
    };
  })();

  // ------------------------------------------------------------
  // 画面の切り替え（URLの # の後ろで判断）
  //   #/          → ステージ一覧
  //   #/stage/1   → ステージ1
  // ------------------------------------------------------------
  function route() {
    var m = location.hash.match(/^#\/stage\/(\d+)/);
    if (m) renderStage(parseInt(m[1], 10));
    else renderHome();
    window.scrollTo(0, 0);
    app.focus({ preventScroll: true });
  }

  function metaById(id) {
    for (var i = 0; i < STAGE_LIST.length; i++) if (STAGE_LIST[i].id === id) return STAGE_LIST[i];
    return null;
  }

  // ------------------------------------------------------------
  // ステージ一覧（トップ画面）
  // ------------------------------------------------------------
  function renderHome() {
    document.title = 'さわって覚えるGitHub';
    var cleared = Progress.count();
    var total = STAGE_LIST.length;
    var nextId = null;
    STAGE_LIST.forEach(function (s) {
      if (nextId === null && stageDefs[s.id] && !Progress.isCleared(s.id)) nextId = s.id;
    });

    var cards = STAGE_LIST.map(function (s) {
      var ready = !!stageDefs[s.id];
      var done = Progress.isCleared(s.id);
      var status = done ? '<span class="status status-done">✓ クリア</span>'
        : !ready ? '<span class="status status-soon">準備中</span>'
        : s.id === nextId ? '<span class="status status-next">次はここ！</span>'
        : '<span class="status">挑戦できる</span>';
      var inner =
        '<span class="stage-num">STAGE ' + s.id + '</span>' +
        '<span class="stage-icon" aria-hidden="true">' + s.icon + '</span>' +
        '<span class="stage-text"><span class="stage-title">' + esc(s.title) + '</span>' +
        '<span class="stage-summary">' + esc(s.summary) + '</span></span>' + status;
      var cls = 'stage-card' + (done ? ' is-done' : '') + (!ready ? ' is-soon' : '') + (s.id === nextId ? ' is-next' : '');
      return '<li>' + (ready
        ? '<a class="' + cls + '" href="#/stage/' + s.id + '">' + inner + '</a>'
        : '<div class="' + cls + '" aria-disabled="true">' + inner + '</div>') + '</li>';
    }).join('');

    app.innerHTML =
      '<section class="hero">' +
        '<p class="eyebrow">Claude Code講座 ・ 体験型の練習アプリ</p>' +
        '<h1>さわって覚える<br><span class="hero-accent">GitHub</span>のしくみ</h1>' +
        '<p class="hero-lead">ボタンを押すと図が動き、そのとき使う「gitコマンド」がわかります。<br>本物のGitHubには接続しないので、失敗しても大丈夫。</p>' +
        '<div class="progress" role="group" aria-label="進み具合">' +
          '<div class="progress-label"><span>進み具合</span><strong>' + cleared + ' / ' + total + ' ステージ クリア</strong></div>' +
          '<div class="progress-bar"><span style="width:' + (cleared / total * 100) + '%"></span></div>' +
        '</div>' +
        (nextId ? '<a class="btn btn-primary btn-wide" href="#/stage/' + nextId + '">' +
          (cleared ? 'ステージ' + nextId + 'から続ける →' : 'ステージ1からはじめる →') + '</a>' : '') +
      '</section>' +

      '<section class="block">' +
        '<h2 class="block-title">ステージ一覧</h2>' +
        '<ol class="stage-list">' + cards + '</ol>' +
      '</section>' +

      '<section class="block howto">' +
        '<h2 class="block-title">各ステージの進め方</h2>' +
        '<ol class="howto-list">' +
          '<li><span class="howto-num">1</span><div><b>説明を読む</b><p>たとえ話でしくみをつかみます。</p></div></li>' +
          '<li><span class="howto-num">2</span><div><b>ボタンで操作</b><p>指示どおりにボタンを押してみます。</p></div></li>' +
          '<li><span class="howto-num">3</span><div><b>図が動く</b><p>パソコンやGitHubの中で何が起きたかを見ます。</p></div></li>' +
          '<li><span class="howto-num">4</span><div><b>コマンドを知る</b><p>本物ではどんなgitコマンドを使うのかを確認します。</p></div></li>' +
          '<li><span class="howto-num">5</span><div><b>確認問題</b><p>ぜんぶ正解でステージクリア！</p></div></li>' +
        '</ol>' +
      '</section>' +

      (cleared ? '<p class="reset-progress"><button type="button" class="link-btn" id="reset-progress">進み具合をリセットする</button></p>' : '');

    var resetBtn = document.getElementById('reset-progress');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        if (window.confirm('クリアの記録をすべて消して、最初からにしますか？')) {
          Progress.reset();
          renderHome();
        }
      });
    }
  }

  // ------------------------------------------------------------
  // 準備中のステージ
  // ------------------------------------------------------------
  function renderComingSoon(meta) {
    document.title = 'ステージ' + meta.id + ' ' + meta.title + '｜さわって覚えるGitHub';
    app.innerHTML =
      topbar(meta) +
      '<section class="card soon-card">' +
        '<div class="soon-icon" aria-hidden="true">' + meta.icon + '</div>' +
        '<h1>ステージ' + meta.id + '「' + esc(meta.title) + '」は準備中です</h1>' +
        '<p>もうしばらくお待ちください。いまは公開中のステージで練習してみましょう。</p>' +
        '<a class="btn btn-primary" href="#/">ステージ一覧へ戻る</a>' +
      '</section>';
  }

  function topbar(meta) {
    return '<nav class="topbar" aria-label="ステージ移動">' +
      '<a class="back-link" href="#/">← ステージ一覧</a>' +
      '<span class="topbar-stage">STAGE ' + meta.id + ' / ' + STAGE_LIST.length + '</span>' +
    '</nav>';
  }

  // ------------------------------------------------------------
  // ステージ画面（全ステージ共通のしくみ）
  // ------------------------------------------------------------
  function renderStage(id) {
    var meta = metaById(id);
    if (!meta) { location.hash = '#/'; return; }
    var def = stageDefs[id];
    if (!def) { renderComingSoon(meta); return; }

    document.title = 'ステージ' + id + ' ' + meta.title + '｜さわって覚えるGitHub';
    var already = Progress.isCleared(id);

    app.innerHTML =
      topbar(meta) +
      '<header class="stage-head">' +
        '<p class="eyebrow">STAGE ' + id + (already ? ' ・ <span class="cleared-mark">✓ クリア済み</span>' : '') + '</p>' +
        '<h1><span aria-hidden="true">' + meta.icon + '</span> ' + esc(meta.title) + '</h1>' +
        '<p class="stage-lead">' + def.lead + '</p>' +
        '<ol class="flow" id="flow">' +
          '<li data-flow="1">説明</li><li data-flow="2">操作</li><li data-flow="3">確認問題</li>' +
        '</ol>' +
      '</header>' +

      '<section class="card section" id="sec-intro">' +
        '<h2 class="section-title"><span class="section-num">1</span>しくみを知ろう</h2>' +
        '<div class="intro">' + def.intro + '</div>' +
        '<button type="button" class="btn btn-primary btn-wide" id="go-practice">操作してみる →</button>' +
      '</section>' +

      '<section class="card section" id="sec-practice" hidden>' +
        '<div class="section-row">' +
          '<h2 class="section-title"><span class="section-num">2</span>操作してみよう</h2>' +
          '<button type="button" class="link-btn" id="reset-practice">↺ 最初から</button>' +
        '</div>' +
        '<p class="section-note">下の図を見ながら、ボタンを1つずつ押してください。</p>' +
        '<div class="diagram" id="diagram" aria-label="いまの状態を表す図"></div>' +
        '<div class="control" id="control" aria-live="polite"></div>' +
        '<details class="history" id="history">' +
          '<summary>これまでに使ったコマンド（<span id="history-count">0</span>）</summary>' +
          '<pre class="term term-history" id="history-term"></pre>' +
        '</details>' +
      '</section>' +

      '<section class="card section" id="sec-quiz" hidden></section>' +
      '<section class="section" id="sec-clear" hidden></section>';

    var rt = {
      id: id,
      meta: meta,
      def: def,
      state: def.initialState(),
      step: 0,
      phase: 'todo',
      prevKeys: {},
      log: []
    };

    setFlow(1);
    drawDiagram(rt, false);
    drawControl(rt);
    drawHistory(rt);

    document.getElementById('go-practice').addEventListener('click', function () {
      var sec = document.getElementById('sec-practice');
      sec.hidden = false;
      this.hidden = true;
      setFlow(2);
      scrollToEl(sec);
    });

    document.getElementById('reset-practice').addEventListener('click', function () {
      rt.state = def.initialState();
      rt.step = 0;
      rt.phase = 'todo';
      rt.prevKeys = {};
      rt.log = [];
      drawDiagram(rt, false);
      drawControl(rt);
      drawHistory(rt);
    });
  }

  function setFlow(current) {
    var items = document.querySelectorAll('#flow li');
    items.forEach(function (li) {
      var n = parseInt(li.getAttribute('data-flow'), 10);
      li.className = n < current ? 'is-done' : n === current ? 'is-current' : '';
      if (n === current) li.setAttribute('aria-current', 'step');
      else li.removeAttribute('aria-current');
    });
  }

  // 図を描く。前回なかった部品（data-key）には「登場アニメーション」をつける
  function drawDiagram(rt, animate) {
    var el = document.getElementById('diagram');
    el.innerHTML = rt.def.render(rt.state);
    var keys = {};
    el.querySelectorAll('[data-key]').forEach(function (node) {
      var k = node.getAttribute('data-key');
      keys[k] = true;
      if (animate && !rt.prevKeys[k]) node.classList.add('is-new');
    });
    rt.prevKeys = keys;
  }

  function drawControl(rt) {
    var el = document.getElementById('control');
    var steps = rt.def.steps;
    var s = steps[rt.step];
    var total = steps.length;
    var dots = steps.map(function (_, i) {
      var cls = i < rt.step || (i === rt.step && rt.phase === 'done') ? 'is-done' : i === rt.step ? 'is-current' : '';
      return '<span class="dot ' + cls + '"></span>';
    }).join('');
    var head = '<div class="step-head"><span class="step-count">ステップ ' + (rt.step + 1) + ' / ' + total + '</span>' +
      '<span class="step-dots" aria-hidden="true">' + dots + '</span></div>';

    if (rt.phase === 'todo') {
      el.className = 'control is-todo';
      el.innerHTML = head +
        '<p class="mission">' + s.mission + '</p>' +
        (s.input ? '<label class="field"><span class="field-label">' + esc(s.input.label) + '</span>' +
          '<input type="text" id="step-input" maxlength="40" autocomplete="off" value="' + esc(s.input.value) + '">' +
          (s.input.help ? '<span class="field-help">' + s.input.help + '</span>' : '') +
          '<span class="field-error" id="step-error" role="alert"></span></label>' : '') +
        '<button type="button" class="btn btn-action btn-wide" id="do-step">' + s.button + '</button>';

      document.getElementById('do-step').addEventListener('click', function () { doStep(rt); });
      var input = document.getElementById('step-input');
      if (input) {
        input.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' && !e.isComposing) doStep(rt);
        });
      }
      return;
    }

    // ステップ完了後：何が起きたか ＋ 対応するコマンド
    var r = rt.lastResult;
    var isLast = rt.step === total - 1;
    var cmdBlock;
    if (r.webop) {
      cmdBlock =
        '<div class="cmd-label">GitHubの画面での操作</div>' +
        '<div class="webop"><span class="webop-icon" aria-hidden="true">🖱️</span><div>' + r.webop +
        '<small>※ これはコマンドではなく、GitHubのWebサイト上でボタンを押して行う操作です。</small></div></div>';
    } else {
      cmdBlock =
        '<div class="cmd-label">' + esc(r.commandLabel || '対応するgitコマンド') + '</div>' +
        '<pre class="term">' + termHtml(r.commands, r.output) + '</pre>';
    }
    var parts = r.parts && r.parts.length
      ? '<div class="cmd-parts"><div class="cmd-parts-title">コマンドの読み方</div><dl>' +
        r.parts.map(function (p) {
          return '<div class="cmd-part"><dt><code>' + esc(p[0]) + '</code></dt><dd>' + p[1] + '</dd></div>';
        }).join('') + '</dl></div>'
      : '';

    el.className = 'control is-done';
    el.innerHTML = head +
      '<p class="done-mark">✓ できました！</p>' +
      '<div class="happened"><div class="happened-title">いま起きたこと</div><p>' + r.note + '</p></div>' +
      cmdBlock + parts +
      '<button type="button" class="btn btn-primary btn-wide" id="next-step">' +
        (isLast ? '確認問題へ進む →' : '次のステップへ →') + '</button>';

    document.getElementById('next-step').addEventListener('click', function () {
      if (isLast) {
        showQuiz(rt);
      } else {
        rt.step += 1;
        rt.phase = 'todo';
        drawControl(rt);
        var ctrl = document.getElementById('control');
        if (isAbove(ctrl)) scrollToEl(document.getElementById('diagram'));
        var btn = document.getElementById('step-input') || document.getElementById('do-step');
        if (btn) btn.focus({ preventScroll: true });
      }
    });
  }

  function doStep(rt) {
    if (rt.phase !== 'todo') return;
    var s = rt.def.steps[rt.step];
    var inputValue = '';
    if (s.input) {
      var input = document.getElementById('step-input');
      inputValue = input.value.trim();
      if (!inputValue) {
        document.getElementById('step-error').textContent = s.input.emptyMessage || '入力してください。';
        input.focus();
        return;
      }
    }

    var ctx = { state: rt.state, input: inputValue };
    ctx.result = s.apply ? s.apply(rt.state, inputValue) : undefined;

    var commands = resolve(s.command, ctx);
    if (commands && !Array.isArray(commands)) commands = [commands];
    rt.lastResult = {
      commands: commands || [],
      output: resolve(s.output, ctx) || '',
      note: resolve(s.note, ctx) || '',
      parts: resolve(s.parts, ctx) || [],
      webop: resolve(s.webop, ctx) || '',
      commandLabel: resolve(s.commandLabel, ctx) || ''
    };
    if (rt.lastResult.webop) {
      rt.log.push({ webop: true, text: '（GitHubの画面で操作）' + (s.logText || '') });
    } else {
      rt.log.push({ commands: rt.lastResult.commands, output: rt.lastResult.output });
    }

    rt.phase = 'done';
    drawDiagram(rt, true);
    drawControl(rt);
    drawHistory(rt);

    var diagram = document.getElementById('diagram');
    if (isAbove(diagram)) scrollToEl(diagram);
  }

  // ターミナル風の表示。「# 」で始まる行は日本語の補足として色を変える
  function termHtml(commands, output) {
    var html = commands.map(function (c) {
      return '<span class="t-line"><span class="t-prompt">$</span> <span class="t-cmd">' + esc(c) + '</span></span>';
    }).join('');
    if (output) {
      html += output.split('\n').map(function (line) {
        var cls = /^\s*#/.test(line) ? 't-comment' : 't-out';
        return '<span class="t-line ' + cls + '">' + (esc(line) || ' ') + '</span>';
      }).join('');
    }
    return html;
  }

  function drawHistory(rt) {
    var term = document.getElementById('history-term');
    var count = 0;
    term.innerHTML = rt.log.length
      ? rt.log.map(function (entry) {
          if (entry.webop) { count += 1; return '<span class="t-line t-comment"># ' + esc(entry.text) + '</span>'; }
          count += entry.commands.length;
          return termHtml(entry.commands, '');
        }).join('')
      : '<span class="t-line t-comment"># まだコマンドはありません</span>';
    document.getElementById('history-count').textContent = count;
  }

  // ------------------------------------------------------------
  // 確認問題
  // ------------------------------------------------------------
  function showQuiz(rt) {
    var sec = document.getElementById('sec-quiz');
    var qs = rt.def.quiz;
    setFlow(3);
    var nextBtn = document.getElementById('next-step');
    if (nextBtn) nextBtn.hidden = true;

    if (!sec.hidden) { scrollToEl(sec); return; }
    sec.hidden = false;
    sec.innerHTML =
      '<h2 class="section-title"><span class="section-num">3</span>確認問題</h2>' +
      '<p class="section-note">全' + qs.length + '問。ぜんぶ正解するとステージクリアです。まちがえても何度でも選びなおせます。</p>' +
      qs.map(function (q, i) {
        return '<div class="quiz" id="quiz-' + i + '">' +
          '<p class="quiz-q"><span class="quiz-num">Q' + (i + 1) + '</span><span>' + q.q + '</span></p>' +
          '<div class="choices" role="group" aria-label="Q' + (i + 1) + 'の選択肢">' +
          q.choices.map(function (c, j) {
            return '<button type="button" class="choice" data-q="' + i + '" data-c="' + j + '">' +
              '<span class="choice-mark">' + 'ABCD'[j] + '</span><span class="choice-text">' + c + '</span></button>';
          }).join('') +
          '</div><div class="quiz-feedback" aria-live="polite"></div></div>';
      }).join('') +
      '<p class="quiz-score" id="quiz-score">正解 0 / ' + qs.length + '</p>';

    var solved = {};
    sec.addEventListener('click', function (e) {
      var btn = e.target.closest('.choice');
      if (!btn || btn.disabled) return;
      var qi = parseInt(btn.getAttribute('data-q'), 10);
      var ci = parseInt(btn.getAttribute('data-c'), 10);
      var q = qs[qi];
      var box = document.getElementById('quiz-' + qi);
      var fb = box.querySelector('.quiz-feedback');
      if (ci === q.answer) {
        solved[qi] = true;
        btn.classList.add('is-correct');
        box.classList.add('is-solved');
        box.querySelectorAll('.choice').forEach(function (b) { b.disabled = true; });
        fb.className = 'quiz-feedback is-correct';
        fb.innerHTML = '<b>⭕ 正解！</b> ' + q.explain;
        var n = Object.keys(solved).length;
        document.getElementById('quiz-score').textContent = '正解 ' + n + ' / ' + qs.length;
        if (n === qs.length) showClear(rt);
      } else {
        btn.classList.add('is-wrong');
        btn.disabled = true;
        fb.className = 'quiz-feedback is-wrong';
        fb.innerHTML = '<b>🤔 おしい！</b> ' + (q.hint || 'もう一度考えてみましょう。');
      }
    });
    scrollToEl(sec);
  }

  // ------------------------------------------------------------
  // ステージクリア
  // ------------------------------------------------------------
  function showClear(rt) {
    Progress.markCleared(rt.id);
    var sec = document.getElementById('sec-clear');
    var next = metaById(rt.id + 1);
    var nextReady = next && stageDefs[next.id];
    var learned = (rt.def.learned || []).map(function (l) {
      return '<li><code>' + esc(l[0]) + '</code><span>' + l[1] + '</span></li>';
    }).join('');

    sec.hidden = false;
    sec.innerHTML =
      '<div class="card clear-card">' +
        '<div class="clear-burst" aria-hidden="true">🎉</div>' +
        '<p class="eyebrow">STAGE ' + rt.id + ' CLEAR</p>' +
        '<h2>ステージ' + rt.id + '「' + esc(rt.meta.title) + '」クリア！</h2>' +
        '<p class="clear-msg">' + rt.def.clearMessage + '</p>' +
        (learned ? '<div class="learned"><div class="learned-title">このステージで出てきたコマンド</div><ul>' + learned + '</ul></div>' : '') +
        '<div class="btn-row">' +
          (next
            ? (nextReady
              ? '<a class="btn btn-primary" href="#/stage/' + next.id + '">ステージ' + next.id + '「' + esc(next.title) + '」へ →</a>'
              : '<span class="next-soon">ステージ' + next.id + '「' + esc(next.title) + '」は準備中です</span>')
            : '<span class="next-soon">全ステージクリア！おつかれさまでした</span>') +
          '<a class="btn btn-ghost" href="#/">ステージ一覧へ</a>' +
        '</div>' +
      '</div>';
    var eyebrow = document.querySelector('.stage-head .eyebrow');
    if (eyebrow && !eyebrow.querySelector('.cleared-mark')) {
      eyebrow.insertAdjacentHTML('beforeend', ' ・ <span class="cleared-mark">✓ クリア済み</span>');
    }
    setTimeout(function () { scrollToEl(sec); }, reduceMotion ? 0 : 400);
  }

  // ------------------------------------------------------------
  // 外（各ステージのファイル）から使うもの
  // ------------------------------------------------------------
  window.GitPractice = {
    registerStage: function (def) { stageDefs[def.id] = def; },
    esc: esc,
    randomId: randomId
  };

  window.addEventListener('hashchange', route);
  document.addEventListener('DOMContentLoaded', route);
})();
