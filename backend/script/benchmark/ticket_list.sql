-- チケット一覧の取り方ごとの速さを、100万件で比べる
-- 一覧は必ず組織で絞るので、測るのは「チケット100万件を持つ組織」の一覧（ほかの組織のチケットも10万件入れておく）
-- 使い方は script/benchmark/README.md を参照（測定専用のDBで実行する。開発用のDBでは実行しない）

\set ON_ERROR_STOP on
\pset pager off

-- 1. データを作る ------------------------------------------------------------
-- チケット100万件：作成日時は過去2年に散らし、ステータスは調査中20%・レビュー中10%・完了70%
-- （LATERAL の中で g を使っているのは、random() を1行ごとに計算させるため。使わないと全行が同じ日時になることがある）
TRUNCATE ticket_events, evidences, ticket_items, tickets, user_sessions, users, organizations RESTART IDENTITY CASCADE;

INSERT INTO organizations (name, created_at, updated_at)
VALUES ('100万件の組織', now(), now()), ('ほかの組織', now(), now());

INSERT INTO tickets (organization_id, title, status, created_at, updated_at)
SELECT CASE WHEN g <= 1000000 THEN 1 ELSE 2 END,
       'チケット' || g,
       CASE WHEN g % 10 < 2 THEN 'investigating' WHEN g % 10 < 3 THEN 'in_review' ELSE 'done' END,
       ts, ts
FROM generate_series(1, 1100000) AS g,
     LATERAL (SELECT now() - random() * interval '730 days' + g * interval '0 seconds' AS ts) AS t;

-- 項目200万件（全チケットに散らす）：3割が不明点（一覧の「不明点の数」を数える対象）
INSERT INTO ticket_items (ticket_id, kind, body, created_at, updated_at)
SELECT 1 + floor(random() * 1100000)::int,
       CASE WHEN g % 10 < 3 THEN 'unknown' WHEN g % 10 < 5 THEN 'assumption' ELSE 'confirmed' END,
       '項目' || g, now(), now()
FROM generate_series(1, 2000000) AS g;

VACUUM ANALYZE tickets;
VACUUM ANALYZE ticket_items;

SELECT organization_id, count(*) AS tickets FROM tickets GROUP BY organization_id ORDER BY organization_id;

-- 50万件目あたり（2万ページ目に相当）のチケットを、深いページのカーソルにする
SELECT created_at AS deep_created_at, id AS deep_id
FROM tickets WHERE organization_id = 1 ORDER BY created_at DESC, id DESC OFFSET 500000 LIMIT 1 \gset

SELECT created_at AS deep_done_created_at, id AS deep_done_id
FROM tickets WHERE organization_id = 1 AND status = 'done' ORDER BY created_at DESC, id DESC OFFSET 350000 LIMIT 1 \gset

-- 2. 測る ------------------------------------------------------------------
-- 各クエリを3回続けて実行し、最後の結果（キャッシュが温まった状態）を見る。
-- 一覧APIと同じく、不明点の数をサブクエリで一緒に取る

\echo '=== A. 変更前：全件を返す ==='
\o /dev/null
SELECT t.*, (SELECT count(*) FROM ticket_items i WHERE i.kind = 'unknown' AND i.ticket_id = t.id) FROM tickets t WHERE t.organization_id = 1 ORDER BY t.created_at DESC;
SELECT t.*, (SELECT count(*) FROM ticket_items i WHERE i.kind = 'unknown' AND i.ticket_id = t.id) FROM tickets t WHERE t.organization_id = 1 ORDER BY t.created_at DESC;
\o
EXPLAIN (ANALYZE, BUFFERS, SUMMARY ON)
SELECT t.*, (SELECT count(*) FROM ticket_items i WHERE i.kind = 'unknown' AND i.ticket_id = t.id) FROM tickets t WHERE t.organization_id = 1 ORDER BY t.created_at DESC;

\echo '=== B1. ページ番号方式：1ページ目 ==='
EXPLAIN (ANALYZE, BUFFERS, SUMMARY ON)
SELECT t.*, (SELECT count(*) FROM ticket_items i WHERE i.kind = 'unknown' AND i.ticket_id = t.id) FROM tickets t WHERE t.organization_id = 1 ORDER BY t.created_at DESC, t.id DESC LIMIT 51 OFFSET 0;

