# ログイン試行の回数制限（rate_limit）が回数を数える場所
#
# Rails.cache は開発・テスト環境では何も保存しない設定（null_store）のため、そのままでは制限が効かない。
# 開発・テストでは、このプロセスのメモリに数える。
# 本番では Rails.cache を使うので、サーバーが複数台になるときは、すべてのサーバーから同じ場所を見る
# キャッシュ（Solid Cache や Redis など）を config.cache_store に設定すること。台ごとに数えると制限が緩くなる。
Rails.application.config.x.rate_limit_store =
  Rails.env.production? ? Rails.cache : ActiveSupport::Cache::MemoryStore.new
