module AuthHelpers
  PASSWORD = "correct-horse-battery".freeze

  def create_user(role: "member", email: "#{role}@example.com", name: role == "reviewer" ? "レビュアー" : "担当者")
    User.create!(name: name, email: email, password: PASSWORD, role: role)
  end

  # リクエストスペックで、Cookieのセッションにログインした状態を作る
  def sign_in(user = create_user)
    post "/api/v1/session", params: { email: user.email, password: PASSWORD }, as: :json
    expect(response).to have_http_status(200)
    user
  end
end

RSpec.configure do |config|
  config.include AuthHelpers
  config.include ActiveSupport::Testing::TimeHelpers

  # ログイン試行の回数はテストをまたいで残るので、テストごとに消す
  config.before { Rails.application.config.x.rate_limit_store.clear }
end
