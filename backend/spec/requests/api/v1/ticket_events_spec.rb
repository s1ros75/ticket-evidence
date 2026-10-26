require "rails_helper"

RSpec.describe "変更履歴", type: :request do
  let!(:user) { sign_in }

  it "チケットを作ると、作成の履歴が残る" do
    post "/api/v1/tickets", params: { ticket: { title: "要件の確認" } }, as: :json

    event = Ticket.sole.events.sole
    expect([event.user, event.action, event.details]).to eq [user, "ticket_created", { "title" => "要件の確認" }]
  end

  it "項目を追加すると、追加の履歴が残る" do
    ticket = Ticket.create!(title: "要件の確認")

    post "/api/v1/tickets/#{ticket.id}/items", params: { item: { kind: "unknown", body: "締め切りはいつか" } }, as: :json

    event = ticket.events.sole
    expect([event.user, event.action]).to eq [user, "item_added"]
    expect(event.details).to eq("item_id" => ticket.items.sole.id, "kind" => "unknown", "body" => "締め切りはいつか")
  end

  it "作成に失敗したときは、履歴を残さない" do
    post "/api/v1/tickets", params: { ticket: { title: "" } }, as: :json

    expect(TicketEvent.count).to eq 0
  end

  it "GET /api/v1/tickets/:id/events は、新しい順に、操作した人の名前つきで返す" do
    ticket = Ticket.create!(title: "要件の確認")
    ticket.events.create!(user: user, action: "ticket_created", details: { title: "要件の確認" }, created_at: 1.hour.ago)
    ticket.events.create!(user: user, action: "review_requested", details: { status: %w[investigating in_review] })

    get "/api/v1/tickets/#{ticket.id}/events"

    expect(response).to have_http_status(200)
    body = JSON.parse(response.body)
    expect(body.map { |event| event["action"] }).to eq %w[review_requested ticket_created]
    expect(body.first["user"]).to eq("id" => user.id, "name" => "担当者")
    expect(body.first["details"]).to eq("status" => %w[investigating in_review])
  end
end
