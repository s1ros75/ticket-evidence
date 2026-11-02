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
    visitor_ticket = Ticket.create!(title: "訪問者が作ったチケット")

    run_task

    expect(Ticket.exists?(visitor_ticket.id)).to be false
    expect(Ticket.count).to eq 5
    expect(User.count).to eq 3
  ensure
    Rails.application.config.x.demo_mode = false
  end

  it "デモモードでなければ、何も消さずに止まる" do
    Ticket.create!(title: "本物のチケット")

    expect { run_task }.to raise_error(/DEMO_MODE/)
    expect(Ticket.count).to eq 1
  end
end
