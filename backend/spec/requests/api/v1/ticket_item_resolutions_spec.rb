require "rails_helper"

RSpec.describe "POST /api/v1/tickets/:ticket_id/items/:id/resolve", type: :request do
  let(:ticket) { Ticket.create!(title: "要件の確認") }
  let(:item) { ticket.items.create!(kind: "unknown", body: "締め切りはいつか") }

  it "根拠を付けて解決し、確認済みになった項目を返す" do
    post "/api/v1/tickets/#{ticket.id}/items/#{item.id}/resolve",
         params: { evidence: { url: "https://example.com/minutes/1", memo: "11月末と確認" } },
         as: :json

    expect(response).to have_http_status(200)
    body = JSON.parse(response.body)
    expect(body["kind"]).to eq "confirmed"
    expect(body["resolved_at"]).to be_present
    expect(body["evidences"].map { |e| [e["url"], e["memo"]] }).to eq [["https://example.com/minutes/1", "11月末と確認"]]
  end

  it "根拠が空なら422を返す" do
    post "/api/v1/tickets/#{ticket.id}/items/#{item.id}/resolve",
         params: { evidence: { url: "", memo: "" } },
         as: :json

    expect(response).to have_http_status(422)
    expect(JSON.parse(response.body)["errors"]).to be_present
  end

  it "別のチケットの項目は404を返す" do
    other = Ticket.create!(title: "別のチケット")

    post "/api/v1/tickets/#{other.id}/items/#{item.id}/resolve",
         params: { evidence: { memo: "メモ" } },
         as: :json

    expect(response).to have_http_status(404)
  end
end

RSpec.describe "GET /api/v1/tickets/:id（根拠）", type: :request do
  it "項目ごとに根拠を含めて返す" do
    ticket = Ticket.create!(title: "要件の確認")
    item = ticket.items.create!(kind: "confirmed", body: "対象はWeb版のみ")
    item.evidences.create!(memo: "打ち合わせで確認")

    get "/api/v1/tickets/#{ticket.id}"

    items = JSON.parse(response.body)["items"]
    expect(items.first["evidences"].map { |e| e["memo"] }).to eq ["打ち合わせで確認"]
  end
end
