require "rails_helper"

RSpec.describe "db/seeds.rb" do
  def load_seeds
    ENV["SEED_DEMO"] = "1"
    Rails.application.load_seed
  ensure
    ENV.delete("SEED_DEMO")
  end

  it "デモのアカウントとチケットを、決めたルールどおりの状態で作る" do
    load_seeds

    sample = Organization.find_by!(name: "株式会社サンプル")
    demo = Organization.find_by!(name: "合同会社デモ")
    expect(sample.users.pluck(:email)).to contain_exactly("member@example.com", "reviewer@example.com", "reviewer2@example.com")
    expect(demo.users.pluck(:email)).to contain_exactly("demo-admin@example.com", "demo-member@example.com")
    expect(User.find_by!(email: "reviewer@example.com")).to be_admin
    expect(User.find_by!(email: "demo-admin@example.com")).to be_admin
    expect(sample.tickets.group(:status).count).to eq("investigating" => 2, "in_review" => 2, "done" => 1)
    expect(demo.tickets.count).to eq 2
    expect(Evidence.count).to be_positive
    expect(TicketEvent.where(action: "sent_back").count).to eq 1
  end

  it "何度実行しても、アカウントもチケットも増えない" do
    load_seeds

    expect { load_seeds }.not_to change { [Organization.count, User.count, Ticket.count, TicketEvent.count] }
  end

  it "SEED_DEMO を付けなければ、開発環境以外では何も作らない" do
    Rails.application.load_seed

    expect(User.count).to eq 0
  end
end
