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

RSpec.describe "GET /api/v1/tickets", type: :request do
  it "チケットの一覧を、新しい順に返す" do
    Ticket.create!(title: "古いチケット", created_at: 2.days.ago)
    Ticket.create!(title: "新しいチケット")

    get "/api/v1/tickets"

    expect(response).to have_http_status(200)
    titles = JSON.parse(response.body).map { |ticket| ticket["title"] }
    expect(titles).to eq ["新しいチケット", "古いチケット"]
  end

  it "statusで絞り込める" do
    Ticket.create!(title: "調査中のチケット", status: "investigating")
    Ticket.create!(title: "完了したチケット", status: "done")

    get "/api/v1/tickets", params: { status: "done" }

    titles = JSON.parse(response.body).map { |ticket| ticket["title"] }
    expect(titles).to eq ["完了したチケット"]
  end

  it "チケットごとに、残っている不明点の数を返す" do
    with_unknowns = Ticket.create!(title: "不明点があるチケット")
    with_unknowns.items.create!(kind: "unknown", body: "締め切りはいつか")
    with_unknowns.items.create!(kind: "unknown", body: "支払い方法は何があるか")
    with_unknowns.items.create!(kind: "confirmed", body: "対象はWeb版のみ")
    with_unknowns.items.create!(kind: "assumption", body: "既存の会員情報を使う")
    Ticket.create!(title: "不明点がないチケット", created_at: 1.day.ago)

    get "/api/v1/tickets"

    counts = JSON.parse(response.body).to_h { |ticket| [ticket["title"], ticket["unknown_count"]] }
    expect(counts).to eq("不明点があるチケット" => 2, "不明点がないチケット" => 0)
  end
end
