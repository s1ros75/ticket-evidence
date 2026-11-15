require "rails_helper"

RSpec.describe User, type: :model do
  def build_user(**attributes)
    User.new(name: "担当者", email: "member@example.com", password: "correct-horse-battery", organization: default_organization,
             **attributes)
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

  # ログインはメールアドレスで本人を探すので、組織が違っても同じメールは使えない（1人1組織）
  it "別の組織でも、同じメールは登録できない" do
    build_user.save!
    other = Organization.create!(name: "別の組織")
    expect(build_user(organization: other)).not_to be_valid
  end

  it "組織がなければ無効" do
    expect(build_user(organization: nil)).not_to be_valid
  end

  it "決められた以外のロールは無効" do
    expect(build_user(role: "admin")).not_to be_valid
  end

  it "パスワードがなければ無効" do
    expect(build_user(password: nil)).not_to be_valid
  end

  it "メールとパスワードで本人を確かめられる" do
    user = build_user.tap(&:save!)

    expect(User.authenticate_by(email: "member@example.com", password: "correct-horse-battery")).to eq user
    expect(User.authenticate_by(email: "member@example.com", password: "wrong")).to be_nil
  end

  it "パスワードが12文字未満なら無効" do
    user = build_user(password: "a" * 11)
    expect(user).not_to be_valid
    expect(user.errors[:password]).to be_present
    expect(build_user(password: "a" * 12)).to be_valid
  end

  it "パスワードを変えると、ログイン中のセッションをすべて無効にする" do
    user = build_user.tap(&:save!)
    user.user_sessions.create!

    user.update!(password: "another-long-password")

    expect(user.user_sessions).to be_empty
  end

  it "名前を変えただけでは、セッションを消さない" do
    user = build_user.tap(&:save!)
    user.user_sessions.create!

    user.update!(name: "新しい名前")

    expect(user.user_sessions.count).to eq 1
  end
end

