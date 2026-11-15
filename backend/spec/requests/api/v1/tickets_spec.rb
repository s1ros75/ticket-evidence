require "rails_helper"

RSpec.describe "POST /api/v1/tickets", type: :request do
  before { sign_in }

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
  before { sign_in }

  it "チケットの一覧を、新しい順に返す" do
    create_ticket(title: "古いチケット", created_at: 2.days.ago)
    create_ticket(title: "新しいチケット")

    get "/api/v1/tickets"

    expect(response).to have_http_status(200)
    titles = JSON.parse(response.body)["tickets"].map { |ticket| ticket["title"] }
    expect(titles).to eq ["新しいチケット", "古いチケット"]
  end

  it "statusで絞り込める" do
    create_ticket(title: "調査中のチケット", status: "investigating")
    create_ticket(title: "完了したチケット", status: "done")

    get "/api/v1/tickets", params: { status: "done" }

    titles = JSON.parse(response.body)["tickets"].map { |ticket| ticket["title"] }
    expect(titles).to eq ["完了したチケット"]
  end

  it "50件ずつ返し、next_cursorで続きを取れる" do
    51.times { |i| create_ticket(title: "チケット#{i}", created_at: (51 - i).minutes.ago) }

    get "/api/v1/tickets"
    first = JSON.parse(response.body)
    get "/api/v1/tickets", params: { cursor: first["next_cursor"] }
    second = JSON.parse(response.body)

    expect(first["tickets"].size).to eq 50
    expect(second["tickets"].map { |ticket| ticket["title"] }).to eq ["チケット0"]
    expect(second["next_cursor"]).to be_nil
  end

  it "読めないcursorなら400を返す" do
    get "/api/v1/tickets", params: { cursor: "壊れた値" }

    expect(response).to have_http_status(400)
    expect(JSON.parse(response.body)["errors"]).to eq ["cursorが正しくありません"]
  end

  it "チケットごとに、残っている不明点の数を返す" do
    with_unknowns = create_ticket(title: "不明点があるチケット")
    with_unknowns.items.create!(kind: "unknown", body: "締め切りはいつか")
    with_unknowns.items.create!(kind: "unknown", body: "支払い方法は何があるか")
    with_unknowns.items.create!(kind: "confirmed", body: "対象はWeb版のみ")
    with_unknowns.items.create!(kind: "assumption", body: "既存の会員情報を使う")
    create_ticket(title: "不明点がないチケット", created_at: 1.day.ago)

    get "/api/v1/tickets"

    counts = JSON.parse(response.body)["tickets"].to_h { |ticket| [ticket["title"], ticket["unknown_count"]] }
    expect(counts).to eq("不明点があるチケット" => 2, "不明点がないチケット" => 0)
  end
end
