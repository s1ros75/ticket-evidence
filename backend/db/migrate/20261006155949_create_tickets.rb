class CreateTickets < ActiveRecord::Migration[8.1]
    def change
    create_table :tickets do |t|
      t.string :title, null: false
      t.text :description
      t.string :status, null: false, default: "investigating"

      t.timestamps
    end
    add_index :tickets, :status
  end
end
