require "rails_helper"

RSpec.describe TicketItem, type: :model do
  let(:ticket) { Ticket.create!(title: "要件の確認") }

  describe "validations" do
    it "kindとbodyがあれば有効" do
      expect(ticket.items.new(kind: "unknown", body: "締め切りはいつか")).to be_valid
    end

    it "bodyがなければ無効" do
      item = ticket.items.new(kind: "unknown", body: "")
      expect(item).not_to be_valid
      expect(item.errors[:body]).to be_present
    end

    it "決められた以外のkindは無効" do
      expect(ticket.items.new(kind: "memo", body: "メモ")).not_to be_valid
    end

    it "チケットがなければ無効" do
      expect(TicketItem.new(kind: "confirmed", body: "本文")).not_to be_valid
    end
  end

  it "チケットを削除すると、項目も削除される" do
    ticket.items.create!(kind: "confirmed", body: "対象はWeb版のみ")

    expect { ticket.destroy }.to change(TicketItem, :count).by(-1)
  end
end
