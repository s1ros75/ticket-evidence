namespace :demo do
  desc "デモのデータを消して、作り直す（DEMO_MODE=1 のときだけ動く）"
  task reset: :environment do
    # 本物のデータを消さないよう、デモモードでなければ何もしない
    raise "demo:reset は DEMO_MODE=1 のときだけ実行できます" unless Rails.application.config.x.demo_mode

    connection = ActiveRecord::Base.connection
    connection.truncate_tables(*%w[ticket_events evidences ticket_items tickets user_sessions users])

    ENV["SEED_DEMO"] = "1"
    Rails.application.load_seed
    puts "デモのデータを作り直しました（チケット #{Ticket.count} 件）"
  end
end
