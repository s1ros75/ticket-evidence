# 公開するデモで有効にする（DEMO_MODE=1）
# - パスワード変更と仮パスワードの発行を止める（誰かにログインできなくされないように）
# - bin/rails demo:reset でデータを作り直せるようにする（デモモードのときだけ動く）
Rails.application.config.x.demo_mode = ENV["DEMO_MODE"] == "1"
