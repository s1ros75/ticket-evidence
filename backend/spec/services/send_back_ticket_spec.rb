require "rails_helper"

RSpec.describe SendBackTicket do
  let(:user) { create_user }
  let(:ticket) { Ticket.create!(title: "要件の確認", status: "in_review") }

  it "調査中に戻し、差し戻しの理由を不明点として残す" do
    result = described_class.call(user: user, ticket: ticket, reason: "退会時のデータの扱いが書かれていない")

    expect(result).to be_success
    ticket.reload
    expect(ticket.status).to eq "investigating"
    expect(ticket.items.map { |item| [item.kind, item.body] }).to eq [["unknown", "退会時のデータの扱いが書かれていない"]]
  end

  it "差し戻したあとは、理由を解決するまでレビュー依頼に進めない" do
    described_class.call(user: user, ticket: ticket, reason: "退会時のデータの扱いが書かれていない")

    expect(RequestTicketReview.call(user: user, ticket: ticket.reload)).not_to be_success
  end

  it "理由がなければ差し戻せず、何も変わらない" do
    result = described_class.call(user: user, ticket: ticket, reason: " ")

    expect(result).not_to be_success
    expect(result.errors).to be_present
    ticket.reload
    expect(ticket.status).to eq "in_review"
    expect(ticket.items).to be_empty
  end

  it "レビュー中でなければ差し戻せない" do
    ticket.update!(status: "done")

    result = described_class.call(user: user, ticket: ticket, reason: "理由")

    expect(result).not_to be_success
    expect(result.errors).to eq ["レビュー中のチケットだけ差し戻せます"]
    expect(ticket.reload.items).to be_empty
  end

  it "差し戻しを、ステータスの変更前後と理由つきで履歴に残す" do
    described_class.call(user: user, ticket: ticket, reason: "退会時のデータの扱いが書かれていない")

    event = ticket.events.sole
    expect([event.user, event.action]).to eq [user, "sent_back"]
    expect(event.details).to eq("status" => %w[in_review investigating], "reason" => "退会時のデータの扱いが書かれていない")
  end

  describe "自分で依頼したチケット" do
    let(:requester) { create_user(role: "reviewer", email: "requester@example.com") }

    before do
      ticket.events.create!(user: requester, action: "review_requested", details: { status: %w[investigating in_review] })
    end

    it "レビュー依頼した本人は差し戻せない" do
      result = described_class.call(user: requester, ticket: ticket, reason: "理由")

      expect(result).not_to be_success
      expect(result.errors).to eq ["自分でレビュー依頼したチケットは、別のレビュアーが確認します"]
      expect(ticket.reload.status).to eq "in_review"
    end

    it "別のレビュアーなら差し戻せる" do
      expect(described_class.call(user: user, ticket: ticket, reason: "理由")).to be_success
    end
  end
end
