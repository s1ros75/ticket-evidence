class CreateTicketItems < ActiveRecord::Migration[8.1]
  def change
    create_table :ticket_items do |t|
      t.references :ticket, null: false, foreign_key: true
      t.string :kind, null: false
      t.text :body, null: false
      t.datetime :resolved_at

      t.timestamps
    end
    add_index :ticket_items, [:ticket_id, :kind]
  end
end
