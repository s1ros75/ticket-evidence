module AuthHelpers
  PASSWORD = "correct-horse-battery".freeze

  # 特に指定がなければ、ユーザーもチケットもこの組織に作る（テストごとに1つ）
  def default_organization
    @default_organization ||= Organization.create!(name: "テスト株式会社")
  end

  def create_user(role: "member", email: "#{role}@example.com", name: role == "reviewer" ? "レビュアー" : "担当者",
                  admin: false, organization: default_organization)
    User.create!(name: name, email: email, password: PASSWORD, role: role, admin: admin, organization: organization)
  end

  def create_ticket(organization: default_organization, **attributes)
    Ticket.create!(organization: organization, **attributes)
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
