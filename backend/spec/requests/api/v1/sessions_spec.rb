require "rails_helper"

RSpec.describe "/api/v1/session", type: :request do
  let!(:user) { create_user }

  it "正しいメールとパスワードでログインでき、パスワードのハッシュは返さない" do
    post "/api/v1/session", params: { email: "member@example.com", password: "password123" }, as: :json

    expect(response).to have_http_status(200)
    body = JSON.parse(response.body)
    expect(body).to include("name" => "担当者", "email" => "member@example.com", "role" => "member")
    expect(body).not_to have_key("password_digest")
  end

  it "パスワードが違えば401を返し、ログインしない" do
    post "/api/v1/session", params: { email: "member@example.com", password: "wrong" }, as: :json

    expect(response).to have_http_status(401)
    get "/api/v1/session"
    expect(response).to have_http_status(401)
  end

  it "ログイン中なら、自分の情報を返す" do
    sign_in(user)

    get "/api/v1/session"

    expect(response).to have_http_status(200)
    expect(JSON.parse(response.body)["email"]).to eq "member@example.com"
  end

  it "ログアウトすると、APIを使えなくなる" do
    sign_in(user)

    delete "/api/v1/session", as: :json

    expect(response).to have_http_status(204)
    get "/api/v1/tickets"
    expect(response).to have_http_status(401)
  end
end

RSpec.describe "ログインしていないとき", type: :request do
  it "チケットのAPIは401を返す" do
    get "/api/v1/tickets"

    expect(response).to have_http_status(401)
  end
end

RSpec.describe "JSON以外のリクエスト", type: :request do
  # Cookieでログインを保つので、ほかのサイトのフォームから送られたPOSTを受け付けないようにする
  it "フォーム形式のPOSTは415を返し、処理しない" do
    sign_in

    post "/api/v1/tickets", params: { ticket: { title: "フォームから" } }

    expect(response).to have_http_status(415)
    expect(Ticket.count).to eq 0
  end
end
