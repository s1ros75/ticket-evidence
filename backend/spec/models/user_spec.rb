require "rails_helper"

RSpec.describe User, type: :model do
  def build_user(**attributes)
    User.new(name: "担当者", email: "member@example.com", password: "password123", **attributes)
  end

  it "名前・メール・パスワードがあれば有効で、ロールの初期値は担当者" do
    user = build_user
    expect(user).to be_valid
    expect(user.role).to eq "member"
  end

  it "メールは前後の空白を除き、小文字にそろえる" do
    expect(build_user(email: " Member@Example.COM ").email).to eq "member@example.com"
  end

  it "同じメールは登録できない" do
    build_user.save!
    expect(build_user(email: "MEMBER@example.com")).not_to be_valid
  end

  it "決められた以外のロールは無効" do
    expect(build_user(role: "admin")).not_to be_valid
  end

  it "パスワードがなければ無効" do
    expect(build_user(password: nil)).not_to be_valid
  end

  it "メールとパスワードで本人を確かめられる" do
    user = build_user.tap(&:save!)

    expect(User.authenticate_by(email: "member@example.com", password: "password123")).to eq user
    expect(User.authenticate_by(email: "member@example.com", password: "wrong")).to be_nil
  end
end
