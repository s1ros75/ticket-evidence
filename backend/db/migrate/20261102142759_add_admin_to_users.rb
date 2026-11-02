class AddAdminToUsers < ActiveRecord::Migration[8.1]
  def change
    # 管理者かどうか。担当者・レビュアーのロールとは別に持ち、同じ人が兼ねられるようにする
    add_column :users, :admin, :boolean, null: false, default: false
  end
end
