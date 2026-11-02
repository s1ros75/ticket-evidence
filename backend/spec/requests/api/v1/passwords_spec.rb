require "rails_helper"

RSpec.describe "PATCH /api/v1/password", type: :request do
  let!(:user) { create_user }

  before { sign_in(user) }

  it "今のパスワードが合っていれば変えられ、この端末はログインしたまま" do
    patch "/api/v1/password",
          params: { current_password: AuthHelpers::PASSWORD, password: "new-long-password" },
          as: :json

    expect(response).to have_http_status(204)
    expect(User.authenticate_by(email: user.email, password: "new-long-password")).to eq user
    get "/api/v1/tickets"
    expect(response).to have_http_status(200)
  end

  it "変えると、ほかの端末のログインは切れる" do
    other_device = user.user_sessions.create!

    patch "/api/v1/password",
          params: { current_password: AuthHelpers::PASSWORD, password: "new-long-password" },
          as: :json

    expect(UserSession.exists?(other_device.id)).to be false
    expect(user.user_sessions.count).to eq 1
  end

  it "今のパスワードが違えば422を返し、変えない" do
    patch "/api/v1/password",
          params: { current_password: "wrong-password", password: "new-long-password" },
          as: :json

    expect(response).to have_http_status(422)
    expect(JSON.parse(response.body)["errors"]).to be_present
    expect(User.authenticate_by(email: user.email, password: AuthHelpers::PASSWORD)).to eq user
  end

  it "新しいパスワードが12文字未満なら422を返す" do
    patch "/api/v1/password",
          params: { current_password: AuthHelpers::PASSWORD, password: "short" },
          as: :json

    expect(response).to have_http_status(422)
  end
end
