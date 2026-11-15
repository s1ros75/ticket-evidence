# 開発用・デモ用のアカウントとデータ
#
# - 開発環境では、bin/rails db:seed で作る
# - それ以外の環境（公開するデモなど）では、SEED_DEMO=1 を付けたときだけ作る
# - 組織を2つ作る。別の組織でログインすると、もう一方のチケットやアカウントが見えないことを試せる
# - 何度実行してもよい。組織は名前で、アカウントはメールアドレスで探して、なければ作る
# - デモのチケットは、チケットが1件もないときだけ作る（作業中のデータに混ぜない）
return unless Rails.env.development? || ENV["SEED_DEMO"] == "1"

DEMO_PASSWORD = "password1234".freeze

sample = Organization.find_or_create_by!(name: "株式会社サンプル")
demo = Organization.find_or_create_by!(name: "合同会社デモ")

accounts = {
  member: { name: "佐藤", email: "member@example.com", role: "member", organization: sample },
  reviewer: { name: "鈴木", email: "reviewer@example.com", role: "reviewer", admin: true, organization: sample },
  reviewer2: { name: "高橋", email: "reviewer2@example.com", role: "reviewer", organization: sample },
  demo_admin: { name: "山田", email: "demo-admin@example.com", role: "reviewer", admin: true, organization: demo },
  demo_member: { name: "中村", email: "demo-member@example.com", role: "member", organization: demo }
}.transform_values do |attributes|
  User.find_or_create_by!(email: attributes[:email]) do |user|
    user.organization = attributes[:organization]
    user.name = attributes[:name]
    user.role = attributes[:role]
    user.admin = attributes.fetch(:admin, false)
    user.password = DEMO_PASSWORD
  end
end

return if Ticket.exists?

sato, suzuki, takahashi, yamada, nakamura = accounts.values_at(:member, :reviewer, :reviewer2, :demo_admin, :demo_member)

# 画面やAPIと同じく、操作と一緒に変更履歴も残す。チケットは作った人の組織のものになる
def create_ticket(user, title, description)
  user.organization.tickets.create!(title: title, description: description).tap do |ticket|
    ticket.events.create!(user: user, action: "ticket_created", details: { title: ticket.title })
  end
end

def add_item(ticket, user, kind, body)
  ticket.items.create!(kind: kind, body: body).tap do |item|
    ticket.events.create!(user: user, action: "item_added", details: { item_id: item.id, kind: kind, body: body })
  end
end

def run!(result)
  raise "デモデータの作成に失敗しました: #{result.errors.join(', ')}" unless result.success?

  result
end

def resolve(item, user, url: nil, memo: nil)
  run!(ResolveTicketItem.call(user: user, item: item, evidence_params: { url: url, memo: memo }))
end

ActiveRecord::Base.transaction do
  # 1. 調査中：不明点が残っていて、レビュー依頼に進めない
  signup = create_ticket(sato, "会員登録フローの要件確認", "新しい会員登録画面について、顧客の要望を整理する。")
  deadline = add_item(signup, sato, "unknown", "リリース希望日はいつか")
  resolve(deadline, sato, url: "https://example.com/minutes/2026-10-21", memo: "定例で12月第1週と確認")
  add_item(signup, sato, "unknown", "パスワードを忘れたときの再設定手段（メール／SMS）")
  add_item(signup, sato, "unknown", "退会したときに会員データを何日保持するか")
  add_item(signup, sato, "assumption", "既存の会員DBのテーブルをそのまま使う")
  add_item(signup, sato, "confirmed", "対象はWeb版のみ（アプリは対象外）")

  # 2. レビュー中：担当者が依頼し、レビュアーの確認待ち
  invoice = create_ticket(sato, "請求書PDFの出力要件", "月末締めの請求書を、管理画面からPDFで出力できるようにする。")
  layout = add_item(invoice, sato, "unknown", "PDFのレイアウトは既存の紙の請求書と同じか")
  resolve(layout, sato, memo: "経理の田中さんに確認。既存のExcelテンプレートと同じ配置にする")
  tax = add_item(invoice, sato, "unknown", "インボイス制度の登録番号を載せるか")
  resolve(tax, sato, url: "https://example.com/spec/invoice", memo: "載せる。番号は設定画面で入力")
  add_item(invoice, sato, "assumption", "1か月あたりの発行件数は1,000件以内")
  run!(RequestTicketReview.call(user: sato, ticket: invoice))

  # 3. 完了：一度差し戻され、理由を解決してから完了した
  stock = create_ticket(sato, "在庫アラートの通知条件", "在庫が少なくなったときに、担当者へ通知する条件を決める。")
  threshold = add_item(stock, sato, "unknown", "何個を下回ったら通知するか")
  resolve(threshold, sato, memo: "商品ごとに設定。初期値は10個")
  run!(RequestTicketReview.call(user: sato, ticket: stock))
  run!(SendBackTicket.call(user: takahashi, ticket: stock, reason: "通知先（メール／Slack）が決まっていない"))
  channel = stock.items.find_by!(kind: "unknown")
  resolve(channel, sato, url: "https://example.com/minutes/2026-10-28", memo: "Slackの #stock チャンネルに通知")
  run!(RequestTicketReview.call(user: sato, ticket: stock))
  run!(ApproveTicket.call(user: suzuki, ticket: stock.reload))

  # 4. レビュー中：レビュアー自身が依頼したので、別のレビュアーの確認待ち
  search = create_ticket(suzuki, "検索結果の並び順", "商品検索の結果を、どの順に並べるかを決める。")
  order = add_item(search, suzuki, "unknown", "初期表示は新着順か人気順か")
  resolve(order, suzuki, memo: "人気順。人気は直近30日の購入数")
  run!(RequestTicketReview.call(user: suzuki, ticket: search))

  # 5. 調査中：作ったばかり
  roles = create_ticket(sato, "管理画面の権限設計", nil)
  add_item(roles, sato, "unknown", "店舗スタッフに売上を見せてよいか")

  # 合同会社デモ：株式会社サンプルの人からは見えない
  portal = create_ticket(nakamura, "社内ポータルのお知らせ機能", "全社員向けのお知らせを、ポータルのトップに出す。")
  add_item(portal, nakamura, "unknown", "お知らせを出せるのは総務だけか")
  add_item(portal, nakamura, "assumption", "既読の管理はしない")

  holiday = create_ticket(yamada, "休暇申請の承認フロー", "休暇申請を、誰がどの順番で承認するかを決める。")
  approver = add_item(holiday, yamada, "unknown", "部長が不在のときの代理承認者")
  resolve(approver, yamada, memo: "人事の佐々木さんに確認。課長が代理で承認する")
end
