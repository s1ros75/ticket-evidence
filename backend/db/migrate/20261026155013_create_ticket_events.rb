class CreateTicketEvents < ActiveRecord::Migration[8.1]
  def change
    create_table :ticket_events do |t|
      t.references :ticket, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.string :action, null: false
      # 変更前後などの操作ごとの内容。項目が増えても列を増やさずに済むようjsonbにする（docs/design.md）
      t.jsonb :details, null: false, default: {}

      t.timestamps
    end
    add_index :ticket_events, [:ticket_id, :created_at]
  end
end
