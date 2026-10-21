require "rails_helper"

RSpec.describe Evidence, type: :model do
  let(:item) { Ticket.create!(title: "要件の確認").items.create!(kind: "unknown", body: "締め切りはいつか") }

  describe "validations" do
    it "メモだけでも有効" do
      expect(item.evidences.new(memo: "顧客に電話で確認した")).to be_valid
    end

    it "リンクだけでも有効" do
      expect(item.evidences.new(url: "https://example.com/minutes/1")).to be_valid
    end

    it "リンクもメモもなければ無効" do
      evidence = item.evidences.new(url: "", memo: "")
      expect(evidence).not_to be_valid
      expect(evidence.errors[:base]).to be_present
    end

    it "http/https以外のリンクは無効" do
      expect(item.evidences.new(url: "javascript:alert(1)")).not_to be_valid
      expect(item.evidences.new(url: "ftp://example.com/file")).not_to be_valid
    end

    it "URLとして読めないリンクは無効" do
      expect(item.evidences.new(url: "議事録のどこか")).not_to be_valid
    end
  end
end
