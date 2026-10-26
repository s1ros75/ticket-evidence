require "rails_helper"

RSpec.describe "GET /api/v1/dashboard", type: :request do
  before { sign_in }

  it "ステータス別の件数と、不明点が残っている調査中のチケット数を返す" do
    with_unknowns = Ticket.create!(title: "不明点あり")
    with_unknowns.items.create!(kind: "unknown", body: "締め切りはいつか")
    with_unknowns.items.create!(kind: "unknown", body: "支払い方法は何があるか")
    Ticket.create!(title: "不明点なし")
    Ticket.create!(title: "レビュー中", status: "in_review")
    Ticket.create!(title: "完了1", status: "done")
    Ticket.create!(title: "完了2", status: "done")

    get "/api/v1/dashboard"

    expect(response).to have_http_status(200)
    expect(JSON.parse(response.body)).to eq(
      "status_counts" => { "investigating" => 2, "in_review" => 1, "done" => 2 },
      "investigating_with_unknowns" => 1
    )
  end

  it "チケットがなければ、すべて0を返す" do
    get "/api/v1/dashboard"

    expect(JSON.parse(response.body)).to eq(
      "status_counts" => { "investigating" => 0, "in_review" => 0, "done" => 0 },
      "investigating_with_unknowns" => 0
    )
  end
end
