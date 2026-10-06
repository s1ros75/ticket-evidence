require "rails_helper"

RSpec.describe Ticket, type: :model do
  describe "validations" do
    it "titleがあれば有効" do
      expect(Ticket.new(title: "要件の確認")).to be_valid
    end

    it "titleがなければ無効" do
      ticket = Ticket.new(title: nil)
      expect(ticket).not_to be_valid
      expect(ticket.errors[:title]).to be_present
    end

    it "決められた以外のstatusは無効" do
      expect(Ticket.new(title: "要件の確認", status: "unknown")).not_to be_valid
    end
  end

  describe "status" do
    it "初期値は investigating" do
      expect(Ticket.new(title: "要件の確認").status).to eq "investigating"
    end
  end
end