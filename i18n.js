/* Display-only localization. Stored roulette/fortune IDs and user media are never translated. */
(() => {
  'use strict';

  // Match CooTrio's selectable locales; "en" is English UI here, not ASR auto-detection.
  const LANGUAGES = ['ja','en'];
  const LANGUAGE_NAMES = {ja:'日本語',en:'English'};
  const MODE_KEY = 'memory-roulette-language-mode-v1';
  const LANGUAGE_KEY = 'memory-roulette-language-v1';
  // Source, English, German, French, Spanish, Simplified Chinese, Korean, Thai,
  // Hindi, Arabic, Vietnamese, Tagalog. Missing translations fall back to English.
  const ROWS = [["動画","Video"],["思い出ルーレット","Memory Roulette"],["おみくじ","Fortune"],["新しい動画から作る","Create from a new video"],["過去の動画から作る","Create from saved videos"],["動画を選ぶ","Choose video"],["保存した動画を選ぶ","Choose a saved video"],["友達からもらったルーレットを回す","Play a roulette from a friend"],["受け取ったルーレットを遊ぶ","Play received roulettes"],["そのほかの機能","More features"],["お気に入り","Favorites"],["履歴","History"],["GIF作成","Create GIF"],["設定","Settings"],["共有する","Share"],["受け取って遊ぶ","Receive and play"],["ルーレットを送る","Send a roulette"],["アプリの使い方を見る","How to play"],["このアプリの特長","App features"],["かんたん操作","Easy to use"],["動画を選んで遊べる","Pick a video and play"],["登録不要","No registration"],["アカウント作成なし","No account needed"],["動画は端末内で処理","Videos stay on your device"],["元動画を外部送信しない","Original videos are not uploaded"],["ホーム","Home"],["戻る","Back"],["使い方","How to play"],["設定・データ管理","Settings & data"],["ルーレット設定","Roulette settings"],["抽出枚数","Frames to extract"],["おまかせ（8〜15枚）","Automatic (8–15 frames)"],["通常ルーレットにする","Roulette without fortunes"],["運勢サンプルを表示する","Show sample fortunes"],["データ管理","Data management"],["アプリバージョン","App version"],["保存済み動画をすべて削除","Delete all saved videos"],["バックアップを書き出す","Export backup"],["バックアップから復元","Restore backup"],["閉じる","Close"],["すべて選択","Select all"],["選択を解除","Clear selection"],["新しい順","Newest first"],["古い順","Oldest first"],["よく遊んだ順","Most played"],["運勢","Fortune"],["大大吉","Excellent luck"],["大吉","Great luck"],["中吉","Good luck"],["小吉","A little luck"],["吉","Luck"],["末吉","Luck is coming"],["凶","Be careful"],["大凶","Take a break"],["特大吉","Extra-special luck"],["大逆転大吉","Surprise great luck"],["特大吉！","Extra-special luck!"],["大逆転大吉！","Surprise great luck!"],["思い出ルーレットおみくじ","Memory Roulette Fortune"],["結果発表","The result"],["ルーレット抽選中…","Spinning the roulette…"],["自分では選ばなかった一枚に出会う","Discover a moment you would not have chosen"],["特別な一瞬を引きました","You found a special moment"],["もう一度、その瞬間へ","Back to that moment"],["まもなくスローリプレイ","Slow replay starting soon"],["大逆転の瞬間","A surprising turnaround"],["特大吉の一瞬","An extra-lucky moment"],["この一枚をゆっくり表示します","We’ll replay this photo slowly"],["大凶かと思ったら…","Just when you thought it was the worst luck…"],["大凶から一転。今日は大逆転大吉！","An amazing turnaround from terrible luck to great luck!"],["大凶……","Terrible luck…"],["……あれ？","…wait?"],["まだ終わっていません","It's not over yet"],["逆再生を準備中…","Preparing reverse replay…"],["特別な一瞬へ","To a special moment"],["逆再生で近づいています","Replaying backward toward the moment"],["保存した連続コマをスロー再生中","Replaying saved frames in slow motion"],["逆向きフレームリプレイ","Reverse frame replay"],["今日のラッキーカラー","Today's lucky color"],["今日のラッキーポイント","Today's lucky detail"],["共有先を選ぶ","Choose where to share"],["↓ 端末に保存","↓ Save to device"],["このルーレットを共有する","Share this roulette"],["特別な運勢。思いがけない一瞬との出会いまで、今日のおみくじの結果です。","A special fortune! Even this unexpected moment is part of today’s lucky draw."],["今日は特別ないい日。笑顔で過ごすとさらに運気アップ！","Today is extra lucky. Keep smiling!"],["いい流れの日。落ち着いて進めばいいことがありそう。","Things are going well. Take it calmly and good things may follow."],["小さな幸せを見つけられる日。やさしい気持ちで。","A day to discover little joys. Be kind to yourself and others."],["安定したいい日。いつも通りがいちばんの近道です。","A peaceful, steady day. Your usual rhythm is just right."],["これからじわっと上向き。あせらずゆっくりいこう。","Your luck is gradually improving. No need to rush."],["今日は慎重めで。無理せず、のんびりが吉です。","Take it easy today. Rest and do not push yourself."],["ひと休みの日。深呼吸して、気楽にいきましょう。","Time for a little break. Breathe deeply and relax."]];

  const ENGLISH_EXTRA = {
    '特別リプレイ':'Special replay',
    '保存した写真':'Saved photos','作ったルーレット':'Created roulettes',
    'ルーレットの表示':'Roulette display','ランダム表示':'Random slideshow',
    '円盤ルーレット':'Photo wheel',
    'ルーレットを回す':'Spin the wheel','ストップ':'Stop','減速中…':'Slowing down…','準備中…':'Preparing…',
    'ルーレット・データ':'Roulette & data','動画から作る':'From video',
    'もらったファイルを開く':'Open received file','ルーレットを作る':'Create roulette',
    '動画を選ぶ・選び直す':'Choose or change videos',
    '新しい動画からルーレットを作る':'Create a roulette from a new video',
    '過去の動画からルーレットを作る':'Create a roulette from saved videos',
    '新しい動画':'New video','過去の動画':'Saved videos','準備中...':'Preparing…',
    '動画を管理':'Manage videos','動画を選択してください':'Select videos',
    '共有ファイルを準備しています…':'Preparing a share file…',
    '共有する内容':'Content to share','共有する':'Share',
    '思い出のルーレットを届ける':'Send a memory roulette',
    '⇧ HTMLを直接共有する':'⇧ Share HTML directly',
    '↓ LINE用ZIPを保存する':'↓ Save ZIP for LINE',
    'ファイルができました！':'Your file is ready!',
    'ひみつスタンプ':'Secret stamp','直前を取り消す':'Undo last action',
    '受け取ったファイルを選ぶ':'Choose received file',
    'このアプリが目指すこと':'What this app is about',
    '自分では選ばなかった一枚に、偶然出会う。':'Find a moment you would never have picked yourself.',
    'ルーレットを回してストップ':'Spin the roulette and stop',
    '残したい一瞬を保存':'Save a moment worth keeping',
    'もっと楽しむための便利な機能':'More ways to enjoy',
    '使ってみる':'Start playing',
    '抽出枚数や通常ルーレットなどの設定は、ホームの「設定」からまとめて変更できます。':'Change extraction and roulette options in Settings on the home screen.',
    '保存した動画を読み込んでいます…':'Loading saved videos…',
    'タップして今回使う動画を選びます。':'Tap the videos you want to use.',
    '日付で絞り込み（例 10/7）':'Filter by date (e.g. 10/7)',
    'このアプリが端末内に保存しているデータの概算です。保存済み動画の候補画像・特別リプレイ・サムネイル、ルーレット履歴、お気に入りを含みます。処理再開用の一時動画が残っている場合は、それも含めます。':'Estimated storage used by this app on this device, including frames, replays, thumbnails, history and favorites.',
    '設定は次に作るルーレットにも引き継がれます。':'These settings also apply to future roulettes.',
    'ルーレットの作り方と、保存データの管理をここにまとめています。設定は次に作るルーレットにも引き継がれます。':'Choose how to create a roulette and manage locally saved data. Settings carry over to new roulettes.',
    '動画1本から保存する一瞬の数です。通常は「おまかせ」がおすすめです。':'Number of moments to save per video. Automatic is recommended.',
    'ONにすると運勢を付けず、「どの一瞬で止まるか」だけを楽しみます。豪華演出も自動でOFFになります。':'Play without fortune results. Special effects will also be turned off.',
    '候補確認画面に運勢のサンプルを表示します。実際の運勢はSTOPしたときに写真とは独立して抽選します。':'Show sample fortunes on the preview. Actual fortunes are drawn independently when you stop.',
    'ブラウザの保存領域について':'About browser storage',
    '保存容量を確認しています…':'Checking storage…',
    '確認しています…':'Checking…',
    'バックアップを作成':'Create backup',
    'このアプリが目指すこと':'What this app is about',
  };

  Object.assign(ENGLISH_EXTRA,{
  "← ホーム": "← Home",
  "← 戻る": "← Back",
  "← 前": "← Previous",
  "次 →": "Next →",
  "← 前のコマ": "← Previous frame",
  "次のコマ →": "Next frame →",
  "← 前のページ": "← Previous page",
  "次のページ →": "Next page →",
  "今回選んだ動画だけでルーレットを作ります。過去の動画は混ざりません。": "Create a roulette using only the videos selected now. Previously saved videos will not be mixed in.",
  "1本でも複数本でも選べます。処理はブラウザ内だけで行い、元動画は外部へ送信しません。": "Choose one or more videos. Processing happens in your browser, and originals are never uploaded.",
  "今回使いたい動画だけを選んでください。1本でも複数本でも選べます。": "Select only the videos you want to use. You can choose one or several.",
  "写真アプリのようにサムネイルをタップして、今回使う動画を選べます。": "Tap thumbnails to choose videos, just as you would in a photo app.",
  "動画を読み込んでいます…": "Loading videos…",
  "🎴 選んだ動画でおみくじを引く": "🎴 Draw a fortune using selected videos",
  "自動で作成したおみくじ": "Automatically created fortune roulette",
  "この内容で遊ぶ": "Play with these moments",
  "もう一度抽出する": "Extract frames again",
  "保存名は自動で付けます。必要なら保存後に変更できます。": "A name is created automatically. You can rename it after saving.",
  "友達からもらったルーレット": "Roulettes from friends",
  "以前受け取ったルーレットを何度でも回せます。写真と抽選履歴はこのブラウザー内に保存します。": "Replay received roulettes at any time. Photos and results are saved in this browser.",
  "🎁 受信したHTML・ルーレットファイルを追加": "🎁 Add a received HTML or roulette file",
  "LINEでZIPを受け取った場合は、先に解凍して中のHTMLを選択してください。元動画・写真を運営側にアップロードしません。": "If you received a ZIP in LINE, extract it and select the HTML file inside. Original videos and photos are not uploaded to us.",
  "新しい形式も含め、作ったルーレットをこの端末に保存します。「遊ぶ」を押すと、そのルーレットをすぐにもう一度回せます。": "Your roulettes are saved on this device. Tap Play to spin one again.",
  "まだ作ったルーレットはありません。": "No roulettes yet.",
  "ルーレット": "Roulette",
  "きょうの運勢": "Today’s fortune",
  "タップでストップ": "Tap to stop",
  "画像をタップすると止まります": "Tap the image to stop",
  "⇧ このルーレットを共有する": "⇧ Share this roulette",
  "共有するルーレットを探す": "Choose a roulette to share",
  "過去のルーレットから選ぶ": "Choose from saved roulettes",
  "保存したルーレットのコマを見ながら選べます。次の画面でHTMLを直接共有するか、LINE用ZIPを保存できます。": "Browse frames of your saved roulettes, then share the HTML or save a ZIP for LINE.",
  "履歴を読み込んでいます…": "Loading history…",
  "写真・動画の生成はこの端末内で行います。LINEやSNSへの送信は自分で共有先を選ぶときだけです。": "Photos and videos are created on your device. Nothing is sent to LINE or social apps until you choose to share.",
  "ルーレットを友達に送る": "Send a roulette to a friend",
  "写真入りHTMLを送ります。受け取った人はHTMLを開き、既存の思い出ルーレットで遊べます。": "Send an HTML file containing the photos. The recipient opens it to play in the Memory Roulette app.",
  "LINEにはHTMLを直接添付できません。ZIPを保存し、LINEのトーク画面から「＋」→「ファイル」で送ってください。受信した人はZIPを解凍して中のHTMLを開きます。": "LINE cannot attach HTML directly. Save a ZIP and send it from LINE using + → File. The recipient extracts the ZIP and opens the HTML.",
  "共有する停止コマ": "Choose a stopping frame",
  "動画・写真では、選んだコマで停止します。実際に引いた結果を選ぶか、別のコマを指定できます。": "For videos and photos, you can choose a previous result or a different frame to stop on.",
  "過去に止まった結果から選ぶ": "Choose a previous result",
  "すべてのコマから選ぶ": "Choose from all frames",
  "ルーレットを共有する": "Share a roulette",
  "🎬 抽選からSTOPまでの動画": "🎬 Video from spin to stop",
  "🎲 相手も遊べるルーレットファイル": "🎲 Playable roulette file",
  "📦 LINE用ZIP（解凍してHTMLを開く）": "📦 ZIP for LINE (extract and open HTML)",
  "🧪 HTMLファイルを開いて遊ぶ（実験）": "🧪 Open and play with HTML (experimental)",
  "📷 停止した写真": "📷 Stopped photo",
  "🐻 ひみつスタンプで隠す（任意）": "🐻 Hide with a secret stamp (optional)",
  "スタンプを使わない場合は、加工前の写真を使います。共有のたびに選べます。": "If you do not add a stamp, the original image is used. You can decide each time you share.",
  "作成して保存・共有": "Create, save & share",
  "動画は音声なし。MP4非対応時はWebMになります。遊べるファイルには画像そのものが含まれます。": "Shared videos have no audio. If MP4 is unavailable, WebM is used. Playable files contain the images.",
  "📦 LINEでHTMLファイルを送れない場合はZIPを選択してください。中には写真入りHTMLが1つだけ入っています。受信者はZIPを解凍してHTMLを開き、既存アプリにつなぎます。Cloudflare認証が必要な場合は「既存アプリを開いて遊ぶ」で本体を別タブで開きます。ZIPを共有メニューから直接LINEへ渡す実験ができます。添付ができない環境では共有エラー内容を表示します。": "📦 If LINE cannot send HTML, choose ZIP. It contains a single HTML file with photos. Extract and open it to launch the app. On a protected development site you may need to open the app in another tab. Direct ZIP sharing is experimental and may fail on some devices.",
  "🧪 HTMLの直接共有はAndroidのLINEで失敗することがあります。写真はCloudflareにアップロードせず、HTML内からブラウザー内で既存アプリへ渡します。": "🧪 Direct HTML sharing may fail in LINE on Android. Photos are not uploaded to Cloudflare; the HTML passes them to the app inside the browser.",
  "お気に入りの写真を共有する": "Share a favorite photo",
  "選んだお気に入り写真を保存・共有できます。ひみつスタンプを使わない場合は、元の写真をそのまま使います。": "Save or share a favorite photo. Without a secret stamp, the original photo is used.",
  "写真を作成して保存・共有": "Create photo, save & share",
  "このまま保存するか、家族や友人に送るか選べます。": "Save it or send it to family and friends.",
  "画像をタップすると不透明なスタンプを置きます。顔以外の名前・場所・背景にも注意してください。自動顔検出ではありません。": "Tap the image to place an opaque stamp. Check names, locations and backgrounds too: this is not automatic face detection.",
  "種類": "Type",
  "大きさ": "Size",
  "0個のスタンプ": "0 stamps",
  "位置を全コマへコピー": "Copy position to all frames",
  "共有前に前後のコマを確認してください。動く顔や背景はスタンプからはみ出すことがあります。確認チェックは不要です。": "Check frames before and after sharing: moving faces or backgrounds may extend beyond a stamp.",
  "加工して保存・共有する": "Edit, save & share",
  "受け取ったルーレットで遊ぶ": "Play a received roulette",
  "HTMLまたは .mmrplay ファイルを選ぶと、受信履歴に保存して既存アプリで遊べます。": "Choose an HTML or .mmrplay file to save it in received history and play it in the app.",
  "🎁 受け取ったファイルを選ぶ": "🎁 Choose received file",
  "受信ルーレットはこのブラウザーの受信履歴に保存します。写真を外部サーバーにアップロードしません。": "Received roulettes are saved in this browser. Photos are not uploaded to an external server.",
  "今回引いた写真": "Drawn photos",
  "ルーレットで止まった写真と、おみくじの結果を見返せます。": "Review photos you stopped on and their fortune results.",
  "まだ履歴はありません。": "No history yet.",
  "履歴をクリア": "Clear history",
  "動画からGIFを作る": "Create GIF from video",
  "動画を選ぶだけでGIFを作れます。ルーレットを回す必要はありません。": "Create a GIF by choosing a video. No need to spin the roulette.",
  "追加した動画と抽出コマはルーレットの動画ライブラリにも保存されます。GIFを作っても、ルーレットの動画選択や作成履歴は変更されません。": "Imported videos and extracted frames are also added to the library. Creating a GIF does not change roulette selections or history.",
  "端末から新しい動画を選ぶ": "Choose a new video from device",
  "保存済みの動画・以前のルーレット": "Saved videos and previous roulettes",
  "保存した動画を読み込んでいます。": "Loading saved videos.",
  "GIFにする動画を1本選ぶ": "Choose one video for a GIF",
  "選択した動画": "Selected video",
  "別の動画を選ぶ": "Choose another video",
  "GIFの切り替え間隔（プレビュー・保存共通）": "GIF frame interval (preview and saved file)",
  "0.05秒ごと（最速・毎秒20コマ）": "Every 0.05 s (fastest · 20 fps)",
  "0.1秒ごと（毎秒10コマ）": "Every 0.1 s (10 fps)",
  "0.2秒ごと（おすすめ・毎秒5コマ）": "Every 0.2 s (recommended · 5 fps)",
  "0.5秒ごと（毎秒2コマ）": "Every 0.5 s (2 fps)",
  "1秒ごと（毎秒1コマ）": "Every 1 s (1 fps)",
  "選んだ動画からGIFを作る": "Create GIF from selected video",
  "🐻 ひみつスタンプでGIFを作る": "🐻 Create GIF with secret stamps",
  "GIFを保存して見る": "Save and view GIF",
  "「お気に入りに保存」で残した写真です。見返したい写真だけをここにまとめます。": "Photos saved as favorites appear here.",
  "まだ保存されていません。": "Nothing saved yet.",
  "8枚": "8 frames",
  "12枚": "12 frames",
  "15枚": "15 frames",
  "LAB設定：上のバージョン表示を5回タップで表示": "LAB settings: tap the version above five times",
  "隠し設定": "Hidden settings",
  "実験・確認用の設定です": "Experimental and diagnostic settings",
  "特徴度を表示する": "Show frame scores",
  "初期値はOFFです。写真の良し悪しではなく、動画内での「くっきり・珍しさ・変化」の違いを見る補助値です。": "Off by default. Scores reflect clarity, rarity and variation, not photo quality.",
  "豪華演出モード": "Special effects mode",
  "初期値はONです。結果札・光・粒子・効果音などの演出を切り替えます。通常ルーレット時は自動でOFFになります。": "On by default. Toggles fortune cards, lights, particles and sound. Automatically off in plain roulette mode.",
  "特別スローモーションを強制する（実験用）": "Force special slow motion (experimental)",
  "特別演出をすぐ確認したいときに使います。通常のおみくじでは確率どおりに動作します。": "For testing effects immediately. Normal play uses the standard probabilities.",
  "通常（確率どおり）": "Normal (standard probabilities)",
  "毎回スローモーション": "Always slow motion",
  "特大吉を毎回表示": "Always extra-special luck",
  "大逆転大吉を毎回表示": "Always surprise great luck",
  "拡張共有機能を表示": "Show advanced sharing",
  "動画・画像の共有、停止コマ選択、ひみつスタンプなど旧共有機能を表示します。通常はOFFです。": "Show legacy video/image sharing, frame selection and secret stamps. Normally off.",
  "この端末のアプリデータを完全初期化": "Completely reset app data on this device",
  "思い出デッキ・保存済みルーレット・お気に入り・LAB設定・キャッシュをこの端末から削除します。元に戻せません。": "Deletes saved video frames, roulettes, favorites, LAB settings and cache from this device. This cannot be undone.",
  "完全初期化": "Full reset",
  "これは参考情報です。このアプリ専用の容量ではなく、同じサイト由来の別データを含む場合があります。端末全体の使用量や空き容量でもありません。": "For reference only. These values may include data from the same origin, and do not indicate total device storage or free space.",
  "元動画そのものは保存しません。候補画像と特別リプレイ用の短い連続コマを端末内へ保存します。継続利用する場合は定期的なデッキの書き出しがおすすめです。": "Original videos are not stored. Selected frames and short special replay sequences are stored locally. Regularly export a backup.",
  "写真を撮るとき、私たちは笑顔やきれいに写った「いい瞬間」を残そうとします。でも動画には、その間の半目や動きの途中、思いがけない表情まで、たくさんの一瞬が残っています。": "When we take photos, we try to save the perfect smile. But videos capture everything in between: half-closed eyes, movement and unexpected expressions.",
  "そんな普通なら写真にしなかった一瞬をルーレットで偶然引き、「こんな顔してたんだ」「こんな一瞬あったんだ」と家族や身近な人と楽しむ。さらにその一枚におみくじを重ね、今日だけの結果にする。それが、このアプリの中心にある体験です。": "The roulette lets you discover moments you would not normally save as photos, then enjoy them with family and friends. Pair a surprise frame with a fortune for a result unique to today.",
  "まずはホームの「新しい動画から作る」「過去の動画から作る」の": "On the home screen, choose",
  "どちらか一方": "one",
  "を選びます。どちらもそのままルーレットで遊べます。動画はブラウザ内で処理し、元動画を外部へ送信しません。": "of the new or saved video options. Either leads directly to play. Videos stay in your browser and are never uploaded.",
  "ホームの「新しい動画から作る」で端末の動画を1本または複数本選びます。動画から一瞬を切り出したら、そのままルーレットへ進みます。取り込んだ動画の候補画像は、次回以降も使えます。": "Choose one or more videos from your device. The app extracts moments for the roulette, and saves candidate frames for later.",
  "思い出動画を追加": "Add memory videos",
  "📹 動画を複数選択": "📹 Choose multiple videos",
  "元動画は外部へ送信しません": "Original videos are not uploaded",
  "ホームの「過去の動画から作る」では、以前取り込んだ動画がサムネイルで並びます。今回使いたい動画をタップして選び、「選んだ動画でおみくじを引く」を押します。新しく動画を取り込む必要はありません。": "Previously imported videos appear as thumbnails. Select the ones you want, then tap Draw a fortune using selected videos. No need to import them again.",
  "選んだ動画でおみくじを引く": "Draw a fortune using selected videos",
  "複数の動画から集めた一瞬が次々に切り替わります。好きなタイミングでタップしてストップ。同じ一瞬は、原則としてデッキを一巡するまで結果として再登場しません。": "Moments from your videos cycle past. Tap to stop whenever you like. A selected frame generally does not repeat until you have gone through the deck.",
  "この見本もタップできます": "You can tap this demo too",
  "止まった写真は履歴にたまります。きれいさに関係なく、「この一瞬を残したい」と思った写真を「お気に入り」に保存できます。": "Stopped frames are kept in history. Save moments you love to Favorites, whether they look perfect or not.",
  "🌟 大吉": "🌟 Great luck",
  "♡ お気に入り": "♡ Favorite",
  "↓ 画像保存": "↓ Save image",
  "✨ 特別運勢「特大吉」": "✨ Special fortune: Extra-special luck",
  "ときどき、特別な運勢とリプレイが登場": "Sometimes a special fortune brings an instant replay",
  "おみくじでは、": "In fortune mode,",
  "大凶以外で低い確率で「特大吉」": "an extra-special fortune can rarely appear except after bad luck",
  "が出て、特別リプレイが始まることがあります。特大吉は写真の良し悪しを評価するものではなく、その場でしか引けなかった一瞬との出会いそのものを特別な運勢として扱います。": "and start a special replay. It is not a judgment on photo quality, but a celebration of this unexpected moment.",
  "大凶では、一定確率で「大逆転大吉」": "After the lowest fortune, there is a chance of a surprise reversal",
  "が発生します。どちらも写真とは別の賞ではなく、その回のおみくじ結果です。": "Both are fortune outcomes, not awards for the photos.",
  "止めて終わりではなく、気に入った一瞬を残したり、動きとしてまとめたりできます。": "You can do more than stop: save favorite frames and make moving GIFs.",
  "🎴 おみくじモード": "🎴 Fortune mode",
  "止まった一瞬と一緒に今日の運勢やメッセージを楽しむ基本モードです。特別なリプレイが現れることもあります。": "Pair a stopped moment with a fortune and a message. Special replays may sometimes appear.",
  "🎯 通常ルーレット": "🎯 Plain roulette",
  "運勢を付けず、純粋に「どの瞬間で止まるか」だけを楽しみたいときに使えます。": "Enjoy the surprise of where the roulette stops, without a fortune.",
  "🖼 お気に入り": "🖼 Favorites",
  "気に入った停止写真をアプリ内に残せます。あとから「開く」で大きく見返せます。": "Keep stopped photos in the app and open them later at a larger size.",
  "↓ 画像をダウンロード": "↓ Download image",
  "「お気に入り」に残した写真は、コレクションから端末へ画像ファイルとして保存できます。": "Save favorite photos to your device from the collection.",
  "🎞 動画からGIFを作る": "🎞 Create GIF from videos",
  "ホームの「GIF作成」から保存済み動画や新しい動画を選び、ルーレットを回さずに抽出コマを時間順にGIFへ。0.05・0.1・0.2・0.5・1秒ごとの切り替えを選べます。標準は0.2秒です。": "Choose a saved or new video from Create GIF. Frames appear in chronological order without spinning. Frame intervals range from 0.05 to 1 second; default is 0.2 second.",
  "💾 デッキのバックアップ": "💾 Back up your deck",
  "育てたデッキはファイルに書き出して復元できます。機種変更やブラウザデータ消去への備えに使えます。": "Export and restore your deck when changing devices or clearing browser data.",
  "大吉！": "Great luck!",
  "自動で作成した思い出ルーレット": "Automatically created memory roulette",
  "保存名は自動で付けます。必要なら保存後に変更できます。特徴度は写真の良し悪しを決める点数ではなく、候補どうしの違いを見るための補助値です。": "A name is generated automatically and can be changed later. Frame scores show differences between candidate frames, not photo quality.",
  "動画の長さを取得できません": "Could not determine the video duration",
  "特徴度はAIを使わず、動画内の相対差から算出しています。くっきり45%・珍しさ35%・前後からの変化20%。写真の良し悪しを採点する値ではありません。": "Frame scores are calculated without AI: clarity 45%, rarity 35%, and changes over time 20%. They do not rate photo quality.",
  "動画を読み込んでいます...": "Loading video…",
  "候補の特徴を整理し、運勢サンプルを準備しています...": "Analyzing candidate frames and preparing sample fortunes…",
  "動画を処理できませんでした": "Could not process the video",
  "動画を処理できませんでした: ": "Could not process the video: ",
  "受信ルーレットの画像が不正です。": "The received roulette contains invalid images.",
  "受信データが48MBを超えています。": "Received data exceeds 48 MB.",
  "端末への保存結果を確認できませんでした。": "Could not verify that the data was saved on this device.",
  "受信ルーレットが不正です。": "Invalid received roulette.",
  "件の受信ルーレット": " received roulettes",
  "件のルーレットが保存されています。": " roulettes are saved.",
  "受け取ったルーレットはまだありません。HTMLファイルを開くか、下から追加してください。": "No received roulettes yet. Open an HTML file or add one below.",
  "友達からのルーレット": "Roulette from a friend",
  "コマ": "frames",
  "遊ぶ": "Play",
  "画像が保存されていません。": "No images were saved.",
  "再生できません：": "Cannot play: ",
  "削除": "Delete",
  "受信したルーレットと抽選履歴を端末から削除しますか？": "Delete the received roulette and its draw history from this device?",
  "削除できませんでした：": "Could not delete: ",
  "件のルーレット": " roulettes",
  "まだありません": "None yet",
  "このルーレットの元になった保存済み動画データが削除されているため、再生できません。履歴自体は削除できます。": "This roulette cannot be played because its saved source video frames were deleted. The history record can still be removed.",
  "削除しますか？": "Delete?",
  "この瞬間！": "This moment!",
  "画像をもう一度タップすると再開します": "Tap the image again to restart",
  "タップで再開": "Tap to restart",
  "画像をタップすると再開します": "Tap the image to restart",
  "0個の一瞬をバックアップから復元しました。": "Restored zero moments from backup.",
  "個の一瞬をバックアップから復元しました。": " moments restored from backup.",
  "バックアップの動画IDが既存データと重複しています": "Video ID in the backup duplicates existing data.",
  "バックアップのフレームIDが既存データと重複しています": "Frame ID in the backup duplicates existing data.",
  "バックアップのリプレイIDが既存データと重複しています": "Replay ID in the backup duplicates existing data.",
  "一時保存できませんでした": "Could not save temporary data.",
  "保存容量またはフレーム数の上限により、バックアップをすべて復元できません": "The backup could not be fully restored because storage or frame count limits were reached.",
  "バックアップを復元しています… ": "Restoring backup… ",
  "個の一瞬を準備": " moments prepared",
  "復元中にデータが変更されました。もう一度お試しください": "Data changed during restore. Please try again.",
  "バックアップの確定に失敗しました": "Could not finalize the backup restore.",
  "思い出おみくじデッキをすべて削除しますか？ お気に入りや保存済みルーレット履歴は削除しません。": "Delete all saved video frames? Favorites and saved roulette history will not be deleted.",
  "思い出デッキを削除しました。": "Saved video frames deleted.",
  "復元できませんでした: ": "Could not restore: ",
  "シーン分析中です。OSに停止されない限り処理を続け、停止された場合も完了済みデータは残ります。": "Analyzing video scenes. Processing continues unless the OS stops it; completed data will remain saved.",
  "デッキ情報を読み込めませんでした。": "Could not load saved video information.",
  "特大吉の特別リプレイです。": "Extra-special luck replay.",
  "この一瞬をスローでもう一度。": "See this moment again in slow motion.",
  "思いがけない一瞬まで、今日のおみくじの結果です。": "Even this unexpected moment is part of today's fortune.",
  "大凶……と思いきや、この一枚で全部ひっくり返りました。": "It looked like terrible luck, but this photo changed everything.",
  "運勢は大凶。でも、この一瞬を見たら今日は最高の日。": "The fortune was terrible, but this moment makes it a great day.",
  "まさかの大逆転。最後に残ったのは、とびきり幸せな一枚。": "What a turnaround! One very happy photo remains.",
  "大凶かと思ったら…": "Just when you thought it was the worst luck…",
  "大凶から一転。今日は大逆転大吉！": "An amazing turnaround from terrible luck to great luck!",
  "大凶……": "Terrible luck…",
  "……あれ？": "…wait?",
  "まだ終わっていません": "It's not over yet",
  "大逆転大吉！": "Surprise great luck!",
  "特大吉！": "Extra-special luck!",
  "🎬 ムービー保存": "🎬 Save video",
  "スローモーション用の連続コマを準備できませんでした。元動画の処理完了後にもう一度お試しください": "Could not prepare frames for slow motion. Try again after processing the original video.",
  "動画の録画に失敗しました": "Could not record the video.",
  "生成したムービーが空でした": "The generated video is empty.",
  "生成したムービーの形式を確認できませんでした": "Could not identify the generated video format.",
  "動画の再生時間を確定できませんでした。ページを再読み込みしてください": "Could not determine video duration. Reload the page.",
  "動画の末尾を保存できませんでした。もう一度お試しください": "Could not save the end of the video. Please try again.",
  "保存先を選択中…": "Choosing a save location…",
  "指定したフォルダへ保存しました。": "Saved to the selected folder.",
  "ダウンロードを開始しました。": "Download started.",
  "保存できませんでした": "Could not save.",
  "↓ ムービーをもう一度保存": "↓ Save the video again",
  "このブラウザではムービー保存を利用できません": "Video saving is not supported in this browser.",
  "動画フォルダ（Movies）への保存をおすすめします。": "Saving to the Movies folder is recommended.",
  "🎬 生成中…": "🎬 Generating…",
  "ムービーを準備しています…": "Preparing video…",
  "ムービー生成中… ": "Generating video… ",
  "ムービーを作成できませんでした": "Could not create the video.",
  "♡ お気に入りに保存": "♡ Save to favorites",
  "保存中…": "Saving…",
  "✓ 保存しました": "✓ Saved",
  "GIFを指定したフォルダに保存しました。": "GIF saved to the selected folder.",
  "GIFのダウンロードを開始しました。": "GIF download started.",
  "GIFを保存できませんでした。": "Could not save the GIF.",
  "GIFには同じ元動画のコマが2枚以上必要です。": "A GIF needs at least two frames from the same source video.",
  "GIFを作れませんでした: ": "Could not create GIF: ",
  "画像を読み込めません": "Could not load the image.",
  "GIF生成が中断されました": "GIF generation was interrupted.",
  "元に戻す": "Undo",
  "お気に入りの削除を取り消す": "Undo removing from favorites",
  "お気に入りから削除": "Remove from favorites",
  "枚保存": " photos saved",
  "キャンセルしました": "Canceled",
  "さくらピンク": "Cherry blossom pink",
  "ミルクホワイト": "Milk white",
  "おひさまイエロー": "Sunshine yellow",
  "そらいろ": "Sky blue",
  "若葉グリーン": "Spring green",
  "ラベンダー": "Lavender",
  "ももいろ": "Peach pink",
  "クリーム": "Cream",
  "ほっぺ": "Cheeks",
  "おてて": "Little hands",
  "あんよ": "Little feet",
  "口もと": "Mouth",
  "まつげ": "Eyelashes",
  "つむじ": "Hair whorl",
  "おなか": "Tummy",
  "横顔": "Profile",
  "にぎった手": "Closed hand",
  "ちいさな指": "Tiny fingers",
  "ふわふわの髪": "Soft hair",
  "眠そうな目": "Sleepy eyes",
  "共有データが大きすぎます（48MB上限）。動画数を減らしてください。": "Share data is too large (48 MB limit). Use fewer videos.",
  "保存先を選んで保存": "Choose where to save",
  "LINEなどへ直接共有": "Share directly to LINE or another app",
  "送るために端末へ保存": "Save to device to send",
  "ZIP/HTMLファイルのみをAndroidの共有画面へ渡します。LINEなどの送り先を選択してください。添付されるかは相手のアプリに依存します。": "Only the ZIP/HTML file will be passed to Android's share sheet. Select LINE or another destination. The receiving app decides whether the attachment is accepted.",
  "送信する前に共有内容と送信相手を確認してください。": "Check the content and recipient before sending.",
  "このブラウザーではファイルの直接共有が利用できません。Chromeで開き直してお試しください。端末保存も利用できます。": "Direct file sharing is unavailable here. Try opening in Chrome, or save the file to your device.",
  "ファイルができました。保存か送信を選んでください。": "File ready. Choose to save or send.",
  "選択したフォルダへ保存しました。": "Saved to the selected folder.",
  "端末へ保存できませんでした。": "Could not save to this device.",
  "このブラウザーからのファイル直接共有は利用できません。Android Chromeで開き直してお試しください。": "Direct sharing from this browser is unavailable. Try opening in Android Chrome.",
  "選択したフォルダへ保存しました。LINEからファイルを添付してください。": "Saved to the selected folder. Attach the file from LINE.",
  "ダウンロードを開始しました。LINEからファイルを添付してください。": "Download started. Attach the file from LINE.",
  "思い出ルーレットおみくじ": "Memory Roulette Fortune",
  "自分の動画から作った思い出ルーレット ": "Memory roulette made from my video ",
  "ブラウザーの共有権限や画面の制限が考えられます。Chromeで開いてお試しください。": "Browser sharing permissions or screen restrictions may be blocking this. Try Chrome.",
  "ファイルを共有先に引き渡せなかった可能性があります。": "The file may not have been delivered to the receiving app.",
  "ブラウザーがこのファイル形式を共有対象として受け付けていません。": "The browser does not allow sharing this file type.",
  "共有先のアプリやブラウザーがファイルを受け取れなかった可能性があります。": "The receiving app or browser may have rejected the file.",
  "ZIP/HTMLの直接共有に失敗しました（": "Direct ZIP/HTML sharing failed (",
  " 詳細: ": " Details: ",
  "共有するルーレットを選んでください。": "Choose a roulette to share.",
  "共有できるコマ数は2〜120枚です。動画の選択数を減らしてください。": "A shared roulette must contain 2–120 frames. Select fewer videos.",
  "共有できない画像形式が含まれます。": "Unsupported image format in the shared roulette.",
  "画像が大きすぎます。共有対象を減らしてください。": "Images are too large. Select fewer items.",
  "共有ファイルが48MBを超えます。": "The shared file exceeds 48 MB.",
  "安全な生成にはHTTPSが必要です。": "HTTPS is required to create this file securely.",
  "HTMLが48MBを超えています。共有枚数を減らしてください。": "The HTML exceeds 48 MB. Select fewer frames.",
  "ZIPファイルが48MBを超えます。コマ数を減らしてください。": "The ZIP exceeds 48 MB. Select fewer frames.",
  "このブラウザーはHTMLの直接共有に対応していません。ZIPは保存できます。": "This browser cannot share HTML directly. You can save the ZIP.",
  "準備完了。HTMLは直接共有、LINEにはZIPを保存して添付してください。": "Ready. Share HTML directly, or save a ZIP to attach in LINE.",
  "共有ファイルを作成できませんでした：": "Could not create the share file: ",
  "この環境ではHTMLファイルを直接共有できません。": "HTML files cannot be shared directly in this environment.",
  "共有先でHTMLファイルの送信を確認してください。": "Check the sending app to confirm the HTML was attached.",
  "直接共有に失敗しました（": "Direct sharing failed (",
  "共有先で拒否された可能性があります。": "The receiving app may have rejected the file.",
  "ZIPを保存しました。LINEのトークから「＋」→「ファイル」で添付してください。": "ZIP saved. In a LINE chat, use + → File to attach it.",
  "ZIP保存失敗：": "ZIP save failed: ",
  "処理できませんでした。": "Could not process the file.",
  "画像を読めませんでした。": "Could not read the image.",
  "加工画像を生成できません": "Could not generate the edited image.",
  "画像を加工中 ": "Processing image ",
  "今日の運勢": "Today's fortune",
  "動画には2枚以上のコマが必要です。": "The video needs at least two frames.",
  "動画生成に対応していないブラウザです。": "Video creation is unsupported in this browser.",
  "このブラウザはMP4・WebMの録画に対応していません。": "This browser cannot record MP4 or WebM.",
  "録画中にエラーが発生しました。": "An error occurred while recording.",
  "結果発表": "The result",
  "ルーレット抽選中…": "Spinning roulette…",
  "自分では選ばなかった一枚に出会う": "Discover a moment you would not have chosen",
  "動画データが空です。": "Video data is empty.",
  " ・ 元動画 ": " · Original video ",
  "秒": "seconds",
  "ページ": "page",
  "コマ目を停止位置にする": "Set this frame as the stopping point",
  "コマ目": "frame",
  "過去の停止結果": "Previous stopping result",
  "停止結果：": "Stopped on: ",
  "このコマで停止します": "Stop at this frame",
  "現在遊んでいるルーレットです。初期選択はこの画面を開いたときのコマです。": "This is the roulette currently being played. The default choice is the frame shown when this screen opened.",
  "履歴から選んだルーレットです。過去の結果と全コマから停止位置を選べます。": "This roulette was selected from history. Choose a stopping point from previous results or all frames.",
  "現在のルーレット：": "Current roulette: ",
  "選んだルーレット：": "Selected roulette: ",
  "コマ）": "frames)",
  "共有するルーレットがありません。ホームの「共有する」から履歴を選択してください。": "No roulette is selected. Open Share on the home screen and choose one from history.",
  "動画を作成して保存・共有": "Create video, save & share",
  "遊べるファイルを作成して保存・共有": "Create playable file, save & share",
  "ZIPを作成して保存・共有": "Create ZIP, save & share",
  "HTMLを作成して保存・共有": "Create HTML, save & share",
  "保存済みのルーレットを探しています…": "Finding saved roulettes…",
  "共有できるルーレットがありません。ホームから動画を選び、ルーレットを作ってください。": "No roulette is available to share. Choose videos on the home screen and create a roulette.",
  "件のルーレット。写真を確認して選んでください。": " roulettes. Check the photos and choose one.",
  "通常ルーレット": "Plain roulette",
  "選ぶ ›": "Choose ›",
  "選んだルーレットを読み込んでいます…": "Loading the selected roulette…",
  "元画像が見つかりません。": "Source image not found.",
  "読み込めませんでした：": "Could not load: ",
  "履歴を読み込めませんでした。ホームの「履歴」も確認してください。": "Could not load history. Check History on the home screen.",
  "選んだルーレットを共有する": "Share selected roulette",
  "写真データはこの端末内で共有ファイルにまとめます。": "Photos are bundled into a share file on this device.",
  "受け取った人がルーレットを回せます。ZIPの場合は受信側で解凍してHTMLを開いてください。": "Recipients can play the roulette. If you share ZIP, they must extract it and open the HTML inside.",
  "抽選動画": "Roulette video",
  "停止写真": "Stopped photo",
  "遊べるルーレット": "Playable roulette",
  "写真を作成できませんでした。": "Could not create the photo.",
  "スタンプ付きの遊べるルーレット": "Playable roulette with stamps",
  "スタンプ付きLINE用ZIP": "LINE ZIP with stamps",
  "LINE用ZIPルーレット": "LINE ZIP roulette",
  "スタンプ付きHTMLルーレット（実験）": "HTML roulette with stamps (experimental)",
  "HTMLルーレット（実験）": "HTML roulette (experimental)",
  "抽選動画を作成しています。画面を閉じずにお待ちください。": "Creating the roulette video. Keep this screen open.",
  "スタンプ付きの": "With stamps: ",
  "抽選動画（": "Roulette video (",
  "スタンプ付きの写真": "Photo with stamps",
  "共有形式を選んでください。": "Choose a sharing format.",
  "2コマ以上のルーレットが必要です。": "The roulette needs at least two frames.",
  "対応していないルーレットファイルです。": "Unsupported roulette file.",
  "画像枚数が不正です。": "Invalid frame count.",
  "画像に不正なデータがあります。": "Invalid image data.",
  "共有データが大きすぎます。": "Shared data is too large.",
  "共有ルーレット": "Shared roulette",
  "結果を見る": "View result",
  "このときの結果です。": "Result from this draw.",
  "履歴を表示中。写真をタップするとルーレットを再開します": "Viewing history. Tap the photo to restart the roulette."
});

  Object.assign(ENGLISH_EXTRA, {
  "結果へ戻る": "Back to result",
  "結果に戻る": "Back to result",
  "GIFを閉じる": "Close GIF",
  "作成したGIF": "Created GIF",
  "画像を閉じる": "Close photo",
  "保存したお気に入り写真": "Saved favorite photo",
  "特別な一瞬": "A special moment",
  "このブラウザはムービー保存に対応していません": "This browser does not support saving movies",
  "リプレイする写真がありません": "No photo is available for replay",
  "Canvasを準備できませんでした": "Could not prepare the canvas",
  "このブラウザはムービーの録画形式に対応していません": "This browser does not support the movie recording format",
  "旧履歴": "Old history",
  "保存済み動画": "Saved videos",
  "検索条件に合う動画はありません。": "No videos match your search.",
  "保存した動画がありません。新しい動画を選んでください。": "No saved videos. Choose a new video.",
  "GIFにできる過去の動画はありません。旧履歴の1コマだけでは作れません。GIFには2枚以上の保存画像が必要です。": "At least two saved frames are needed to make a GIF. Older one-frame history cannot be used.",
  "過去の動画がありません。新しい動画を選んでください。": "No saved videos. Choose a new video.",
  "1本ずつGIFにします。別の動画のコマは混ぜません。": "Each video becomes a separate GIF. Frames from different videos are not mixed.",
  "選んだ動画のコマを読み込んでいます…": "Loading selected video's frames…",
  "選択した動画のコマ": "Selected video frames",
  "この動画のコマを読み込めませんでした。別の動画を選んでください。": "Could not load frames from this video. Choose another.",
  "保存した動画の一覧を読み込めませんでした。画面を開き直してください。": "Could not load saved videos. Reopen this page.",
  "動画からGIF用のコマを抽出しています。端末内で処理します…": "Extracting GIF frames on your device…",
  "新しく取り込める動画がありませんでした。保存済みの動画を選ぶか形式を確認してください。": "No new videos could be imported. Choose a saved video or check the file format.",
  "動画を取り込めませんでした: ": "Could not import video: ",
  "まだ保存した動画はありません。上の「新しい動画からルーレットを作る」から追加してください。": "No saved videos yet. Add one using Create from a new video above.",
  "動画がありません": "No videos",
  "動画が選択されていません": "No videos selected",
  "まだ保存した動画はありません": "No saved videos yet",
  "ルーレットに使う動画を選んでください。": "Choose videos for your roulette.",
  "追加した動画がここに並びます。": "Imported videos appear here.",
  "よく遊んだ動画": "Most played videos",
  "管理を終了": "Finish managing",
  "削除したい動画の × を押してください。ルーレット用の選択は一時停止しています。": "Tap × on the video to remove it. Roulette selection is temporarily disabled.",
  "前回中断した動画のシーン分析を自動再開しています…": "Automatically resuming interrupted scene analysis…",
  "前回中断した動画の分析を再開しました。仕上げ処理を続けています。": "Video analysis resumed. Finishing processing…",
  "保存できる一瞬を見つけられませんでした": "No usable moments found",
  "デッキの保存容量が上限に達しています": "The saved deck has reached its storage limit",
  "保存データを管理": "Manage saved data",
  "管理を閉じる": "Close management",
  "保存済み動画 ": "Saved videos: ",
  "ルーレット履歴 ": "Roulette history: ",
  "お気に入り ": "Favorites: ",
  "処理中の一時動画 ": "Temporary video: ",
  "このブラウザでは詳細情報を取得できません。": "Storage details are unavailable in this browser.",
  "同じサイト由来の保存領域：": "Same-site storage: ",
  "保存保護：": "Persistent storage: ",
  "有効": "Enabled",
  "通常": "Standard",
  "内訳：": "Breakdown: ",
  "シーン分析未完了 ・ 同じ動画を選ぶと分析を再開": "Scene analysis incomplete · Select the video again to resume",
  "シーン分析を自動再開中": "Resuming scene analysis automatically",
  "シーン分析の再開待ち": "Scene analysis waiting to resume",
  "選択済み": "Selected",
  "選択する": "Select",
  "検索条件に合う動画がありません。": "No matching videos.",
  "元動画": "Source video",
  "思い出ルーレットおみくじ バックアップ": "Memory Roulette fortune backup",
  "バックアップする思い出デッキがありません。": "There is no saved deck to back up.",
  "バックアップを書き出しています… ": "Exporting backup… ",
  "バックアップを書き出しました。": "Backup exported.",
  "受信機能が利用できません": "Receiving is unavailable",
  "無効な画像": "Invalid image",
  "48MB以下のルーレットファイルを選んでください。": "Choose a roulette file under 48 MB.",
  "受信したルーレットを保存しています…": "Saving received roulette…",
  "対応するルーレットHTMLではありません。": "Unsupported roulette HTML file.",
  "受信機能が利用できません。": "Receiving is unavailable.",
  "スタンプ加工は120コマまでです。動画を少なく選択してください。": "Stamp editing supports up to 120 frames. Select fewer videos.",
  "先にGIF画面で2コマ以上の動画を選択してください。": "First select a video with at least two frames on the GIF page.",
  "GIFのコマ数が120枚を超えます。": "The GIF exceeds 120 frames.",
  "お気に入りから選んだ写真を共有します。": "Share a favorite photo.",
  "スタンプなしで共有できます。必要なときだけ「ひみつスタンプ」を選んでください。": "You can share without stamps. Choose Secret stamp only when needed.",
  "お気に入り写真を選び直してください。": "Choose a favorite photo again.",
  "お気に入りの写真": "Favorite photo",
  "GIF編集画面を開けませんでした。ページを再読み込みしてください。": "Could not open the GIF editor. Reload the page.",
  "ひみつスタンプ：": "Secret stamp: ",
  "スタンプ付き": "With stamps",
  "ZIPルーレット": "ZIP roulette",
  "HTMLルーレット": "HTML roulette",
  "写真": "Photo",
  "を作成して保存・共有": " · create, save & share",
  "スタンプで顔を隠せます。顔以外の背景や服装も確認してください。": "Stamps can hide faces. Check the background and clothing too.",
  "このスタンプ位置をすべてのコマにコピーします。人物が動くと顔が露出することがあります。全コマを必ず確認してください。": "Copy stamps to all frames. Check every frame for moving subjects.",
  "編集する画像を選んでください。": "Choose an image to edit.",
  "まずスタンプを置いてください。": "Place a stamp first.",
  "共有する停止コマにスタンプを置いてください。": "Place a stamp on the stopping frame.",
  "スタンプ付きの写真（選択した停止コマ）": "Stamped photo (selected stop frame)",
  "GIF書き出し機能が利用できません。": "GIF export is unavailable.",
  "スタンプ付きGIF": "Stamped GIF",
  "バックアップに不正な画像があります": "Backup contains an invalid image",
  "バックアップに破損した画像があります": "Backup contains a damaged image",
  "バックアップに不正なリプレイがあります": "Backup contains an invalid replay",
  "対応する思い出デッキのバックアップではありません": "Unsupported Memory Roulette deck backup",
  "バックアップに不正な動画IDがあります": "Backup contains an invalid video ID",
  "バックアップに不正なフレームがあります": "Backup contains an invalid frame",
  "対応するストリーム形式のバックアップではありません": "Unsupported streaming backup format",
  "バックアップの件数情報が不正です": "Backup has an invalid record count",
  "バックアップの終端後に余分なデータがあります": "Backup has unexpected extra data",
  "バックアップ内に不正なレコードがあります": "Backup contains an invalid record",
  "バックアップのレコード順序が不正です": "Backup records are out of order",
  "バックアップに重複・不正な動画IDがあります": "Backup contains duplicate or invalid video IDs",
  "バックアップに重複・不正なフレームがあります": "Backup contains duplicate or invalid frames",
  "バックアップに重複・不正なリプレイがあります": "Backup contains duplicate or invalid replays",
  "バックアップに不明なレコードがあります": "Backup contains an unknown record",
  "バックアップのレコード件数が一致しません": "Backup record counts do not match",
  "バックアップが途中で切れているか、件数が一致しません": "Backup is incomplete or record counts do not match"
});

  Object.assign(ENGLISH_EXTRA, {
  "保存した思い出の写真": "Saved memory photo",
  "画像を保存しました": "Image saved",
  "GIFには2枚以上の保存画像が必要です。別の動画を選ぶか、新しい動画を追加してください。": "At least two saved frames are needed for a GIF. Choose another video or import a new one.",
  "保存済み：": "Saved: ",
  "保存済み動画": "Saved videos",
  "GIFにする動画を選んでください。": "Choose a video for the GIF.",
  "このアプリの保存データ：約": "Approximate app storage: ",
  " 使用 / 上限 約": " used / limit about ",
  "保存保護：": "Persistent storage: ",
  "シーン分析": "Scene analysis",
  "自動再開中": "Resuming automatically",
  "中断": "Interrupted",
  "削除": "Delete",
  "画像をダウンロード": "Download image",
  "保存中…": "Saving…",
  "前回中断した動画のシーン分析を自動再開しています…": "Resuming interrupted video analysis…",
  "元動画": "Source video",
  "結果へ戻る": "Back to result",
  "画像をもう一度タップすると再開します": "Tap the image again to restart",
  "履歴を表示中。写真をタップするとルーレットを再開します": "Showing history. Tap the photo to replay the roulette",
  "すべてのコマから選ぶ": "Choose from all frames",
  "作成したGIF": "Created GIF",
  "選択した動画のコマ": "Selected video frames",
  "保存した一瞬": "Saved moment",
  "シーン分析未完了": "Scene analysis incomplete",
  "この一枚をゆっくり表示します": "Showing this photo slowly",
  "選んだ動画": "Selected videos",
  "保存した動画の数": "Number of saved videos",
  "0個のスタンプ": "0 stamps",
  "動画の並び順": "Video sort order",
  "選択した動画の数": "Number of selected videos",
  "選んだ動画からGIFを作る": "Create GIF from selected video",
  "円盤ルーレット": "Photo wheel",
  "エンゲージメント登場数": "Number of appearances"
});


  Object.assign(ENGLISH_EXTRA,{"継続して使う場合は、ホーム画面への追加とデッキのバックアップがおすすめです。":"To keep using this app, add it to your home screen and back up your deck.","本は追加済みのためスキップしました。":" videos skipped because they were already added.","本は処理できませんでした。":" videos could not be processed.","一瞬を探しています":"Finding moments","ルーレットを準備しています":"Preparing roulette","思い出おみくじ":"Memory Fortune","動画の一瞬":"Video moments","写真はすでに保存しています":"Photo already saved","やり直す":"Try again"});

  Object.assign(ENGLISH_EXTRA, {
    "日本語": "Japanese",
    "5回タップでラボ設定": "Tap five times for Lab settings",
    "5回タップでLAB設定を表示": "Tap five times to show Lab settings",
    "5回タップでLAB設定を表示・非表示": "Tap five times to toggle Lab settings",
    "ルーレットの作り方を選ぶ": "Choose how to create a roulette",
    "使い方を閉じる": "Close instructions",
    "説明用ルーレットを止める": "Stop the demo roulette",
    "受信したルーレットの一覧": "Received roulettes",
    "選択した停止コマのプレビュー": "Preview of the selected stopping frame",
    "スタンプを配置する画像": "Image for stamp placement",
    "GIFに使う動画を選ぶ方法": "Choose where to get a video for the GIF",
    "日付・動画名で検索": "Search by date or video name",
    "GIFにする動画を検索": "Search for a video to turn into a GIF",
    "選んだ動画のコマ見本": "Sample frames from the selected video",
    "GIFに使う全コマの切り替えプレビュー": "Animated preview of all GIF frames",
    "保存したGIFと同じ内容です": "This preview shows the frames in the saved GIF",
    "端末に保存した画像と同じ写真です": "This is the photo saved to your device",
    "✓ 画像を保存しました": "✓ Image saved",
    "写真を見る": "View photo",
    "写真を全画面で見る": "View photo full screen",
    "思い出の写真": "Memory photo",
    "写真表示を閉じる": "Close photo viewer",
    "タップで戻る": "Tap to go back",
    "開く": "Open",
    "名前変更": "Rename",
    "保存": "Save",
    "削除しました": "Deleted",
    "この画面を離れるまで取り消せます": "You can undo this until you leave this screen",
    "↻ リプレイ": "↻ Replay",
    "🎬 この演出をムービー保存": "🎬 Save this sequence as a video",
    "旧履歴": "Older history",
    "スタンプ付きの抽選動画": "Stamped roulette video",
    "MP4 動画": "MP4 video",
    "WebM 動画": "WebM video",
    "GIF 画像": "GIF image",
    "PNG 画像": "PNG image",
    "JPEG 画像": "JPEG image",
    "WebP 画像": "WebP image",
    "保存先を選択できなかったため、通常のダウンロードを使用します。": "Could not choose a save location. Using the standard download instead.",
    "生成された動画形式が変わったため、正しい拡張子でダウンロードします。": "The video format changed. Downloading with the correct extension.",
    "選択したフォルダへの書き込みができず、通常のダウンロードに切り替えました。": "Could not write to the selected folder. Using the standard download instead.",
    "MP4の拡張ボックスが不正です": "Invalid extended MP4 box",
    "MP4のボックス長が不正です": "Invalid MP4 box length",
    "MP4の再生時間が不正です": "Invalid MP4 duration",
    "MP4の再生時間情報がありません": "MP4 duration metadata is missing",
    "MP4の動画トラック情報が不正です": "Invalid MP4 video track metadata",
    "MP4の再生時間を取得できませんでした": "Could not read the MP4 duration",
    "録画した動画の再生時間が予定と一致しません。再度お試しください": "The recording duration differs from the expected duration. Try again.",
    "動画の再生時間を正しく確認できませんでした。再度お試しください": "Could not verify video duration. Try again.",
    "思い出ルーレットおみくじ - 完全初期化": "Memory Roulette Fortune · Full reset",
    "この端末のアプリデータを完全初期化しています": "Resetting app data on this device",
    "履歴・保存データ・設定・キャッシュを削除しています…": "Deleting history, saved data, settings, and caches…",
    "完全初期化しました。最新版を開きます。": "Reset complete. Opening the latest version.",
    "ほぼ初期化しました。別タブでアプリを開いている場合は閉じて、もう一度このページを開いてください。": "Most data has been reset. Close other tabs running the app, then open this page again.",
    "初期化処理を続行しました。最新版を開きます。": "Reset attempted. Opening the latest version.",
    "この端末の「思い出ルーレットおみくじ」の思い出デッキ・保存済みルーレット・お気に入り・LAB設定・キャッシュをすべて削除します。元に戻せません。完全初期化しますか？": "Reset Memory Roulette Fortune on this device? This permanently deletes your deck, saved roulettes, favorites, Lab settings, and caches.",
    "このルーレットの元になった保存済み動画データが削除されているため、再生できません。履歴自体は削除できます。": "The saved video for this roulette was deleted. You can still delete the history entry.",
    "バックアップの動画IDが既存データと重複しています": "A video in the backup already exists on this device",
    "バックアップのフレームIDが既存データと重複しています": "A frame in the backup already exists on this device",
    "バックアップのリプレイIDが既存データと重複しています": "A replay in the backup already exists on this device",
    "保存容量またはフレーム数の上限により、バックアップをすべて復元できません": "The storage or frame limit prevents restoring the entire backup",
    "保存できる一瞬を見つけられませんでした": "No moments suitable for saving were found",
    "デッキの保存容量が上限に達しています": "The deck has reached its storage limit",
    "詳細を確認できませんでした。": "No further details were available.",
    "{0}（{1}コマ）": "{0} ({1} frames)",
    "{0}、{1}コマからGIFを作る": "Create a GIF from {1} frames in {0}",
    "「{0}」のGIFを作っています… {1}/{2}": "Creating a GIF from “{0}”… {1}/{2}",
    "「{0}」の全{1}コマからGIFを作っています… {2}/{1}": "Creating a GIF from all {1} frames in “{0}”… {2}/{1}",
    "「{0}」の全{1}コマを時間順に並べました（{2}秒ごとに切り替え）。": "All {1} frames from “{0}” in time order ({2} s per frame).",
    "現在のルーレット：{0}（{1}コマ）": "Current roulette: {0} ({1} frames)",
    "選んだルーレット：{0}（{1}コマ）": "Selected roulette: {0} ({1} frames)",
    "ひみつスタンプ：{0}": "Secret stamps: {0}",
    "スタンプ付き{0}を作成して保存・共有": "Create, save & share with stamps: {0}",
    "{0}（{1}KB）": "{0} ({1} KB)",
    "ZIP/HTMLの直接共有に失敗しました（{0}）。{1}": "Direct ZIP/HTML sharing failed ({0}). {1}",
    "直接共有に失敗しました（{0}）：{1}": "Direct sharing failed ({0}): {1}",
    "詳細: {0}": "Details: {0}",
    "{0}を保存済み動画から削除": "Delete {0} from saved videos"
  });

  const dictionary = new Map(ROWS.map(row=>[row[0],{ja:row[0],en:row[1]}]));
  for (const [ja,en] of Object.entries(ENGLISH_EXTRA)) {
    if (!dictionary.has(ja)) dictionary.set(ja,{ja,en});
  }
  // Fortune names remain Japanese in saved data. Only the rendered labels change.
  const detect = () => {
    const primary = navigator.language || navigator.languages?.[0] ||
      Intl.DateTimeFormat().resolvedOptions().locale;
    return /^ja(?:[-_]|$)/i.test(primary) ? 'ja' : 'en';
  };
  let savedMode = null, savedLanguage = null;
  try {savedMode=localStorage.getItem(MODE_KEY);savedLanguage=localStorage.getItem(LANGUAGE_KEY);}catch(_){}
  let mode = savedMode === 'manual' && LANGUAGES.includes(savedLanguage) ? 'manual' : 'auto';
  let language = mode === 'manual' ? savedLanguage : detect();
  const originalText = new WeakMap();
  const messages = new WeakMap();
  const originalAttributes = new WeakMap();
  let queued = false;
  let observer = null;
  let lastAnnounced = '';
  const pending = new Set();
  const LABELS = {
    ja:['言語','表示言語','ブラウザの設定に合わせるか、言語を指定できます。'],
    en:['Language','Display language','Follow the browser or choose a language.']
  };
  let languageSelect = null;

  function t(value, code=language) {
    if (code === 'ja') return value;
    const match = dictionary.get(value);
    return match ? (match[code] || match.en || value) : value;
  }

  const QUANTITY_LABELS = {
    '件の受信ルーレット': ['received roulette', 'received roulettes'],
    '件のルーレットが保存されています。': ['roulette saved.', 'roulettes saved.'],
    '件のルーレット。写真を確認して選んでください。': ['roulette. Check the photo and choose it.', 'roulettes. Check the photos and choose one.'],
    '件のルーレット': ['roulette', 'roulettes'],
    '枚保存': ['photo saved', 'photos saved'],
    'コマ': ['frame', 'frames'],
    '本': ['video', 'videos'],
    '枚': ['photo', 'photos'],
    '回登場': ['appearance', 'appearances'],
  };
  function quantity(count, singular, plural) {
    return count + ' ' + (Number(count) === 1 ? singular : plural);
  }
  function format(pattern, ...values) {
    return t(pattern).replace(/\{(\d+)\}/g, (_, index) => String(values[index] ?? ''));
  }
  function errorDetail(error) {
    const detail = translateValue(String(error?.message || error || ''));
    return language === 'en' && /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(detail)
      ? t('詳細を確認できませんでした。')
      : detail;
  }
  const DYNAMIC_PATTERNS = [
    [/^(\d+) \/ (\d+)(コマ|ページ)(?: ・ 元動画 ([\d.]+)秒)?$/, (_, index, count, unit, time) =>
      (unit === 'ページ' ? 'Page ' : 'Frame ') + index + ' of ' + count + (time ? ' · Source video ' + time + ' s' : '')],
    [/^(\d+)コマ目(を停止位置にする)?$/, (_, frame, action) =>
      action ? 'Set frame ' + frame + ' as the stopping point' : 'Frame ' + frame],
    [/^元動画 ([\d.]+)秒$/, (_, seconds) => 'Source video ' + seconds + ' s'],
    [/^([\d.]+)秒$/, (_, seconds) => seconds + ' s'],
    [/^停止結果：(.+)$/, (_, fortune) => 'Stopped on: ' + t(fortune)],
    [/^(.+)を保存済み動画から削除$/, (_, name) => format('{0}を保存済み動画から削除', name)],
    [/^(.+)、(\d+)コマからGIFを作る$/, (_, name, count) => format('{0}、{1}コマからGIFを作る', name, count)],
    [/^(.+)（(\d+)コマ）$/, (_, name, count) => format('{0}（{1}コマ）', name, count)],
    [/^((?:スタンプ付きの)?抽選動画)（(MP4|WebM)）$/, (_, label, kind) => t(label) + ' (' + kind + ')'],
    [/^特徴度 ([\d.]+)$/, (_, score) => 'Feature score ' + score],
    [/^くっきり ([\d.]+)$/, (_, score) => 'Clarity ' + score],
    [/^珍しさ ([\d.]+)$/, (_, score) => 'Rarity ' + score],
    [/^変化 ([\d.]+)$/, (_, score) => 'Change ' + score],
    [/^(バックアップを書き出しています…|ムービー生成中…|画像を加工中) (.+)$/, (_, label, count) =>
      t(label + ' ') + count],
  ];
  function translateDynamic(value){
    if(language==='ja')return value;
    if(value.includes('\n'))return value.split('\n').map(translateValue).join('\n');
    for (const [pattern, render] of DYNAMIC_PATTERNS) {
      if (pattern.test(value)) return value.replace(pattern, render);
    }
    let progress=value.match(/^動画 (\d+) \/ (\d+) ・ (一瞬を探しています|ルーレットを準備しています) (\d+) \/ (\d+)$/);
    if(progress)return 'Video '+progress[1]+'/'+progress[2]+' · '+(progress[3]==='一瞬を探しています'?'Finding moments':'Preparing roulette')+' '+progress[4]+'/'+progress[5];
    progress=value.match(/^(\d+)本は追加済みのためスキップしました。$/);
    if(progress)return progress[1]+' videos skipped because they were already added.';
    progress=value.match(/^(\d+)本は処理できませんでした。$/);
    if(progress)return progress[1]+' videos could not be processed.';
    progress=value.match(/^思い出(おみくじ|ルーレット) (\d{1,2}\/\d{1,2} \d{1,2}:\d{2})$/);
    if(progress)return (progress[1]==='おみくじ'?'Memory Fortune':'Memory Roulette')+' '+progress[2];
    progress=value.match(/^(.+?。)(?: (\d+)本は追加済みのためスキップしました。)?(?: (\d+)本は処理できませんでした。)?(?: (継続して使う場合は、ホーム画面への追加とデッキのバックアップがおすすめです。))?$/);
    if(progress&&(progress[2]||progress[3]||progress[4])){
      const parts=[translateDynamic(progress[1])];
      if(progress[2])parts.push(translateDynamic(progress[2]+'本は追加済みのためスキップしました。'));
      if(progress[3])parts.push(translateDynamic(progress[3]+'本は処理できませんでした。'));
      if(progress[4])parts.push(t(progress[4]));
      return parts.join(' ');
    }
    let store=value.match(/^内訳：(.+)$/);
    if(store)return 'Breakdown: '+store[1].split(' ・ ').map(part=>translateDynamic(part)).join(' · ');
    store=value.match(/^(保存済み動画|ルーレット履歴|お気に入り|処理中の一時動画) (.+)$/);
    if(store)return ({'保存済み動画':'Saved videos','ルーレット履歴':'Roulette history',
      'お気に入り':'Favorites','処理中の一時動画':'Temporary video'}[store[1]])+': '+store[2];
    store=value.match(/^同じサイト由来の保存領域：(.+) 使用 \/ 上限 約(.+)$/);
    if(store)return 'Same-site storage: '+store[1]+' used / limit about '+store[2];
    store=value.match(/^保存保護：(有効|通常)$/);
    if(store)return 'Persistent storage: '+t(store[1]);
    store=value.match(/^シーン分析 (\d+)本 ・ (自動再開中 \d+本|中断 \d+本（同じ動画を選ぶと分析を再開）)$/);
    if(store)return translateDynamic('シーン分析 '+store[1]+'本')+' · '+translateDynamic(store[2]);
    let custom=value.match(/^(\d{4})年(1[0-2]|[1-9])月$/);
    if(custom)return new Intl.DateTimeFormat('en-US',{year:'numeric',month:'long'}).format(new Date(Number(custom[1]),Number(custom[2])-1,1));
    custom=value.match(/^(\d+)本の動画から (\d+)個の一瞬を保存しています。(?: 現在 (\d+)本を選択中です。| ルーレットに使う動画を選んでください。)$/);
    if(custom)return quantity(custom[1], 'video', 'videos')+' · '+quantity(custom[2], 'moment', 'moments')+' saved. '+(custom[3]?custom[3]+' selected.':'Choose videos for your roulette.');
    custom=value.match(/^(\d+) \/ (\d+)本を選択中$/);
    if(custom)return custom[1]+' of '+custom[2]+' videos selected';
    custom=value.match(/^すべての(\d+)本を選択中$/);
    if(custom)return Number(custom[1])===1?'1 video selected':'All '+custom[1]+' videos selected';
    custom=value.match(/^(\d+)個の一瞬 ・ (\d+:\d+)(?: ・ (\d+)回登場)?$/);
    if(custom)return quantity(custom[1], 'moment', 'moments')+' · '+custom[2]+(custom[3]?' · '+quantity(custom[3], 'appearance', 'appearances'):'');
    custom=value.match(/^(\d+)個の一瞬を準備しました。ルーレットはすぐに始められます。$/);
    if(custom)return custom[1]+' moments ready. You can start the roulette now.';
    custom=value.match(/^(\d+)個のコマを準備しました。GIFの動画一覧から選べます。$/);
    if(custom)return custom[1]+' frames ready. Choose them from the GIF video list.';
    custom=value.match(/^(\d+)個の一瞬をバックアップから復元しました。$/);
    if(custom)return 'Restored '+custom[1]+' moments from backup.';
    custom=value.match(/^バックアップを復元しています… (\d+)個の一瞬を準備$/);
    if(custom)return 'Restoring backup… '+custom[1]+' moments prepared';
    custom=value.match(/^(\d+)個のスタンプ$/);
    if(custom)return custom[1]+' stamps';
    custom=value.match(/^(\d+)本の保存済み動画から選ぶ$/);
    if(custom)return 'Choose from '+quantity(custom[1], 'saved video', 'saved videos');
    custom=value.match(/^🎴 選んだ(\d+)本でおみくじを引く$/);
    if(custom)return '🎴 Draw a fortune with '+custom[1]+' selected videos';

    custom=value.match(/^保存済み：(\d+)本。画像をタップしてGIFにする動画を選んでください。$/);
    if(custom)return quantity(custom[1], 'video', 'videos')+' saved. Tap a thumbnail to select a video for the GIF.';
    custom=value.match(/^(\d+)本の思い出おみくじ$/);
    if(custom)return 'Memory fortune roulette · '+custom[1]+' videos';
    custom=value.match(/^思い出デッキは最大(\d+)個です$/);
    if(custom)return 'The memory deck supports up to '+custom[1]+' moments.';
    custom=value.match(/^スタンプ未設定のコマが(\d+)枚あります。隠したい部分がないか確認してください。$/);
    if(custom)return custom[1]+' frames have no stamp. Check that nothing needs hiding.';
    custom=value.match(/^シーン分析 (\d+)本$/);
    if(custom)return 'Scene analysis: '+custom[1]+' videos';
    custom=value.match(/^自動再開中 (\d+)本$/);
    if(custom)return 'Resuming: '+custom[1]+' videos';
    custom=value.match(/^中断 (\d+)本（同じ動画を選ぶと分析を再開）$/);
    if(custom)return 'Interrupted: '+custom[1]+' videos (select the same video to resume)';
    custom=value.match(/^動画 (\d+) \/ (\d+) ・ 一瞬を探しています (\d+)%?$/);
    if(custom)return 'Video '+custom[1]+'/'+custom[2]+' · Finding moments '+custom[3]+'%';
    custom=value.match(/^動画 (\d+) \/ (\d+) ・ ルーレットを準備しています (\d+)%?$/);
    if(custom)return 'Video '+custom[1]+'/'+custom[2]+' · Preparing roulette '+custom[3]+'%';
    custom=value.match(/^(\d+)個の一瞬$/);
    if(custom)return custom[1]+' moments';
    custom=value.match(/^元動画 (\d+)$/);
    if(custom)return 'Source video '+custom[1];
    custom=value.match(/^(.+?) (選択済み|選択する)$/);
    if(custom)return custom[1]+' · '+t(custom[2]);
    custom=value.match(/^(\d+)回目(?: ・ | )(.+?)( の結果を見る)?$/);
    if(custom) return 'Draw '+custom[1]+' · '+t(custom[2])+(custom[3]?' · '+t('結果を見る'):'');
    let m=value.match(/^(おまかせで)?(\d+)枚を選びました$/);
    if(m)return quantity(m[2], 'photo', 'photos')+' selected'+(m[1]?' automatically':'');
    m=value.match(/^候補を確認中\.\.\. (\d+)\/(\d+)$/);
    if(m)return t('確認しています…')+' '+m[1]+'/'+m[2];
    m=value.match(/^動画 (\d+) \/ (\d+) を読み込んでいます…$/);
    if(m)return t('動画を読み込んでいます...')+' '+m[1]+'/'+m[2];
    m=value.match(/^「(.+)」を保存済み動画から削除しますか？$/);
    if(m)return 'Delete '+m[1]+'?';
    for(const [suffix, forms] of Object.entries(QUANTITY_LABELS)){
      if(!value.endsWith(suffix))continue;
      const count=value.slice(0,-suffix.length);
      if(/^\d+$/.test(count))return quantity(count,...forms);
    }
    const errorPrefixes = [
      '再生できません：', '削除できませんでした：', '復元できませんでした: ', '動画を処理できませんでした: ',
      '共有ファイルを作成できませんでした：', 'ZIP保存失敗：', '読み込めませんでした：',
      'GIFを作れませんでした: ', '動画を取り込めませんでした: ',
    ];
    for(const prefix of errorPrefixes){
      if(value.startsWith(prefix))return t(prefix)+errorDetail(value.slice(prefix.length));
    }
    const storagePrefix = 'このアプリの保存データ：約';
    if(value.startsWith(storagePrefix))return t(storagePrefix)+value.slice(storagePrefix.length);
    return value;
  }
  const fortuneKeys=['大逆転大吉','特大吉','大大吉','大凶','大吉','中吉','小吉','末吉','凶','吉'];
  function translateValue(value) {
    const trimmed = value.trim();
    if (!trimmed) return value;
    let translated = t(trimmed);
    if (translated===trimmed && language!=='ja') translated=translateDynamic(trimmed);
    if (translated===trimmed && language!=='ja') {
      const emoji=trimmed.match(/^([✨🌟🌈🎴🎲💫⭐]+\s*)(.+)$/u);
      if(emoji && t(emoji[2])!==emoji[2]) translated=emoji[1]+t(emoji[2]);
      if(translated===trimmed && trimmed.includes(' ・ ')){
        const parts=trimmed.split(' ・ ');
        const translatedParts=parts.map(part=>{
          const prefix=part.match(/^([✨🌟🌈🎴🎲💫⭐]+\s*)(.+)$/u);
          return prefix ? prefix[1]+t(prefix[2]) : (t(part)!==part ? t(part) : translateDynamic(part));
        });
        if(translatedParts.some((part,i)=>part!==parts[i]))translated=translatedParts.join(' · ');
      }
      // Translate visual fortune badges without changing the canonical fortune ID.
      for (const key of fortuneKeys) {
        if(translated!==trimmed)break;
        if(trimmed.endsWith(' '+key)){
          translated=trimmed.slice(0,-key.length)+t(key);
          break;
        }
        if(trimmed.endsWith(' '+key+'・特別リプレイ')){
          translated=trimmed.slice(0,-key.length-'・特別リプレイ'.length)
            +t(key)+' · '+t('特別リプレイ');
          break;
        }
      }
    }
    return translated===trimmed ? value : value.replace(trimmed, translated);
  }
  function excluded(element) {
    return !!element?.closest('script,style,svg,textarea,option[data-no-i18n],[data-no-i18n],[contenteditable],.user-content');
  }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      const parent = root.parentElement;
      if (excluded(parent)) return;
      const current = root.nodeValue;
      const message = messages.get(root);
      if (message) {
        const translated = message();
        if (translated !== current) root.nodeValue = translated;
        return;
      }
      const previous = originalText.get(root);
      const source = previous && current === previous.translation ? previous.source : current;
      const translation = translateValue(source);
      originalText.set(root,{source,translation});
      if (current !== translation) root.nodeValue = translation;
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE || excluded(root)) return;
    const walker = document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) walk(node);
    const elements = [root,...root.querySelectorAll('[placeholder],[aria-label],[title],[alt]')];
    for (const el of elements) {
      if (excluded(el)) continue;
      const old = originalAttributes.get(el) || {};
      for (const attr of ['placeholder','aria-label','title','alt']) {
        if (!el.hasAttribute(attr)) continue;
        const current = el.getAttribute(attr);
        const previous = old[attr];
        const source = previous && current === previous.translation ? previous.source : current;
        const translation = translateValue(source);
        old[attr] = {source,translation};
        if (current !== translation) el.setAttribute(attr,translation);
      }
      originalAttributes.set(el,old);
    }
  }
  function render() {
    if (!document.body) return;
    document.documentElement.lang=language;
    document.documentElement.dir='ltr';
    document.documentElement.dataset.appLanguage=language;
    if (languageSelect) {
      languageSelect.value=mode==='auto'?'auto':language;
      const auto=languageSelect.querySelector('option[value="auto"]');
      if (auto) {
        const label = language === 'ja' ? '自動（ブラウザ設定）' : 'Auto (browser language)';
        auto.textContent = label + ' · ' + t(LANGUAGE_NAMES[detect()]);
      }
    }
    document.title = document.body.dataset.i18nTitle
      ? t(document.body.dataset.i18nTitle) : t('思い出ルーレット')+' · '+t('おみくじ');
    const manifest=document.querySelector('link[rel="manifest"]');
    if (manifest) {
      const desired=language==='ja'?'./manifest.webmanifest?v=1.3.0-release-20261109':
        './manifest.intl.webmanifest?v=1.3.0-release-20261109';
      if (manifest.getAttribute('href')!==desired) manifest.setAttribute('href',desired);
    }
    const labels=LABELS[language];
    for(const [id,value] of [
      ['appLanguageHeading',labels[0]],['appLanguageLabel',labels[1]],['appLanguageHint',labels[2]]]) {
      const el=document.getElementById(id);
      if (el && el.textContent!==value) el.textContent=value;
    }
    walk(document.body);
    const announced=language+':'+mode;
    if(lastAnnounced!==announced){
      lastAnnounced=announced;
      window.dispatchEvent(new CustomEvent('memory-language-changed',{detail:{language,mode}}));
    }
  }
  // Translate only newly rendered nodes. Full traversal is reserved for a user language change.
  function scheduleNodes(nodes) {
    for(const node of nodes) if(node) pending.add(node);
    if(queued) return;
    queued=true;
    queueMicrotask(()=>{
      queued=false;
      const nodesToWalk=[...pending];pending.clear();
      for(const node of nodesToWalk) walk(node);
    });
  }
  // Write a canonical Japanese label and translate synchronously before the next paint.
  // walk() remembers the original text so changing languages remains reversible.
  function setText(element,source) {
    if (!element) return;
    element.textContent=String(source??'');
    walk(element);
  }
  function setMessage(element, pattern, ...values) {
    const render = () => format(pattern, ...values.map(value => typeof value === 'function' ? value() : value));
    const node = document.createTextNode(render());
    messages.set(node, render);
    element.replaceChildren(node);
  }
  function creationTitle(creation, fallback) {
    const title = creation.title;
    // These formats were generated by older builds. Named imports keep their own title.
    const autogenerated = !creation.receivedRoulette && (
      /^(?:思い出おみくじ|思い出ルーレット) \d{1,2}\/\d{1,2} \d{1,2}:\d{2}$/.test(title) ||
      (creation.deckMode && /^\d+本の思い出おみくじ$/.test(title))
    );
    return !title || autogenerated ? translateValue(title || fallback) : title;
  }
  function setCreationTitle(element, creation, fallback) {
    setMessage(element, '{0}', () => creationTitle(creation, fallback));
  }
  function setLanguage(next) {
    if (next!=='auto' && !LANGUAGES.includes(next)) return false;
    mode=next==='auto'?'auto':'manual';
    language=mode==='auto'?detect():next;
    try {
      localStorage.setItem(MODE_KEY,mode);
      if (mode==='manual') localStorage.setItem(LANGUAGE_KEY,language);
      else localStorage.removeItem(LANGUAGE_KEY);
    } catch (_) {}
    render();
    return true;
  }
  function installSelector() {
    const section=document.getElementById('settingsSection');
    const before=section?.querySelector('.settingsGroup');
    if (!section || !before) return;
    const block=document.createElement('section');
    block.className='settingsGroup';
    block.setAttribute('aria-labelledby','appLanguageHeading');
    block.innerHTML='<div class="settingsGroupHead"><div><span class="settingsGroupEyebrow">LANGUAGE</span>'+
      '<h3 id="appLanguageHeading" data-no-i18n>言語 / Language</h3></div></div>'+
      '<label class="settingsItem settingsSelectItem"><span data-no-i18n><b id="appLanguageLabel">表示言語 / Display language</b>'+
      '<span class="note" id="appLanguageHint">ブラウザに合わせるか、言語を固定できます。 / Follow the browser or choose a language.</span></span>'+
      '<select id="appLanguageSelect" aria-labelledby="appLanguageLabel"></select></label>';
    before.before(block);
    languageSelect=block.querySelector('#appLanguageSelect');
    languageSelect.append(new Option('Auto','auto'));
    for(const code of LANGUAGES) languageSelect.append(new Option(LANGUAGE_NAMES[code],code));
    languageSelect.addEventListener('change',()=>setLanguage(languageSelect.value));
  }
  window.MemoryI18n={languages:[...LANGUAGES],detect,get language(){return language;},
    get mode(){return mode;},setLanguage,t,translate:translateValue,format,errorDetail,setText,setMessage,creationTitle,setCreationTitle,localize:walk,refresh:render};
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
  function start() {
    installSelector();
    if(!window.__memoryTranslatedDialogs){
      window.__memoryTranslatedDialogs=true;
      const nativeAlert=window.alert.bind(window),nativeConfirm=window.confirm.bind(window);
      window.alert=message=>nativeAlert(translateValue(String(message)));
      window.confirm=message=>nativeConfirm(translateValue(String(message)));
    }
    render();
    observer=new MutationObserver(records=>{
      const touched=[];
      for(const record of records) {
        if(record.type==='childList') touched.push(...record.addedNodes);
        else touched.push(record.target);
      }
      if(touched.length) scheduleNodes(touched);
    });
    observer.observe(document.body,{childList:true,characterData:true,subtree:true,attributes:true,
      attributeFilter:['placeholder','aria-label','title','alt']});
    window.addEventListener('pageshow',()=>{if(mode==='auto')language=detect();render();});
  }
})();
