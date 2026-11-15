require "rails_helper"

RSpec.describe "POST /api/v1/signup", type: :request do
  let(:valid_params) do
    { organization_name: "株式会社はじめて", name: "田中", email: "tanaka@example.com", password: "correct-horse-battery" }
  end

  def errors
    JSON.parse(response.body)["errors"]
  end

  it "組織と、最初のアカウント（レビュアー兼管理者）を作り、ログインした状態にする" do
    post "/api/v1/signup", params: valid_params, as: :json

    expect(response).to have_http_status(201)
    expect(JSON.parse(response.body)).to include(
      "name" => "田中", "email" => "tanaka@example.com", "role" => "reviewer", "admin" => true
    )
    organization = Organization.find_by!(name: "株式会社はじめて")
    expect(organization.users.pluck(:email)).to eq ["tanaka@example.com"]

    get "/api/v1/session"
    expect(JSON.parse(response.body)["organization"]).to eq("id" => organization.id, "name" => "株式会社はじめて")
  end

  it "ロールや管理者の印を指定しても無視し、必ずレビュアー兼管理者にする" do
    post "/api/v1/signup", params: valid_params.merge(role: "member", admin: false), as: :json

    user = User.find_by!(email: "tanaka@example.com")
    expect(user.role).to eq "reviewer"
    expect(user).to be_admin
  end

  it "登録した組織からは、他の組織のチケットが見えない" do
    create_ticket(title: "既にある組織のチケット")

    post "/api/v1/signup", params: valid_params, as: :json
    get "/api/v1/tickets"

    expect(JSON.parse(response.body)["tickets"]).to be_empty
  end

  describe "入力に誤りがあるとき" do
    it "アカウントに誤りがあれば、組織も作らない（片方だけ残さない）" do
      expect {
        post "/api/v1/signup", params: valid_params.merge(password: "short"), as: :json
      }.not_to change { [Organization.count, User.count] }

      expect(response).to have_http_status(422)
      expect(errors).to eq ["パスワードは12文字以上で入力してください"]
    end

    it "組織名がなければ、組織もアカウントも作らない" do
      expect {
        post "/api/v1/signup", params: valid_params.merge(organization_name: " "), as: :json
      }.not_to change { [Organization.count, User.count] }

      expect(response).to have_http_status(422)
      expect(errors).to eq ["組織名を入力してください"]
    end

    it "組織名とアカウントの両方に誤りがあれば、まとめて返す" do
      post "/api/v1/signup", params: { organization_name: "", name: "", email: "", password: "" }, as: :json

      expect(response).to have_http_status(422)
      expect(errors).to include("組織名を入力してください", "名前を入力してください", "メールアドレスを入力してください")
    end

    it "既に使われているメールアドレスでは登録できない" do
      create_user(email: "tanaka@example.com")

      expect {
        post "/api/v1/signup", params: valid_params, as: :json
      }.not_to change(Organization, :count)

      expect(response).to have_http_status(422)
      expect(errors).to eq ["メールアドレスはすでに使われています"]
    end

    it "失敗したときは、ログインした状態にしない" do
      post "/api/v1/signup", params: valid_params.merge(password: "short"), as: :json
      get "/api/v1/session"

      expect(response).to have_http_status(401)
    end
  end

  it "同じ接続元から短い間に何度も登録すると、429を返す" do
    5.times do |i|
      post "/api/v1/signup", params: valid_params.merge(email: "user#{i}@example.com"), as: :json
      expect(response).to have_http_status(201)
    end

    post "/api/v1/signup", params: valid_params.merge(email: "user5@example.com"), as: :json

    expect(response).to have_http_status(429)
    expect(errors).to eq ["しばらく待ってから、もう一度お試しください"]
  end
end
