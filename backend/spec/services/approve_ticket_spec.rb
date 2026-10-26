require "rails_helper"

RSpec.describe ApproveTicket do
  let(:user) { create_user }
  let(:ticket) { Ticket.create!(title: "要件の確認", status: "in_review") }

  it "レビュー中のチケットを完了にする" do
    result = described_class.call(user: user, ticket: ticket)

    expect(result).to be_success
    expect(ticket.reload.status).to eq "done"
  end

  it "レビュー中でなければ完了にできない" do
    ticket.update!(status: "investigating")

    result = described_class.call(user: user, ticket: ticket)

    expect(result).not_to be_success
    expect(result.errors).to eq ["レビュー中のチケットだけ完了にできます"]
    expect(ticket.reload.status).to eq "investigating"
  end

  it "完了を、ステータスの変更前後つきで履歴に残す" do
    described_class.call(user: user, ticket: ticket)

    event = ticket.events.sole
    expect([event.user, event.action, event.details]).to eq [user, "approved", { "status" => %w[in_review done] }]
  end

  describe "自分で依頼したチケット" do
    let(:requester) { create_user(role: "reviewer", email: "requester@example.com") }

    before do
      ticket.events.create!(user: requester, action: "review_requested", details: { status: %w[investigating in_review] })
    end

    it "レビュー依頼した本人は完了にできない" do
      result = described_class.call(user: requester, ticket: ticket)

      expect(result).not_to be_success
      expect(result.errors).to eq ["自分でレビュー依頼したチケットは、別のレビュアーが確認します"]
      expect(ticket.reload.status).to eq "in_review"
    end

    it "別のレビュアーなら完了にできる" do
      expect(described_class.call(user: user, ticket: ticket)).to be_success
    end
  end
end
