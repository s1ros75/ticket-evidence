require "rails_helper"

RSpec.describe SignUpOrganization do
  def call(**overrides)
    described_class.call(
      organization_name: "株式会社はじめて", name: "田中", email: "tanaka@example.com", password: "correct-horse-battery",
      **overrides
    )
  end

  it "組織と、その組織のレビュアー兼管理者を作る" do
    result = call

    expect(result).to be_success
    expect(result.user.organization.name).to eq "株式会社はじめて"
    expect(result.user).to have_attributes(role: "reviewer", admin: true)
  end

  it "検証のあとで同じメールアドレスが先に登録されても（DBの一意制約）、誤りを返し、作った組織も取り消す" do
    allow_any_instance_of(User).to receive(:save!).and_raise(ActiveRecord::RecordNotUnique)

    result = call

    expect(result).not_to be_success
    expect(result.errors).to eq ["メールアドレスはすでに使われています"]
    expect(Organization.count).to eq 0
  end

  it "アカウントを保存できなければ、作った組織も取り消す" do
    result = call(password: "short")

    expect(result).not_to be_success
    expect(Organization.count).to eq 0
    expect(User.count).to eq 0
  end
end
