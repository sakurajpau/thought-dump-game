/*
 * ステージ1：リポジトリ
 * フォルダを作る → git init でリポジトリにする → GitHubにも作る → つなげる
 */
(function () {
  'use strict';
  GitPractice.registerStage({
    id: 1,

    lead: 'Gitで管理するプロジェクトの「入れ物」である<b>リポジトリ</b>を作ってみましょう。',

    intro:
      '<p>Gitで管理するプロジェクトのフォルダのことを<strong>リポジトリ</strong>と呼びます。</p>' +
      '<div class="concepts">' +
        '<div class="concept"><div class="concept-icon" aria-hidden="true">📁</div>' +
          '<div class="concept-title">ふつうのフォルダ</div>' +
          '<p>いまの状態しか残らない。上書きすると、前の状態には戻せない。</p></div>' +
        '<div class="concept concept-accent"><div class="concept-icon" aria-hidden="true">🗂️</div>' +
          '<div class="concept-title">リポジトリ</div>' +
          '<p>「いつ・何を変えたか」という<b>変更の歴史</b>まで残せる、特別なフォルダ。</p></div>' +
      '</div>' +
      '<h3 class="intro-sub">リポジトリは2か所にあります</h3>' +
      '<div class="concepts">' +
        '<div class="concept concept-local"><div class="concept-icon" aria-hidden="true">💻</div>' +
          '<div class="concept-title">ローカルリポジトリ</div>' +
          '<p>自分のパソコンの中にあるリポジトリ。ふだんの作業はここでします。</p></div>' +
        '<div class="concept concept-remote"><div class="concept-icon" aria-hidden="true">☁️</div>' +
          '<div class="concept-title">リモートリポジトリ</div>' +
          '<p>GitHub（インターネット上）にあるリポジトリ。チームとの共有やバックアップに使います。</p></div>' +
      '</div>' +
      '<div class="memo"><div class="memo-title">📝 用語メモ：「Git」と「GitHub」のちがい</div>' +
        '<ul><li><b>Git（ギット）</b>… 変更の歴史を記録する<b>道具（ソフト）</b>。パソコンの中で動きます。</li>' +
        '<li><b>GitHub（ギットハブ）</b>… Gitのリポジトリをインターネット上に置いておける<b>Webサービス</b>です。</li></ul></div>',

    initialState: function () {
      return { folder: false, file: false, repo: false, remote: false, connected: false };
    },

    // いまの状態から図を作る（data-key がついた部品は、新しく出てきたときにアニメーションします）
    render: function (s) {
      var local;
      if (!s.folder) {
        local = '<div class="placeholder">まだ何もありません</div>';
      } else {
        local =
          '<div class="folder' + (s.repo ? ' is-repo' : '') + '" data-key="folder">' +
            '<div class="folder-top">' +
              '<span class="folder-name"><span aria-hidden="true">' + (s.repo ? '🗂️' : '📁') + '</span> my-site/</span>' +
              (s.repo
                ? '<span class="badge badge-repo" data-key="badge-repo">リポジトリ</span>'
                : '<span class="badge" data-key="badge-folder">ただのフォルダ</span>') +
            '</div>' +
            '<ul class="tree">' +
              (s.repo ? '<li class="tree-git" data-key="gitdir"><span aria-hidden="true">🗃️</span> .git <small>履歴の保管庫（まだ空っぽ）</small></li>' : '') +
              (s.file ? '<li data-key="file-index"><span aria-hidden="true">📄</span> index.html</li>' : '') +
              (!s.file && !s.repo ? '<li class="tree-empty">（中身は空）</li>' : '') +
            '</ul>' +
          '</div>';
      }

      var remote;
      if (!s.remote) {
        remote = '<div class="placeholder">まだリポジトリがありません</div>';
      } else {
        remote =
          '<div class="folder is-repo is-remote" data-key="remote-repo">' +
            '<div class="folder-top">' +
              '<span class="folder-name"><span aria-hidden="true">🗂️</span> you/my-site</span>' +
              '<span class="badge badge-remote">リポジトリ</span>' +
            '</div>' +
            '<ul class="tree"><li class="tree-empty">（まだ空っぽ）</li></ul>' +
            '<div class="url">github.com/you/my-site</div>' +
          '</div>';
      }

      return '<div class="world">' +
        '<div class="zone zone-local"><div class="zone-head"><span aria-hidden="true">💻</span> あなたのパソコン<small>ローカル</small></div>' +
          '<div class="zone-body">' + local + '</div></div>' +
        '<div class="link' + (s.connected ? ' is-connected' : '') + '" aria-label="' + (s.connected ? 'つながっている' : 'つながっていない') + '">' +
          '<span class="link-line"></span>' +
          (s.connected ? '<span class="link-label" data-key="link-on">🔗 origin でつながった</span>' : '<span class="link-label">つながっていない</span>') +
        '</div>' +
        '<div class="zone zone-remote"><div class="zone-head"><span aria-hidden="true">☁️</span> GitHub<small>リモート</small></div>' +
          '<div class="zone-body">' + remote + '</div></div>' +
      '</div>';
    },

    steps: [
      {
        mission: 'まずは、パソコンの中に作業用のフォルダ「<b>my-site</b>」を作りましょう。',
        button: '📁 フォルダを作る',
        apply: function (s) { s.folder = true; },
        command: ['mkdir my-site', 'cd my-site'],
        parts: [
          ['mkdir', 'フォルダを作る（make directory の略）'],
          ['cd', 'そのフォルダの中に移動する（change directory の略）']
        ],
        note: 'パソコンの中に「my-site」フォルダができました。でもこれは、まだ<b>ただのフォルダ</b>です。変更の歴史は記録されません。'
      },
      {
        mission: 'フォルダの中に、Webページのファイル「<b>index.html</b>」を作りましょう。',
        button: '📄 ファイルを作る',
        apply: function (s) { s.file = true; },
        command: 'touch index.html',
        parts: [['touch', '空っぽのファイルを作る']],
        note: 'フォルダの中にファイルができました。講座では、エディタやClaude Codeがファイルを作ってくれることも多いです。'
      },
      {
        mission: 'いよいよ、このフォルダを<b>リポジトリ</b>に変身させます。',
        button: '✨ git init を実行する',
        apply: function (s) { s.repo = true; },
        command: 'git init',
        output: 'Initialized empty Git repository in /my-site/.git/\n# ↑「空っぽのGitリポジトリを作りました」という意味',
        parts: [
          ['git', 'Gitを使うときに最初につける言葉'],
          ['init', 'はじめる（initialize の略）']
        ],
        note: 'フォルダの中に <b>.git</b> という隠しフォルダができて、「my-site」は<b>ローカルリポジトリ</b>になりました。.git は変更の歴史をしまっておく保管庫です。まだ何も記録していないので、中身は空っぽです。'
      },
      {
        mission: 'つぎは、GitHub（インターネット上）にも「my-site」リポジトリを作りましょう。',
        button: '☁️ GitHubでリポジトリを作る',
        apply: function (s) { s.remote = true; },
        webop: 'GitHubのサイトで「<b>New repository</b>」ボタンを押し、リポジトリ名に <code>my-site</code> と入力して「Create repository」を押します。',
        logText: 'New repository → my-site',
        note: 'GitHub上に<b>リモートリポジトリ</b>ができました。住所（URL）は <code>https://github.com/you/my-site</code> です。でも、まだパソコンのリポジトリとは<b>つながっていません</b>。'
      },
      {
        mission: '最後に、パソコンのリポジトリとGitHubのリポジトリを<b>つなげ</b>ましょう。',
        button: '🔗 2つをつなげる',
        apply: function (s) { s.connected = true; },
        command: 'git remote add origin https://github.com/you/my-site.git',
        parts: [
          ['git remote add', 'つなぎ先（リモート）を登録する'],
          ['origin', 'つなぎ先につける“あだ名”。ふつうは origin にします'],
          ['https://…', 'GitHubのリポジトリの住所（URL）']
        ],
        note: 'ローカルとリモートがつながりました！これで、変更をGitHubへ送ったり（<b>プッシュ</b>）、GitHubから受け取ったり（<b>プル</b>）できる準備が整いました。'
      }
    ],

    quiz: [
      {
        q: '「リポジトリ」の説明として正しいものはどれ？',
        choices: [
          'パソコンのゴミ箱のこと',
          '変更の歴史まで記録できる、プロジェクトの入れ物',
          'GitHubにログインするためのパスワード',
          'プログラミング言語のひとつ'
        ],
        answer: 1,
        hint: '「ふつうのフォルダ」とのちがいを思い出してみましょう。',
        explain: 'リポジトリは、ファイルだけでなく「いつ・何を変えたか」という歴史まで保存できる入れ物です。'
      },
      {
        q: 'ふつうのフォルダを、リポジトリにするコマンドはどれ？',
        choices: ['mkdir my-site', 'git start', 'git remote add origin', 'git init'],
        answer: 3,
        hint: '「はじめる（initialize）」という意味の言葉でしたね。',
        explain: '<code>git init</code> を実行すると .git フォルダができて、リポジトリになります。'
      },
      {
        q: 'GitHub（インターネット上）にあるリポジトリを何と呼ぶ？',
        choices: ['ローカルリポジトリ', 'リモートリポジトリ', 'ホームリポジトリ', 'クラウドフォルダ'],
        answer: 1,
        hint: '自分のパソコンの中にあるのが「ローカル」でした。その反対は？',
        explain: 'リモート＝離れた場所という意味です。自分のパソコンの中にあるのはローカルリポジトリです。'
      },
      {
        q: '「Git」と「GitHub」の説明として正しいものはどれ？',
        choices: [
          'GitとGitHubは、まったく同じもの',
          'Gitはスマホ専用のアプリで、GitHubはパソコン専用のアプリ',
          'Gitは変更を記録する道具、GitHubはリポジトリをネット上に置けるWebサービス',
          'GitHubはファイルを消すための道具'
        ],
        answer: 2,
        hint: '説明の「用語メモ」に書いてありました。',
        explain: 'Gitはパソコンの中で動く「記録の道具」、GitHubはそのリポジトリをインターネット上で預かってくれる「サービス」です。'
      }
    ],

    learned: [
      ['mkdir', 'フォルダを作る'],
      ['git init', 'フォルダをリポジトリにする'],
      ['git remote add origin URL', 'GitHubのリポジトリとつなげる']
    ],

    clearMessage: 'リポジトリの作り方がわかりました！<br>次のステージでは、このリポジトリに変更を<b>記録（コミット）</b>していきます。'
  });

})();
