class CreateEvidences < ActiveRecord::Migration[8.1]
  def change
    create_table :evidences do |t|
      t.references :ticket_item, null: false, foreign_key: true
      t.string :url
      t.text :memo

      t.timestamps
    end
  end
end
