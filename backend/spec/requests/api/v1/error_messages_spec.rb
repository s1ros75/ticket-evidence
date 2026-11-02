require "rails_helper"

# 画面にそのまま出すので、検証エラーは日本語で返す
RSpec.describe "検証エラーのメッセージ", type: :request do
  let!(:user) { sign_in(create_user(role: "reviewer", admin: true)) }

  def errors
    JSON.parse(response.body)["errors"]
  end

  it "チケットのタイトルが空" do
    post "/api/v1/tickets", params: { ticket: { title: "" } }, as: :json

    expect(errors).to eq ["タイトルを入力してください"]
  end

  it "項目の内容が空" do
    ticket = Ticket.create!(title: "要件の確認")

    post "/api/v1/tickets/#{ticket.id}/items", params: { item: { kind: "unknown", body: "" } }, as: :json

    expect(errors).to eq ["内容を入力してください"]
  end

  it "根拠のリンクがhttp/httpsでない" do
    item = Ticket.create!(title: "要件の確認").items.create!(kind: "unknown", body: "締め切りはいつか")

    post "/api/v1/tickets/#{item.ticket_id}/items/#{item.id}/resolve",
         params: { evidence: { url: "ftp://example.com" } }, as: :json

    expect(errors).to eq ["リンクはhttpかhttpsで始まるURLを入力してください"]
  end

  it "パスワード変更で、今のパスワードが違う・新しいパスワードが短い" do
    patch "/api/v1/password", params: { current_password: "wrong-password", password: "short" }, as: :json

    expect(errors).to contain_exactly("今のパスワードが正しくありません", "パスワードは12文字以上で入力してください")
  end

  it "アカウント作成で、名前が空・メールアドレスが使用済み・ロールが不正" do
    post "/api/v1/admin/users", params: { user: { name: "", email: user.email, role: "owner" } }, as: :json

    expect(errors).to contain_exactly(
      "名前を入力してください",
      "メールアドレスはすでに使われています",
      "ロールの値が正しくありません"
    )
  end
end
