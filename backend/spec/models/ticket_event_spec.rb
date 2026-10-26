require "rails_helper"

RSpec.describe TicketEvent, type: :model do
  let(:ticket) { Ticket.create!(title: "要件の確認") }
  let(:user) { create_user }

  it "決められた操作なら有効" do
    expect(ticket.events.new(user: user, action: "ticket_created")).to be_valid
  end

  it "決められた以外の操作は無効" do
    expect(ticket.events.new(user: user, action: "deleted")).not_to be_valid
  end

  it "操作した人がいなければ無効" do
    expect(ticket.events.new(action: "ticket_created")).not_to be_valid
  end
end
