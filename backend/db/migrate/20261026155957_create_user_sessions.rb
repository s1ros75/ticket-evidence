class CreateUserSessions < ActiveRecord::Migration[8.1]
  def change
    # ログイン中のセッションをサーバー側に記録する。ログアウトやパスワード変更のときに、ここから消して無効にする
    create_table :user_sessions do |t|
      t.references :user, null: false, foreign_key: true
      t.string :ip_address
      t.string :user_agent
      t.datetime :last_active_at, null: false

      t.timestamps
    end
  end
end
