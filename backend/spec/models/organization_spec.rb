require "rails_helper"

RSpec.describe Organization, type: :model do
  it "名前があれば有効" do
    expect(Organization.new(name: "株式会社サンプル")).to be_valid
  end

  it "名前がなければ無効" do
    expect(Organization.new(name: " ")).not_to be_valid
  end

  it "ユーザーとチケットを持つ" do
    organization = Organization.create!(name: "株式会社サンプル")
    user = create_user(organization: organization)
    ticket = create_ticket(organization: organization, title: "要件の確認")

    expect(organization.users).to eq [user]
    expect(organization.tickets).to eq [ticket]
  end
end
