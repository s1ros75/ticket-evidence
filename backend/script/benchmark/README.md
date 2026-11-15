# チケット一覧の測定

チケット一覧の取り方（全件・ページ番号方式・キーセット方式）と索引の有無で、速さがどう変わるかを、チケット100万件を持つ組織（ほかの組織のチケット10万件、項目は全体で200万件）で、その組織の一覧を取るときの速さを測るスクリプトです。結果は [docs/design.md](../../../docs/design.md) の「チケット一覧のページ送り」にまとめています。

**測定専用のDB**で実行します。スクリプトは最初に組織・アカウント・チケット・項目をすべて消すので、開発用のDBでは実行しないでください。

```bash
# 測定専用のDBを作り、今のテーブル構成を読み込む
docker compose run --rm -e DATABASE_URL=postgres://postgres:password@db:5432/ticket_evidence_bench \
  backend bin/rails db:create db:schema:load

# データを作って測る（数分かかる）
docker compose exec -T db psql -U postgres -d ticket_evidence_bench < backend/script/benchmark/ticket_list.sql

# 終わったら消す
docker compose exec db dropdb -U postgres ticket_evidence_bench
```

結果は `EXPLAIN ANALYZE` の `Execution Time`（DBの中での実行時間）を見ます。JSONへの変換や通信の時間は含みません。
