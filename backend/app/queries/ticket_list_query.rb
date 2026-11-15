# チケット一覧を、新しい順に一定の件数ずつ返す
#
# ページ送りは「最後に返したチケットの続きから」取るキーセット方式にしている。
# 「先頭から○件読み飛ばす」方式（OFFSET）は、後ろのページほど読み飛ばす件数が増えて遅くなり、
# 見ている間に新しいチケットが作られると、同じチケットが2回出たり抜けたりするため。
# 並び順は作成日時の新しい順で、作成日時が同じときは id で順番を決める。
class TicketListQuery
  PER_PAGE = 50

  class InvalidCursor < StandardError; end

  Page = Struct.new(:tickets, :next_cursor, keyword_init: true)

  def self.call(...)
    new(...).call
  end

  def initialize(status: nil, cursor: nil, per_page: PER_PAGE)
    @status = status
    @cursor = cursor
    @per_page = per_page
  end

  def call
    scope = Ticket.with_unknown_count.order(created_at: :desc, id: :desc)
    scope = scope.where(status: @status) if @status.present?
    scope = scope.where("(tickets.created_at, tickets.id) < (?, ?)", *decode(@cursor)) if @cursor.present?

    # 1件多く取り、続きがあるかどうかを件数を数えずに判断する
    records = scope.limit(@per_page + 1).to_a
    tickets = records.first(@per_page)
    next_cursor = encode(tickets.last) if records.size > @per_page

    Page.new(tickets: tickets, next_cursor: next_cursor)
  end

  private

  # 中身に依存されないよう、作成日時とidを Base64 にした文字列で渡す。
  # 作成日時はマイクロ秒まで残す（DBの精度と合わせないと、同じ日時のチケットを取りこぼす）
  def encode(ticket)
    Base64.urlsafe_encode64(JSON.generate([ticket.created_at.utc.iso8601(6), ticket.id]), padding: false)
  end

  def decode(cursor)
    created_at, id = JSON.parse(Base64.urlsafe_decode64(cursor))
    raise InvalidCursor unless created_at.is_a?(String) && id.is_a?(Integer)

    [Time.iso8601(created_at), id]
  rescue ArgumentError, JSON::ParserError, TypeError
    raise InvalidCursor
  end
end
