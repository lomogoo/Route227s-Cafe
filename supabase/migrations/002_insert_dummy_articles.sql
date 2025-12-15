-- ============================================
-- Route 227s' Cafe - ダミー記事データ
-- ============================================
-- 10個のダミー記事と記事ページを追加

-- ============================================
-- Article 1: フードロス削減の取り組み
-- ============================================
INSERT INTO articles (id, category, title, summary, image_url, tags, is_published, created_at, updated_at)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'フードロス',
    'Route 227s' Cafeのフードロス削減への挑戦',
    '規格外野菜を使った美味しいカレーで、環境問題に取り組む私たちの活動をご紹介します。',
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="400"%3E%3Crect width="800" height="400" fill="%234CAF50"/%3E%3Ctext x="50%25" y="50%25" font-size="48" fill="white" text-anchor="middle" dominant-baseline="middle"%3EFood Loss Reduction%3C/text%3E%3C/svg%3E',
    ARRAY['フードロス', '環境', '規格外野菜'],
    true,
    NOW() - INTERVAL '30 days',
    NOW() - INTERVAL '30 days'
);

INSERT INTO article_pages (article_id, page_index, body, image_url)
VALUES
    ('11111111-1111-1111-1111-111111111111', 0, E'# なぜフードロス削減なのか\n\n日本では年間約600万トンの食品が廃棄されています。その中には、見た目が規格外というだけで捨てられてしまう野菜が多く含まれています。\n\nRoute 227s\' Cafeでは、これらの規格外野菜を積極的に活用することで、美味しいカレーを提供しながら環境問題に取り組んでいます。', 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="600" height="400"%3E%3Crect width="600" height="400" fill="%23FF9800"/%3E%3Ctext x="50%25" y="50%25" font-size="36" fill="white" text-anchor="middle" dominant-baseline="middle"%3E野菜の山%3C/text%3E%3C/svg%3E'),
    ('11111111-1111-1111-1111-111111111111', 1, E'# 私たちの取り組み\n\n毎週、地元農家から規格外野菜を仕入れ、それらを使ったオリジナルカレーを開発しています。\n\n1杯のカレーで約150gの野菜を救済。お客様と一緒に、美味しく楽しく社会貢献ができる仕組みを作っています。', NULL),
    ('11111111-1111-1111-1111-111111111111', 2, E'# これまでの成果\n\n- 救済した野菜: 約2トン\n- 提供したカレー: 13,000杯以上\n- パートナー農家: 15軒\n\nこれからも、美味しさと社会貢献を両立させた活動を続けていきます。', NULL);

-- ============================================
-- Article 2: カレーレシピの秘密
-- ============================================
INSERT INTO articles (id, category, title, summary, image_url, tags, is_published, created_at, updated_at)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    'レシピ',
    'プロが教える本格カレーの作り方',
    'スパイスの選び方から煮込みのコツまで、家庭でも作れる本格カレーレシピを公開します。',
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="400"%3E%3Crect width="800" height="400" fill="%23FF5722"/%3E%3Ctext x="50%25" y="50%25" font-size="48" fill="white" text-anchor="middle" dominant-baseline="middle"%3ECurry Recipe%3C/text%3E%3C/svg%3E',
    ARRAY['レシピ', 'カレー', 'スパイス'],
    true,
    NOW() - INTERVAL '25 days',
    NOW() - INTERVAL '25 days'
);

