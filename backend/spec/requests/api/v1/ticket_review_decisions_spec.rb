require "rails_helper"

RSpec.describe "POST /api/v1/tickets/:id/approve", type: :request do
  it "レビュー中のチケットを完了にして返す" do
    ticket = Ticket.create!(title: "要件の確認", status: "in_review")

    post "/api/v1/tickets/#{ticket.id}/approve", as: :json

    expect(response).to have_http_status(200)
    expect(JSON.parse(response.body)["status"]).to eq "done"
  end

  it "レビュー中でなければ422を返す" do
    ticket = Ticket.create!(title: "要件の確認")

    post "/api/v1/tickets/#{ticket.id}/approve", as: :json

    expect(response).to have_http_status(422)
  end
end

RSpec.describe "POST /api/v1/tickets/:id/send_back", type: :request do
  let(:ticket) { Ticket.create!(title: "要件の確認", status: "in_review") }

  it "調査中に戻したチケットを、追加した不明点も含めて返す" do
    post "/api/v1/tickets/#{ticket.id}/send_back",
         params: { reason: "退会時のデータの扱いが書かれていない" },
         as: :json

    expect(response).to have_http_status(200)
    body = JSON.parse(response.body)
    expect(body["status"]).to eq "investigating"
    expect(body["items"].map { |item| [item["kind"], item["body"]] }).to eq [["unknown", "退会時のデータの扱いが書かれていない"]]
  end

  it "理由が空なら422を返す" do
    post "/api/v1/tickets/#{ticket.id}/send_back", params: { reason: "" }, as: :json

    expect(response).to have_http_status(422)
    expect(ticket.reload.status).to eq "in_review"
  end
end
