require "rails_helper"

RSpec.describe "/api/v1/admin/users", type: :request do
  let!(:admin) { create_user(role: "reviewer", email: "admin@example.com", name: "管理者", admin: true) }

  describe "管理者" do
    before { sign_in(admin) }

    it "アカウントの一覧を返し、パスワードのハッシュは返さない" do
      create_user(role: "member")

      get "/api/v1/admin/users"

      expect(response).to have_http_status(200)
      body = JSON.parse(response.body)
      expect(body.map { |user| user["email"] }).to eq %w[admin@example.com member@example.com]
      expect(body.first).to include("name" => "管理者", "role" => "reviewer", "admin" => true)
      expect(body.first).not_to have_key("password_digest")
    end

    it "アカウントを作り、仮パスワードを1回だけ返す" do
      post "/api/v1/admin/users",
           params: { user: { name: "鈴木", email: "suzuki@example.com", role: "reviewer", admin: false } },
           as: :json

      expect(response).to have_http_status(201)
      body = JSON.parse(response.body)
      expect(body["user"]).to include("name" => "鈴木", "email" => "suzuki@example.com", "role" => "reviewer", "admin" => false)
      temporary_password = body["temporary_password"]
      expect(temporary_password.length).to be >= User::MINIMUM_PASSWORD_LENGTH
      expect(User.authenticate_by(email: "suzuki@example.com", password: temporary_password)).to be_present
    end

    it "入力に誤りがあれば422を返す" do
      post "/api/v1/admin/users",
           params: { user: { name: "", email: "admin@example.com", role: "member" } },
           as: :json

      expect(response).to have_http_status(422)
      expect(JSON.parse(response.body)["errors"]).to be_present
    end

    it "仮パスワードを発行すると、古いパスワードは使えず、その人のログインも切れる" do
      member = create_user(role: "member")
      member.user_sessions.create!

      post "/api/v1/admin/users/#{member.id}/reset_password", as: :json

      expect(response).to have_http_status(200)
      temporary_password = JSON.parse(response.body)["temporary_password"]
      expect(User.authenticate_by(email: member.email, password: temporary_password)).to eq member
      expect(User.authenticate_by(email: member.email, password: AuthHelpers::PASSWORD)).to be_nil
      expect(member.user_sessions.reload).to be_empty
    end
  end

  describe "管理者でない人" do
    before { sign_in(create_user(role: "reviewer")) }

    it "一覧は403を返す" do
      get "/api/v1/admin/users"

      expect(response).to have_http_status(403)
    end

    it "アカウントは作れず、403を返す" do
      post "/api/v1/admin/users",
           params: { user: { name: "鈴木", email: "suzuki@example.com", role: "member" } },
           as: :json

      expect(response).to have_http_status(403)
      expect(User.find_by(email: "suzuki@example.com")).to be_nil
    end

    it "仮パスワードは発行できず、403を返す" do
      post "/api/v1/admin/users/#{admin.id}/reset_password", as: :json

      expect(response).to have_http_status(403)
    end
  end
end
