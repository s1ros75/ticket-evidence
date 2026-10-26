require "rails_helper"

RSpec.describe "/api/v1/session", type: :request do
  let!(:user) { create_user }

  it "正しいメールとパスワードでログインでき、パスワードのハッシュは返さない" do
    post "/api/v1/session", params: { email: "member@example.com", password: AuthHelpers::PASSWORD }, as: :json

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

  it "ログインすると、サーバー側にセッションを記録する" do
    expect { sign_in(user) }.to change(user.user_sessions, :count).by(1)
  end

  it "ログアウトすると、サーバー側のセッションを消す" do
    sign_in(user)

    expect { delete "/api/v1/session", as: :json }.to change(UserSession, :count).by(-1)
  end

  it "ログアウトしたあとは、ログアウト前のCookieを使い回してもAPIを使えない" do
    sign_in(user)
    stolen = cookies["_ticket_evidence_session"]

    delete "/api/v1/session", as: :json
    cookies["_ticket_evidence_session"] = stolen
    get "/api/v1/tickets"

    expect(response).to have_http_status(401)
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

RSpec.describe "セッションの期限", type: :request do
  let!(:user) { create_user }

  it "操作がないまま2時間を過ぎると、ログインが切れる" do
    sign_in(user)

    travel 2.hours + 1.minute
    get "/api/v1/tickets"

    expect(response).to have_http_status(401)
    expect(UserSession.count).to eq 0
  end

  it "操作を続けていれば、2時間を過ぎてもログインしたまま" do
    sign_in(user)

    travel 90.minutes
    get "/api/v1/tickets"
    travel 90.minutes
    get "/api/v1/tickets"

    expect(response).to have_http_status(200)
  end

  it "操作を続けていても、ログインから12時間を過ぎるとログインが切れる" do
    sign_in(user)

    12.times do
      travel 1.hour
      get "/api/v1/tickets"
    end
    travel 1.minute
    get "/api/v1/tickets"

    expect(response).to have_http_status(401)
  end

  it "パスワードを変えると、ログイン中のセッションが切れる" do
    sign_in(user)

    user.update!(password: "another-long-password")
    get "/api/v1/tickets"

    expect(response).to have_http_status(401)
  end
end

RSpec.describe "ログイン試行の回数制限", type: :request do
  let!(:user) { create_user }

  def attempt(email: "member@example.com", ip: "203.0.113.1")
    post "/api/v1/session", params: { email: email, password: "wrong" }, as: :json, env: { "REMOTE_ADDR" => ip }
  end

  it "同じ接続元から3分間に10回を超えると、429を返す" do
    10.times { |i| attempt(email: "user#{i}@example.com") }
    expect(response).to have_http_status(401)

    attempt(email: "other@example.com")
    expect(response).to have_http_status(429)
    expect(JSON.parse(response.body)["errors"]).to be_present
  end

  it "同じメールアドレスに15分間で5回を超えると、接続元を変えても429を返す" do
    5.times { |i| attempt(ip: "203.0.113.#{i + 1}") }
    expect(response).to have_http_status(401)

    attempt(ip: "198.51.100.1")
    expect(response).to have_http_status(429)
  end

  it "メールアドレスの大文字小文字や前後の空白を変えても、同じアカウントとして数える" do
    5.times { attempt }
    attempt(email: " Member@Example.com ", ip: "198.51.100.1")

    expect(response).to have_http_status(429)
  end

  it "時間がたてば、またログインを試せる" do
    5.times { attempt }

    travel 16.minutes
    post "/api/v1/session", params: { email: "member@example.com", password: AuthHelpers::PASSWORD }, as: :json

    expect(response).to have_http_status(200)
  end
end

