require "rails_helper"

# 公開するデモでは、誰かにログインできなくされないよう、パスワードを変える操作を止める
RSpec.describe "デモモード", type: :request do
  let!(:admin) { sign_in(create_user(role: "reviewer", admin: true)) }

  around do |example|
    Rails.application.config.x.demo_mode = true
    example.run
  ensure
    Rails.application.config.x.demo_mode = false
  end

  it "自分のパスワードは変えられず、403を返す" do
    patch "/api/v1/password", params: { current_password: AuthHelpers::PASSWORD, password: "new-long-password" }, as: :json

    expect(response).to have_http_status(403)
    expect(JSON.parse(response.body)["errors"]).to eq ["デモ環境では使えません"]
    expect(User.authenticate_by(email: admin.email, password: AuthHelpers::PASSWORD)).to eq admin
  end

  it "仮パスワードは発行できず、403を返す" do
    member = create_user(role: "member")

    post "/api/v1/admin/users/#{member.id}/reset_password", as: :json

    expect(response).to have_http_status(403)
    expect(User.authenticate_by(email: member.email, password: AuthHelpers::PASSWORD)).to eq member
  end

  it "ほかの操作はできる" do
    post "/api/v1/tickets", params: { ticket: { title: "デモのチケット" } }, as: :json

    expect(response).to have_http_status(201)
  end
end
