/*
 * ステージ2：コミット
 * 編集 → git add（ステージに乗せる） → git commit（記録する） をくり返し、最後に git log で歴史を見る
 */
(function () {
  'use strict';
  var esc = GitPractice.esc;
  var randomId = GitPractice.randomId;

  var KIND_LABEL = { add: '新しいファイル', mod: '変更あり' };

  function fileChip(f, area) {
    return '<li class="file file-' + f.kind + '" data-key="' + area + '-' + f.name + '-' + f.v + '">' +
      '<span class="file-name"><span aria-hidden="true">📄</span> ' + esc(f.name) + '</span>' +
      '<span class="tag tag-' + f.kind + '">' + KIND_LABEL[f.kind] + '</span></li>';
  }

  function fileList(files, area, empty) {
    if (!files.length) return '<div class="placeholder placeholder-sm">' + empty + '</div>';
    return '<ul class="files">' + files.map(function (f) { return fileChip(f, area); }).join('') + '</ul>';
  }

  function makeCommit(s, msg) {
    var id = randomId();
    var files = s.staged.map(function (f) { return f.name; });
    s.commits.push({ id: id, msg: msg, files: files });
    s.staged = [];
    return { id: id, msg: msg, count: files.length };
  }

  function commitOutput(ctx) {
    return '[main ' + ctx.result.id + '] ' + ctx.result.msg + '\n ' + ctx.result.count +
      ' file' + (ctx.result.count > 1 ? 's' : '') + ' changed\n# ↑「' + ctx.result.count + 'つのファイルの変更を記録しました」という意味';
  }

  var commitParts = [
    ['git commit', '記録する（セーブする）'],
    ['-m', '「メッセージをつけます」という合図（message の m）'],
    ['"…"', '何をしたかのメモ（コミットメッセージ）']
  ];

  GitPractice.registerStage({
    id: 2,

    lead: 'ファイルの変更を<b>セーブポイント（コミット）</b>として記録してみましょう。',

    intro:
      '<p><strong>コミット</strong>とは、その時点のファイルの状態を「メッセージつき」で記録することです。ゲームの<b>セーブポイント</b>のようなもので、あとからいつでもその時点に戻れます。</p>' +
      '<h3 class="intro-sub">記録するまでの3つの場所</h3>' +
      '<ol class="places">' +
        '<li class="place place-work"><span class="place-name">① 作業スペース</span><p>ファイルを書いたり直したりする場所。</p></li>' +
        '<li class="place-arrow"><code>git add</code><span aria-hidden="true"></span></li>' +
        '<li class="place place-stage"><span class="place-name">② ステージ</span><p>「次のセーブに入れるもの」を置いておく準備エリア。</p></li>' +
        '<li class="place-arrow"><code>git commit</code><span aria-hidden="true"></span></li>' +
        '<li class="place place-repo"><span class="place-name">③ リポジトリ</span><p>セーブポイント（コミット）が順番に積み重なっていく場所。</p></li>' +
      '</ol>' +
      '<div class="memo"><div class="memo-title">📷 たとえるなら「記念写真」</div>' +
        '<ul><li><b>git add</b> … 写真に写したい人を、撮影台（ステージ）に並べる</li>' +
        '<li><b>git commit</b> … シャッターを押して、写真（記録）を残す</li></ul>' +
        '<p>ステージがあるおかげで、「この変更だけ記録する」と選べるのです。</p></div>',

    initialState: function () {
      return { work: [], staged: [], commits: [], v: 0, logShown: false };
    },

    render: function (s) {
      var commits = s.commits.length
        ? '<ol class="commits">' + s.commits.map(function (c, i) {
            var isHead = i === s.commits.length - 1;
            return '<li class="commit" data-key="commit-' + c.id + '">' +
              '<span class="commit-dot" aria-hidden="true"></span>' +
              '<span class="commit-body"><code class="commit-id">' + c.id + '</code>' +
              '<span class="commit-msg">' + esc(c.msg) + '</span>' +
              (isHead ? '<span class="head-tag" data-key="head-' + c.id + '">HEAD → main</span>' : '') +
              '</span></li>';
          }).join('') + '</ol>'
        : '<div class="placeholder placeholder-sm">まだコミットはありません</div>';

      return '<p class="diagram-caption"><span aria-hidden="true">🗂️</span> my-site リポジトリの中（あなたのパソコン）</p>' +
        '<div class="lanes">' +
          '<div class="lane lane-work"><div class="lane-head"><span class="lane-title">① 作業スペース</span><span class="lane-sub">変更したファイル</span></div>' +
            fileList(s.work, 'work', '変更はありません') + '</div>' +
          '<div class="lane-arrow" aria-hidden="true"><code>git add</code></div>' +
          '<div class="lane lane-stage"><div class="lane-head"><span class="lane-title">② ステージ</span><span class="lane-sub">次のコミットに入れるもの</span></div>' +
            fileList(s.staged, 'stage', 'まだ何も乗っていません') + '</div>' +
          '<div class="lane-arrow" aria-hidden="true"><code>git commit</code></div>' +
          '<div class="lane lane-repo' + (s.logShown ? ' is-spotlight' : '') + '"' + (s.logShown ? ' data-key="spotlight"' : '') + '>' +
            '<div class="lane-head"><span class="lane-title">③ リポジトリ</span><span class="lane-sub">コミットの歴史（古い → 新しい）</span></div>' +
            commits + '</div>' +
        '</div>';
    },

    steps: [
      {
        mission: 'ステージ1で作った my-site リポジトリの続きです。<b>index.html</b> に「ようこそ！」と書きこみましょう。',
        button: '✏️ index.html を編集する',
        apply: function (s) { s.work = [{ name: 'index.html', kind: 'add', v: ++s.v }]; },
        commandLabel: '状態を確認するコマンド',
        command: 'git status',
        output: 'Untracked files:\n  index.html\n# ↑「まだGitに記録されていないファイルがあるよ」という意味',
        parts: [['git status', 'いまの状態を確認する（status＝状態）']],
        note: 'ファイルを編集すると、まず<b>作業スペース</b>に現れます。この時点では、まだ何も記録されていません。<code>git status</code> でいつでも状態を確認できます。'
      },
      {
        mission: 'この変更を次のセーブポイントに入れるために、<b>ステージ</b>に乗せましょう。',
        button: '📥 git add index.html',
        apply: function (s) {
          s.staged = s.staged.concat(s.work);
          s.work = [];
        },
        command: 'git add index.html',
        parts: [
          ['git add', 'ステージに乗せる（add＝加える）'],
          ['index.html', '乗せるファイルの名前']
        ],
        note: 'index.html が<b>ステージ</b>に移動しました。「次のコミットにはこれを入れる」と予約した状態です。'
      },
      {
        mission: 'ステージにあるものを<b>コミット</b>して記録しましょう。何をしたか分かるメッセージをつけます。',
        input: {
          label: 'コミットメッセージ',
          value: 'トップページを作成',
          help: '自由に書きかえてもOK。あとから読んで「何をしたか」が分かる一言にしましょう。',
          emptyMessage: 'コミットには必ずメッセージが必要です。何をしたかを書いてみましょう。'
        },
        button: '📸 git commit で記録する',
        apply: function (s, msg) { return makeCommit(s, msg); },
        command: function (ctx) { return 'git commit -m "' + ctx.result.msg + '"'; },
        output: commitOutput,
        parts: commitParts,
        note: function (ctx) {
          return '1つ目のセーブポイント（コミット）ができました！<code>' + ctx.result.id + '</code> は、コミットごとにつく背番号（<b>コミットID</b>）です。ステージは空っぽに戻りました。';
        }
      },
      {
        mission: 'つぎはデザインを整えます。新しく <b>style.css</b> を作り、<b>index.html</b> も少し書きかえましょう。',
        button: '✏️ 2つのファイルを編集する',
        apply: function (s) {
          s.work = [
            { name: 'index.html', kind: 'mod', v: ++s.v },
            { name: 'style.css', kind: 'add', v: ++s.v }
          ];
        },
        commandLabel: '状態を確認するコマンド',
        command: 'git status',
        output: 'Changes not staged for commit:\n  modified:   index.html\nUntracked files:\n  style.css\n# ↑ index.html は「変更あり」、style.css は「新しいファイル」という意味',
        parts: [['git status', 'いまの状態を確認する']],
        note: '2つのファイルが作業スペースに並びました。一度コミットしたファイルでも、書きかえるとまた「変更あり」になります。'
      },
      {
        mission: '今度は、2つのファイルを<b>まとめて</b>ステージに乗せましょう。',
        button: '📥 git add .',
        apply: function (s) {
          s.staged = s.staged.concat(s.work);
          s.work = [];
        },
        command: 'git add .',
        parts: [
          ['git add', 'ステージに乗せる'],
          ['.', '「ここにある変更ぜんぶ」という意味（ドット）']
        ],
        note: 'ドット（<code>.</code>）を使うと、変更したファイルをまとめてステージに乗せられます。1つずつ乗せたいときは、ファイル名を書きます。'
      },
      {
        mission: '2つ目のセーブポイントを作りましょう。メッセージも書きます。',
        input: {
          label: 'コミットメッセージ',
          value: 'デザインを追加',
          help: '例：「デザインを追加」「見出しの色を変更」など',
          emptyMessage: 'コミットには必ずメッセージが必要です。何をしたかを書いてみましょう。'
        },
        button: '📸 git commit で記録する',
        apply: function (s, msg) { return makeCommit(s, msg); },
        command: function (ctx) { return 'git commit -m "' + ctx.result.msg + '"'; },
        output: commitOutput,
        parts: commitParts,
        note: '2つ目のコミットができました。コミットはこうして<b>積み重なって</b>いきます。目印の <b>HEAD</b> も、いちばん新しいコミットに移動しました。'
      },
      {
        mission: 'これまでのセーブポイントの一覧（歴史）を見てみましょう。',
        button: '📜 git log で歴史を見る',
        apply: function (s) { s.logShown = true; },
        command: 'git log --oneline',
        output: function (ctx) {
          var lines = ctx.state.commits.slice().reverse().map(function (c, i) {
            return c.id + (i === 0 ? ' (HEAD -> main) ' : ' ') + c.msg;
          });
          return lines.join('\n') + '\n# ↑ 上が新しいコミット、下が古いコミット';
        },
        parts: [
          ['git log', 'コミットの歴史（log＝記録）を見る'],
          ['--oneline', '1つのコミットを1行で短く表示する']
        ],
        note: 'これまでのコミットが新しい順に表示されました。<b>HEAD -> main</b> は「いまここにいる」という目印です。こうして歴史が残っているので、困ったときは過去のコミットに戻ることもできます。'
      }
    ],

    quiz: [
      {
        q: '「コミット」とは何をすること？',
        choices: [
          'ファイルを削除すること',
          'その時点のファイルの状態を、メッセージつきで記録すること',
          'GitHubにログインすること',
          'ファイルの名前を変えること'
        ],
        answer: 1,
        hint: 'ゲームでいうと何にあたるか、思い出してみましょう。',
        explain: 'コミットはセーブポイントのようなもの。その時点の状態をメッセージつきで記録します。'
      },
      {
        q: '<code>git add</code> の役割はどれ？',
        choices: [
          '変更を次のコミットに入れるため、ステージに乗せる',
          '新しいファイルを作る',
          'GitHubに変更を送る',
          'コミットを取り消す'
        ],
        answer: 0,
        hint: 'git add したファイルは、図の中でどこに移動しましたか？',
        explain: 'git add で変更を「ステージ」に乗せ、git commit でそれを記録します。'
      },
      {
        q: '変更を記録するときの、正しい順番はどれ？',
        choices: [
          'git commit → 編集 → git add',
          'git add → 編集 → git commit',
          '編集 → git commit → git add',
          '編集 → git add → git commit'
        ],
        answer: 3,
        hint: '図の①→②→③の順番を思い出しましょう。',
        explain: '作業スペースで編集 → git add でステージへ → git commit でリポジトリに記録、の順番です。'
      },
      {
        q: 'あとから読んで分かりやすいコミットメッセージはどれ？',
        choices: ['修正', 'aaa', 'お問い合わせフォームを追加', 'あとで書く'],
        answer: 2,
        hint: '1か月後の自分やチームの人が読んで、何をしたか分かるのはどれでしょう？',
        explain: '「何をしたか」が具体的に分かるメッセージが良いメッセージです。'
      }
    ],

    learned: [
      ['git status', 'いまの状態を確認する'],
      ['git add ファイル名', '変更をステージに乗せる（. ならぜんぶ）'],
      ['git commit -m "メッセージ"', 'ステージの内容を記録する'],
      ['git log --oneline', 'コミットの歴史を見る']
    ],

    clearMessage: 'コミットのしかたがわかりました！<br>ただし、コミットはまだ<b>あなたのパソコンの中だけ</b>にあります。次のステージでは、これをGitHubへ送る<b>プッシュ</b>を体験します。'
  });
})();
