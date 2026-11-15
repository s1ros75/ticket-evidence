# 複数の組織が、お互いのデータを見られずに使えるようにする（docs/design.md「組織ごとのデータの分離」）
#
# - ユーザーとチケットを組織に結びつける。項目・根拠・変更履歴は、チケットを通して組織をたどる
# - 既にあるユーザーとチケットは「既定の組織」にまとめてから、組織を必須にする
# - 一覧の取得は必ず組織で絞るので、一覧の索引の先頭に組織を足して作り直す
class CreateOrganizations < ActiveRecord::Migration[8.1]
  # 自動で付く名前はPostgreSQLの上限（63文字）を超えて読みにくい名前になるので、名前を決めておく
  STATUS_INDEX = "index_tickets_on_organization_status_created_at_id".freeze

  def up
    create_table :organizations do |t|
      t.string :name, null: false
      t.timestamps
    end

    add_reference :users, :organization, foreign_key: true
    add_reference :tickets, :organization, foreign_key: true, index: false

    if select_value("SELECT EXISTS (SELECT 1 FROM users UNION ALL SELECT 1 FROM tickets)")
      organization_id = select_value(<<~SQL.squish)
        INSERT INTO organizations (name, created_at, updated_at) VALUES ('既定の組織', now(), now()) RETURNING id
      SQL
      execute("UPDATE users SET organization_id = #{Integer(organization_id)}")
      execute("UPDATE tickets SET organization_id = #{Integer(organization_id)}")
    end

    change_column_null :users, :organization_id, false
    change_column_null :tickets, :organization_id, false

    remove_index :tickets, [:created_at, :id]
    remove_index :tickets, [:status, :created_at, :id]
    add_index :tickets, [:organization_id, :created_at, :id]
    add_index :tickets, [:organization_id, :status, :created_at, :id], name: STATUS_INDEX
  end

  def down
    remove_index :tickets, name: STATUS_INDEX
    remove_index :tickets, [:organization_id, :created_at, :id]
    add_index :tickets, [:created_at, :id]
    add_index :tickets, [:status, :created_at, :id]

    remove_reference :tickets, :organization, foreign_key: true, index: false
    remove_reference :users, :organization, foreign_key: true
    drop_table :organizations
  end
end