\echo '=== B2. ページ番号方式：2万ページ目（50万件を読み飛ばす） ==='
\o /dev/null
SELECT t.id FROM tickets t WHERE t.organization_id = 1 ORDER BY t.created_at DESC, t.id DESC LIMIT 51 OFFSET 500000;
\o
EXPLAIN (ANALYZE, BUFFERS, SUMMARY ON)
SELECT t.*, (SELECT count(*) FROM ticket_items i WHERE i.kind = 'unknown' AND i.ticket_id = t.id) FROM tickets t WHERE t.organization_id = 1 ORDER BY t.created_at DESC, t.id DESC LIMIT 51 OFFSET 500000;

\echo '=== C1. キーセット方式：1ページ目 ==='
EXPLAIN (ANALYZE, BUFFERS, SUMMARY ON)
SELECT t.*, (SELECT count(*) FROM ticket_items i WHERE i.kind = 'unknown' AND i.ticket_id = t.id) FROM tickets t WHERE t.organization_id = 1 ORDER BY t.created_at DESC, t.id DESC LIMIT 51;

\echo '=== C2. キーセット方式：2万ページ目に相当する位置の続き ==='
EXPLAIN (ANALYZE, BUFFERS, SUMMARY ON)
SELECT t.*, (SELECT count(*) FROM ticket_items i WHERE i.kind = 'unknown' AND i.ticket_id = t.id) FROM tickets t
WHERE t.organization_id = 1 AND (t.created_at, t.id) < (:'deep_created_at', :deep_id)
ORDER BY t.created_at DESC, t.id DESC LIMIT 51;

\echo '=== C3. キーセット方式：完了で絞り込み、深い位置の続き ==='
EXPLAIN (ANALYZE, BUFFERS, SUMMARY ON)
SELECT t.*, (SELECT count(*) FROM ticket_items i WHERE i.kind = 'unknown' AND i.ticket_id = t.id) FROM tickets t
WHERE t.organization_id = 1 AND t.status = 'done' AND (t.created_at, t.id) < (:'deep_done_created_at', :deep_done_id)
ORDER BY t.created_at DESC, t.id DESC LIMIT 51;

-- 3. 索引がない場合 ----------------------------------------------------------
\echo '=== 索引を外して、もう一度測る ==='
BEGIN;
DROP INDEX index_tickets_on_organization_id_and_created_at_and_id;
DROP INDEX index_tickets_on_organization_status_created_at_id;

\echo '=== D1. 索引なし・キーセット方式：1ページ目 ==='
EXPLAIN (ANALYZE, BUFFERS, SUMMARY ON)
SELECT t.*, (SELECT count(*) FROM ticket_items i WHERE i.kind = 'unknown' AND i.ticket_id = t.id) FROM tickets t WHERE t.organization_id = 1 ORDER BY t.created_at DESC, t.id DESC LIMIT 51;

\echo '=== D2. 索引なし・キーセット方式：深い位置の続き ==='
EXPLAIN (ANALYZE, BUFFERS, SUMMARY ON)
SELECT t.*, (SELECT count(*) FROM ticket_items i WHERE i.kind = 'unknown' AND i.ticket_id = t.id) FROM tickets t
WHERE t.organization_id = 1 AND (t.created_at, t.id) < (:'deep_created_at', :deep_id)
ORDER BY t.created_at DESC, t.id DESC LIMIT 51;

\echo '=== D3. 索引なし・完了で絞り込み、深い位置の続き ==='
EXPLAIN (ANALYZE, BUFFERS, SUMMARY ON)
SELECT t.*, (SELECT count(*) FROM ticket_items i WHERE i.kind = 'unknown' AND i.ticket_id = t.id) FROM tickets t
WHERE t.organization_id = 1 AND t.status = 'done' AND (t.created_at, t.id) < (:'deep_done_created_at', :deep_done_id)
ORDER BY t.created_at DESC, t.id DESC LIMIT 51;
ROLLBACK;