INSERT INTO article_pages (article_id, page_index, body, image_url)
VALUES
    ('22222222-2222-2222-2222-222222222222', 0, E'# スパイスの基本\n\nカレーの美味しさを決めるのはスパイス選び。基本となる5つのスパイスをご紹介します。\n\n- クミン: 香ばしさの要\n- コリアンダー: まろやかな甘み\n- ターメリック: 鮮やかな色と土の香り\n- チリパウダー: 辛さの調整に\n- ガラムマサラ: 仕上げの複雑な香り', 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="600" height="400"%3E%3Crect width="600" height="400" fill="%23795548"/%3E%3Ctext x="50%25" y="50%25" font-size="36" fill="white" text-anchor="middle" dominant-baseline="middle"%3ESpices%3C/text%3E%3C/svg%3E'),
    ('22222222-2222-2222-2222-222222222222', 1, E'# 野菜の切り方のコツ\n\n規格外野菜は形が不揃いですが、それを活かした切り方があります。\n\n大きめに切ることで、野菜本来の甘みと食感を楽しめます。煮込み時間は中火で45分が目安です。', NULL);

-- ============================================
-- Article 3: 地域イベントレポート
-- ============================================
INSERT INTO articles (id, category, title, summary, image_url, tags, is_published, created_at, updated_at)
VALUES (
    '33333333-3333-3333-3333-333333333333',
    'イベント',
    '春の地域マルシェに出店しました！',
    '地域の方々と交流できた楽しいイベントの様子をレポートします。',
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="400"%3E%3Crect width="800" height="400" fill="%232196F3"/%3E%3Ctext x="50%25" y="50%25" font-size="48" fill="white" text-anchor="middle" dominant-baseline="middle"%3ESpring Market%3C/text%3E%3C/svg%3E',
    ARRAY['イベント', '地域交流', 'マルシェ'],
    true,
    NOW() - INTERVAL '20 days',
    NOW() - INTERVAL '20 days'
);

INSERT INTO article_pages (article_id, page_index, body, image_url)
VALUES
    ('33333333-3333-3333-3333-333333333333', 0, E'# 大盛況の一日\n\n晴天に恵まれた週末、地域マルシェに出店してきました！\n\n300食以上のカレーを提供し、多くの方にフードロス削減の取り組みを知っていただけました。', 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="600" height="400"%3E%3Crect width="600" height="400" fill="%2300BCD4"/%3E%3Ctext x="50%25" y="50%25" font-size="36" fill="white" text-anchor="middle" dominant-baseline="middle"%3EEvent Scene%3C/text%3E%3C/svg%3E'),
    ('33333333-3333-3333-3333-333333333333', 1, E'# お客様の声\n\n「規格外野菜でこんなに美味しいカレーができるなんて！」\n「子どもと一緒に社会貢献できて嬉しい」\n\nたくさんの温かいお言葉をいただきました。次回のイベントもお楽しみに！', NULL);

-- ============================================
-- Article 4: スタンプカードの使い方
-- ============================================
INSERT INTO articles (id, category, title, summary, image_url, tags, is_published, created_at, updated_at)
VALUES (
    '44444444-4444-4444-4444-444444444444',
    'サービス',
    'スタンプカード完全ガイド',
    'お得なスタンプカードの仕組みと、賢い貯め方をご紹介します。',
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="400"%3E%3Crect width="800" height="400" fill="%239C27B0"/%3E%3Ctext x="50%25" y="50%25" font-size="48" fill="white" text-anchor="middle" dominant-baseline="middle"%3EStamp Card%3C/text%3E%3C/svg%3E',
    ARRAY['サービス', 'スタンプ', 'お得情報'],
    true,
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '15 days'
);

INSERT INTO article_pages (article_id, page_index, body, image_url)
VALUES
    ('44444444-4444-4444-4444-444444444444', 0, E'# スタンプの貯め方\n\nカレーを1杯購入するごとに1スタンプ！\n\n- 3スタンプ: ドリンク1杯無料\n- 6スタンプ: カレー1杯無料\n\nアプリで簡単に管理できます。', NULL),
    ('44444444-4444-4444-4444-444444444444', 1, E'# お得な特典情報\n\nスタンプを貯めると、あなたの貢献度も可視化されます。\n\n救済した野菜の量や、環境への影響を確認できるので、楽しみながら社会貢献できますよ！', NULL);

-- ============================================
-- Article 5: 農家さんインタビュー
-- ============================================
INSERT INTO articles (id, category, title, summary, image_url, tags, is_published, created_at, updated_at)
VALUES (
    '55555555-5555-5555-5555-555555555555',
    'インタビュー',
    '農家・田中さんに聞く「野菜への想い」',
    'パートナー農家の田中さんに、規格外野菜の現状と未来について伺いました。',
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="400"%3E%3Crect width="800" height="400" fill="%238BC34A"/%3E%3Ctext x="50%25" y="50%25" font-size="48" fill="white" text-anchor="middle" dominant-baseline="middle"%3EFarmer Interview%3C/text%3E%3C/svg%3E',
    ARRAY['インタビュー', '農家', '野菜'],
    true,
    NOW() - INTERVAL '12 days',
    NOW() - INTERVAL '12 days'
);

INSERT INTO article_pages (article_id, page_index, body, image_url)
VALUES
    ('55555555-5555-5555-5555-555555555555', 0, E'# 規格外野菜の現実\n\n「形が悪いだけで市場に出せない野菜が、全体の3割もあるんです」\n\n田中さんは20年以上野菜作りを続けてきましたが、規格外野菜の廃棄には心を痛めていたそうです。', 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="600" height="400"%3E%3Crect width="600" height="400" fill="%23CDDC39"/%3E%3Ctext x="50%25" y="50%25" font-size="36" fill="white" text-anchor="middle" dominant-baseline="middle"%3E畑の風景%3C/text%3E%3C/svg%3E'),
    ('55555555-5555-5555-5555-555555555555', 1, E'# Route 227s\' Cafeとの出会い\n\n「規格外野菜を美味しく活用してくれる場所ができて、本当に嬉しい」\n\n今では定期的に野菜を提供し、お店の成長を楽しみにしているそうです。', NULL),
    ('55555555-5555-5555-5555-555555555555', 2, E'# これからの農業\n\n「消費者の意識が変われば、農業も変わる。Route 227s\' Cafeのような取り組みがもっと広がってほしい」\n\n田中さんの言葉に、私たちも背中を押されました。', NULL);

-- ============================================
-- Article 6: 季節のカレーメニュー
-- ============================================
INSERT INTO articles (id, category, title, summary, image_url, tags, is_published, created_at, updated_at)
VALUES (
    '66666666-6666-6666-6666-666666666666',
    'メニュー',
    '冬の温まるカレー特集',
    '寒い季節にぴったりの、体が温まる特別メニューをご紹介します。',
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="400"%3E%3Crect width="800" height="400" fill="%23F44336"/%3E%3Ctext x="50%25" y="50%25" font-size="48" fill="white" text-anchor="middle" dominant-baseline="middle"%3EWinter Curry%3C/text%3E%3C/svg%3E',
    ARRAY['メニュー', '季節限定', 'カレー'],
    true,
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '10 days'
);

INSERT INTO article_pages (article_id, page_index, body, image_url)
VALUES
    ('66666666-6666-6666-6666-666666666666', 0, E'# 根菜たっぷりカレー\n\n冬の規格外野菜といえば、大根、にんじん、ごぼうなどの根菜類。\n\nこれらをたっぷり使った、ホクホクとした食感が楽しめるカレーが今月の限定メニューです。', 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="600" height="400"%3E%3Crect width="600" height="400" fill="%23FFC107"/%3E%3Ctext x="50%25" y="50%25" font-size="36" fill="white" text-anchor="middle" dominant-baseline="middle"%3E根菜カレー%3C/text%3E%3C/svg%3E'),
    ('66666666-6666-6666-6666-666666666666', 1, E'# スパイスで体ぽかぽか\n\n生姜とブラックペッパーを効かせて、体の芯から温まる仕上がりに。\n\n冷え性の方にもおすすめです！', NULL);

-- ============================================
-- Article 7: ボランティア活動報告
-- ============================================
INSERT INTO articles (id, category, title, summary, image_url, tags, is_published, created_at, updated_at)
VALUES (
    '77777777-7777-7777-7777-777777777777',
    'ボランティア',
    '子ども食堂への出張カレー提供',
    '地域の子ども食堂で、カレーを無償提供してきました。',
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="400"%3E%3Crect width="800" height="400" fill="%23E91E63"/%3E%3Ctext x="50%25" y="50%25" font-size="48" fill="white" text-anchor="middle" dominant-baseline="middle"%3EVolunteer Activity%3C/text%3E%3C/svg%3E',
    ARRAY['ボランティア', '社会貢献', '子ども'],
    true,
    NOW() - INTERVAL '8 days',
    NOW() - INTERVAL '8 days'
);

INSERT INTO article_pages (article_id, page_index, body, image_url)
VALUES
    ('77777777-7777-7777-7777-777777777777', 0, E'# 子ども食堂での一日\n\n月に1回、地域の子ども食堂でカレーを提供しています。\n\n今回は50人分のカレーを作り、子どもたちの笑顔をたくさん見ることができました。', 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="600" height="400"%3E%3Crect width="600" height="400" fill="%23FF4081"/%3E%3Ctext x="50%25" y="50%25" font-size="36" fill="white" text-anchor="middle" dominant-baseline="middle"%3E子どもたち%3C/text%3E%3C/svg%3E'),
    ('77777777-7777-7777-7777-777777777777', 1, E'# フードロスについて学ぶ\n\n食事の前には、フードロス削減について簡単なお話も。\n\n「野菜を大切にする」というメッセージが、子どもたちに届いたら嬉しいです。', NULL);

-- ============================================
-- Article 8: カレーと健康
-- ============================================
INSERT INTO articles (id, category, title, summary, image_url, tags, is_published, created_at, updated_at)
VALUES (
    '88888888-8888-8888-8888-888888888888',
    '健康',
    'カレーが体にいい5つの理由',
    '管理栄養士監修。カレーの健康効果を科学的に解説します。',
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="400"%3E%3Crect width="800" height="400" fill="%2300BCD4"/%3E%3Ctext x="50%25" y="50%25" font-size="48" fill="white" text-anchor="middle" dominant-baseline="middle"%3EHealthy Curry%3C/text%3E%3C/svg%3E',
    ARRAY['健康', 'カレー', '栄養'],
    true,
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '5 days'
);

INSERT INTO article_pages (article_id, page_index, body, image_url)
VALUES
    ('88888888-8888-8888-8888-888888888888', 0, E'# スパイスの健康効果\n\n1. ターメリック: 抗酸化作用\n2. クミン: 消化促進\n3. コリアンダー: デトックス効果\n4. カルダモン: 口臭予防\n5. ブラックペッパー: 栄養吸収促進\n\nカレーは薬膳料理の一種とも言えます。', NULL),
    ('88888888-8888-8888-8888-888888888888', 1, E'# 野菜たっぷりで栄養満点\n\n1杯のカレーには様々な野菜が入っています。\n\nビタミン、ミネラル、食物繊維をバランスよく摂取できる、理想的な一品です。', NULL);

-- ============================================
-- Article 9: スタッフ紹介
-- ============================================
INSERT INTO articles (id, category, title, summary, image_url, tags, is_published, created_at, updated_at)
VALUES (
    '99999999-9999-9999-9999-999999999999',
    'スタッフ',
    'シェフ佐藤の「美味しいカレー」へのこだわり',
    '毎日美味しいカレーを作り続けるシェフの想いをお届けします。',
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="400"%3E%3Crect width="800" height="400" fill="%23673AB7"/%3E%3Ctext x="50%25" y="50%25" font-size="48" fill="white" text-anchor="middle" dominant-baseline="middle"%3EChef Story%3C/text%3E%3C/svg%3E',
    ARRAY['スタッフ', 'インタビュー', 'シェフ'],
    true,
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days'
);

INSERT INTO article_pages (article_id, page_index, body, image_url)
VALUES
    ('99999999-9999-9999-9999-999999999999', 0, E'# カレーシェフになったきっかけ\n\n「インドを旅した時、スパイスの奥深さに魅了されました」\n\nシェフ佐藤は10年前、インドで本場のカレーに出会い、カレー作りの道に進んだそうです。', 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="600" height="400"%3E%3Crect width="600" height="400" fill="%239575CD"/%3E%3Ctext x="50%25" y="50%25" font-size="36" fill="white" text-anchor="middle" dominant-baseline="middle"%3EChef%3C/text%3E%3C/svg%3E'),
    ('99999999-9999-9999-9999-999999999999', 1, E'# 規格外野菜への想い\n\n「形は不揃いでも、味は一級品。それを多くの人に知ってもらいたい」\n\nRoute 227s\' Cafeでのカレー作りに、大きなやりがいを感じているそうです。', NULL),
    ('99999999-9999-9999-9999-999999999999', 2, E'# これからの夢\n\n「いつか、Route 227s\' Cafeのカレーが、フードロス削減のシンボルになれば」\n\nシェフの熱い想いが、今日も美味しいカレーを生み出しています。', NULL);

-- ============================================
-- Article 10: アプリの使い方ガイド
-- ============================================
INSERT INTO articles (id, category, title, summary, image_url, tags, is_published, created_at, updated_at)
VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'アプリ',
    'Route 227s'' Cafeアプリ活用術',
    'アプリの便利な機能を使いこなして、もっと楽しく社会貢献しましょう！',
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="400"%3E%3Crect width="800" height="400" fill="%233F51B5"/%3E%3Ctext x="50%25" y="50%25" font-size="48" fill="white" text-anchor="middle" dominant-baseline="middle"%3EApp Guide%3C/text%3E%3C/svg%3E',
    ARRAY['アプリ', '使い方', 'ガイド'],
    true,
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
);

INSERT INTO article_pages (article_id, page_index, body, image_url)
VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 0, E'# スタンプカード機能\n\nアプリでスタンプを簡単管理！\n\n購入履歴やスタンプ残数がいつでも確認できます。交換も画面を見せるだけで完了です。', NULL),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1, E'# インパクトダッシュボード\n\nあなたの貢献度を可視化！\n\n- 救済した野菜の量\n- CO2削減量\n- ランキング\n\n楽しみながら社会貢献できます。', NULL),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 2, E'# イベント情報\n\n出店スケジュールやイベント情報をいち早くチェック！\n\nプッシュ通知をオンにすれば、お得な情報を見逃しません。', NULL),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 3, E'# 掲示板機能\n\n「今日ここで見かけたよ！」\n\n位置情報を使った掲示板で、Route 227s\' Cafeの出店情報をシェアしましょう。\n\nコミュニティで情報を共有して、もっと便利に！', NULL);
