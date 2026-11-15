# チケット一覧のページ送り（作成日時の新しい順、同じ日時は id 順）に合わせた索引
#
# - 絞り込みなし：(created_at, id) を後ろから読めば、並べ替えずに続きの50件が取れる
# - ステータスで絞り込み：(status, created_at, id) で、そのステータスの中を同じように読める
# status だけの索引は、(status, created_at, id) の先頭の列で代わりに使えるので消す
class AddListIndexesToTickets < ActiveRecord::Migration[8.1]
  def change
    add_index :tickets, [:created_at, :id]
    add_index :tickets, [:status, :created_at, :id]
    remove_index :tickets, :status
  end
end
