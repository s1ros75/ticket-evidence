require "rails_helper"

RSpec.describe TicketListQuery do
  def titles(page)
    page.tickets.map(&:title)
  end

  it "新しい順に、指定した件数まで返し、続きがあれば次のカーソルを返す" do
    create_ticket(title: "1", created_at: 3.days.ago)
    create_ticket(title: "2", created_at: 2.days.ago)
    create_ticket(title: "3", created_at: 1.day.ago)

    page = described_class.call(tickets: default_organization.tickets, per_page: 2)

    expect(titles(page)).to eq %w[3 2]
    expect(page.next_cursor).to be_present
  end

  it "カーソルを渡すと、その続きから返し、最後のページでは次のカーソルを返さない" do
    create_ticket(title: "1", created_at: 3.days.ago)
    create_ticket(title: "2", created_at: 2.days.ago)
    create_ticket(title: "3", created_at: 1.day.ago)

    first = described_class.call(tickets: default_organization.tickets, per_page: 2)
    second = described_class.call(tickets: default_organization.tickets, per_page: 2, cursor: first.next_cursor)

    expect(titles(second)).to eq %w[1]
    expect(second.next_cursor).to be_nil
  end

  it "件数がちょうど1ページ分のときは、次のカーソルを返さない" do
    create_ticket(title: "1", created_at: 2.days.ago)
    create_ticket(title: "2", created_at: 1.day.ago)

    page = described_class.call(tickets: default_organization.tickets, per_page: 2)

    expect(titles(page)).to eq %w[2 1]
    expect(page.next_cursor).to be_nil
  end

  it "作成日時が同じチケットがあっても、idの順で並び、ページをまたいで重複も抜けもない" do
    same_time = Time.zone.parse("2026-10-01 10:00:00.123456")
    created = Array.new(5) { |i| create_ticket(title: "同時#{i}", created_at: same_time) }

    seen = []
    cursor = nil
    loop do
      page = described_class.call(tickets: default_organization.tickets, per_page: 2, cursor: cursor)
      seen.concat(page.tickets.map(&:id))
      cursor = page.next_cursor
      break if cursor.nil?
    end

    expect(seen).to eq created.map(&:id).sort.reverse
  end

  it "1ページ目を取ったあとに新しいチケットが作られても、2ページ目がずれない" do
    create_ticket(title: "1", created_at: 3.days.ago)
    create_ticket(title: "2", created_at: 2.days.ago)
    create_ticket(title: "3", created_at: 1.day.ago)

    first = described_class.call(tickets: default_organization.tickets, per_page: 2)
    create_ticket(title: "あとから作られた")
    second = described_class.call(tickets: default_organization.tickets, per_page: 2, cursor: first.next_cursor)

    expect(titles(second)).to eq %w[1]
  end

  it "ステータスの絞り込みと組み合わせられる" do
    create_ticket(title: "完了1", status: "done", created_at: 4.days.ago)
    create_ticket(title: "調査中", status: "investigating", created_at: 3.days.ago)
    create_ticket(title: "完了2", status: "done", created_at: 2.days.ago)
    create_ticket(title: "完了3", status: "done", created_at: 1.day.ago)

    first = described_class.call(tickets: default_organization.tickets, status: "done", per_page: 2)
    second = described_class.call(tickets: default_organization.tickets, status: "done", per_page: 2, cursor: first.next_cursor)

    expect(titles(first)).to eq %w[完了3 完了2]
    expect(titles(second)).to eq %w[完了1]
  end

  it "渡されたチケットの範囲（組織）の中だけから返す" do
    mine = create_ticket(title: "自分の組織")
    create_ticket(organization: Organization.create!(name: "別の組織"), title: "別の組織")

    page = described_class.call(tickets: default_organization.tickets)

    expect(page.tickets).to eq [mine]
  end

  it "チケットごとに、残っている不明点の数を返す" do
    ticket = create_ticket(title: "不明点がある")
    ticket.items.create!(kind: "unknown", body: "締め切りはいつか")
    ticket.items.create!(kind: "confirmed", body: "対象はWeb版のみ")

    page = described_class.call(tickets: default_organization.tickets)

    expect(page.tickets.first.unknown_count).to eq 1
  end

  it "読めないカーソルは InvalidCursor にする" do
    ["壊れた値", Base64.urlsafe_encode64("[1,2]"), Base64.urlsafe_encode64('["日時ではない",1]')].each do |cursor|
      expect { described_class.call(tickets: default_organization.tickets, cursor: cursor) }.to raise_error(TicketListQuery::InvalidCursor)
    end
  end
end
