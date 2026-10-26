require "rails_helper"

RSpec.describe RequestTicketReview do
  let(:user) { create_user }
  let(:ticket) { Ticket.create!(title: "要件の確認") }

  it "不明点がなければ、レビュー中に進める" do
    ticket.items.create!(kind: "confirmed", body: "対象はWeb版のみ")

    result = described_class.call(user: user, ticket: ticket)

    expect(result).to be_success
    expect(ticket.reload.status).to eq "in_review"
  end

  it "仮定が残っていても、レビュー中に進める" do
    ticket.items.create!(kind: "assumption", body: "既存の会員情報を使う")

    result = described_class.call(user: user, ticket: ticket)

    expect(result).to be_success
    expect(ticket.reload.status).to eq "in_review"
  end

  it "不明点が残っていれば進めず、残数をエラーで返す" do
    ticket.items.create!(kind: "unknown", body: "締め切りはいつか")
    ticket.items.create!(kind: "unknown", body: "支払い方法は何があるか")

    result = described_class.call(user: user, ticket: ticket)

    expect(result).not_to be_success
    expect(result.errors).to eq ["不明点が2件残っているため、レビュー依頼に進めません"]
    expect(ticket.reload.status).to eq "investigating"
  end

  it "調査中でなければ進めない" do
    ticket.update!(status: "done")

    result = described_class.call(user: user, ticket: ticket)

    expect(result).not_to be_success
    expect(ticket.reload.status).to eq "done"
  end

  it "レビュー依頼を、操作した人とステータスの変更前後つきで履歴に残す" do
    described_class.call(user: user, ticket: ticket)

    event = ticket.events.sole
    expect([event.user, event.action, event.details]).to eq [user, "review_requested", { "status" => %w[investigating in_review] }]
  end

  it "進めなかったときは、履歴を残さない" do
    ticket.items.create!(kind: "unknown", body: "締め切りはいつか")

    described_class.call(user: user, ticket: ticket)

    expect(ticket.events).to be_empty
  end
end
