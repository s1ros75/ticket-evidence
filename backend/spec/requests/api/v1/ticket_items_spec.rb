require "rails_helper"

RSpec.describe "GET /api/v1/tickets/:id", type: :request do
  before { sign_in }

  it "チケットと、その項目を古い順に返す" do
    ticket = Ticket.create!(title: "要件の確認")
    ticket.items.create!(kind: "unknown", body: "締め切りはいつか", created_at: 1.hour.ago)
    ticket.items.create!(kind: "confirmed", body: "対象はWeb版のみ")

    get "/api/v1/tickets/#{ticket.id}"

    expect(response).to have_http_status(200)
    body = JSON.parse(response.body)
    expect(body["title"]).to eq "要件の確認"
    expect(body["items"].map { |item| [item["kind"], item["body"]] }).to eq [
      ["unknown", "締め切りはいつか"],
      ["confirmed", "対象はWeb版のみ"]
    ]
  end

  it "存在しないチケットなら404を返す" do
    get "/api/v1/tickets/0"

    expect(response).to have_http_status(404)
  end
end

RSpec.describe "POST /api/v1/tickets/:ticket_id/items", type: :request do
  before { sign_in }

  let(:ticket) { Ticket.create!(title: "要件の確認") }

  it "項目を追加できる" do
    post "/api/v1/tickets/#{ticket.id}/items",
         params: { item: { kind: "assumption", body: "既存の会員情報を使う" } },
         as: :json

    expect(response).to have_http_status(201)
    body = JSON.parse(response.body)
    expect(body["kind"]).to eq "assumption"
    expect(body["body"]).to eq "既存の会員情報を使う"
    expect(ticket.items.count).to eq 1
  end

  it "bodyが空なら422を返す" do
    post "/api/v1/tickets/#{ticket.id}/items",
         params: { item: { kind: "unknown", body: "" } },
         as: :json

    expect(response).to have_http_status(422)
    expect(JSON.parse(response.body)["errors"]).to be_present
  end

  it "存在しないチケットなら404を返す" do
    post "/api/v1/tickets/0/items",
         params: { item: { kind: "unknown", body: "締め切りはいつか" } },
         as: :json

    expect(response).to have_http_status(404)
  end
end
