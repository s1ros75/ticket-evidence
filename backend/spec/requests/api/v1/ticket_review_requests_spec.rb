require "rails_helper"

RSpec.describe "POST /api/v1/tickets/:id/request_review", type: :request do
  let(:ticket) { Ticket.create!(title: "要件の確認") }

  it "不明点がなければ、レビュー中になったチケットを返す" do
    post "/api/v1/tickets/#{ticket.id}/request_review", as: :json

    expect(response).to have_http_status(200)
    expect(JSON.parse(response.body)["status"]).to eq "in_review"
  end

  it "不明点が残っていれば422を返す" do
    ticket.items.create!(kind: "unknown", body: "締め切りはいつか")

    post "/api/v1/tickets/#{ticket.id}/request_review", as: :json

    expect(response).to have_http_status(422)
    expect(JSON.parse(response.body)["errors"]).to eq ["不明点が1件残っているため、レビュー依頼に進めません"]
    expect(ticket.reload.status).to eq "investigating"
  end

  it "存在しないチケットなら404を返す" do
    post "/api/v1/tickets/0/request_review", as: :json

    expect(response).to have_http_status(404)
  end
end
