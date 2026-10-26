require "rails_helper"

RSpec.describe ApproveTicket do
  let(:ticket) { Ticket.create!(title: "要件の確認", status: "in_review") }

  it "レビュー中のチケットを完了にする" do
    result = described_class.call(ticket: ticket)

    expect(result).to be_success
    expect(ticket.reload.status).to eq "done"
  end

  it "レビュー中でなければ完了にできない" do
    ticket.update!(status: "investigating")

    result = described_class.call(ticket: ticket)

    expect(result).not_to be_success
    expect(result.errors).to eq ["レビュー中のチケットだけ完了にできます"]
    expect(ticket.reload.status).to eq "investigating"
  end
end
