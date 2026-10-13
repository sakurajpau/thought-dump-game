// 気づきノートの設定
// Supabase の「Project Settings → API」に出ている値を貼り付けます。
// anon key は公開して問題ない鍵です（誰が何を見られるかはデータベース側で制限しています）。
window.APP_CONFIG = {
  SUPABASE_URL: "https://YOUR-PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "YOUR-ANON-KEY",

  // 画面に表示する名前
  APP_NAME: "気づきノート",
  COUNSELOR_NAME: "麻美さん",

  // クライアントの画面に常に表示するお知らせ。連絡先は必ずご自身で確認してから使ってください。
  CRISIS_NOTE:
    "このノートへの返信は、麻美さんがまとめて行います。今すぐ助けが必要なときは、119番、または「いのちの電話」（0570-783-556）などの相談窓口へご連絡ください。",
};
