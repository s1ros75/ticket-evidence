require "rails_helper"

RSpec.describe ResolveTicketItem do
  let(:ticket) { Ticket.create!(title: "要件の確認") }

  it "根拠を残して不明点を解決し、確認済みに変える" do
    item = ticket.items.create!(kind: "unknown", body: "締め切りはいつか")

    result = described_class.call(item: item, evidence_params: { memo: "11月末と顧客に確認した" })

    expect(result).to be_success
    item.reload
    expect(item.kind).to eq "confirmed"
    expect(item.resolved_at).to be_present
    expect(item.evidences.map(&:memo)).to eq ["11月末と顧客に確認した"]
  end

  it "仮定も根拠を残して確認済みにできる" do
    item = ticket.items.create!(kind: "assumption", body: "既存の会員情報を使う")

    result = described_class.call(item: item, evidence_params: { url: "https://example.com/spec" })

    expect(result).to be_success
    expect(item.reload.kind).to eq "confirmed"
  end

  it "根拠がなければ解決できず、何も変わらない" do
    item = ticket.items.create!(kind: "unknown", body: "締め切りはいつか")

    result = described_class.call(item: item, evidence_params: { url: "", memo: "" })

    expect(result).not_to be_success
    expect(result.errors).to be_present
    item.reload
    expect(item.kind).to eq "unknown"
    expect(item.resolved_at).to be_nil
    expect(item.evidences).to be_empty
  end

  it "確認済みの項目は解決できない" do
    item = ticket.items.create!(kind: "confirmed", body: "対象はWeb版のみ")

    result = described_class.call(item: item, evidence_params: { memo: "メモ" })

    expect(result).not_to be_success
    expect(item.evidences.count).to eq 0
  end
end
