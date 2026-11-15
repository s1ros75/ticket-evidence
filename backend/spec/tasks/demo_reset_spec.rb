require "rails_helper"
require "rake"

RSpec.describe "demo:reset" do
  before(:all) { Rails.application.load_tasks if Rake::Task.tasks.empty? }

  def run_task
    Rake::Task["demo:reset"].reenable
    Rake::Task["demo:reset"].invoke
  end

  it "デモモードなら、データを消してデモのデータを作り直す" do
    Rails.application.config.x.demo_mode = true
    visitor_ticket = create_ticket(title: "訪問者が作ったチケット")

    run_task

    expect(Ticket.exists?(visitor_ticket.id)).to be false
    # 組織を2つ作り、別の組織でログインするとデータが見えないことを試せるようにする
    expect(Organization.pluck(:name)).to contain_exactly("株式会社サンプル", "合同会社デモ")
    expect(Organization.find_by!(name: "株式会社サンプル").tickets.count).to eq 5
    expect(Organization.find_by!(name: "合同会社デモ").tickets.count).to eq 2
    expect(User.count).to eq 5
  ensure
    Rails.application.config.x.demo_mode = false
  end

  it "デモモードでなければ、何も消さずに止まる" do
    create_ticket(title: "本物のチケット")

    expect { run_task }.to raise_error(/DEMO_MODE/)
    expect(Ticket.count).to eq 1
  end
end
