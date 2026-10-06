require "rails_helper"

RSpec.describe "POST /api/v1/tickets", type: :request do
  it "チケットを作成できる" do
    post "/api/v1/tickets",
         params: { ticket: { title: "要件の確認", description: "顧客の要望を整理する" } },
         as: :json

    expect(response).to have_http_status(201)
    body = JSON.parse(response.body)
    expect(body["title"]).to eq "要件の確認"
    expect(body["status"]).to eq "investigating"
  end

  it "titleが空なら422を返す" do
    post "/api/v1/tickets",
         params: { ticket: { title: "" } },
         as: :json

    expect(response).to have_http_status(422)
  end
end