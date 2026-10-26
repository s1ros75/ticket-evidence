# チケットをレビュー依頼に進める。不明点が残っていれば進めない
# ルールを画面ではなくここに置き、どの入口から呼ばれても必ず守られるようにする（docs/design.md）
class RequestTicketReview
  Result = Struct.new(:ticket, :errors, keyword_init: true) do
    def success?
      errors.empty?
    end
  end

  def self.call(...)
    new(...).call
  end

  def initialize(user:, ticket:)
    @user = user
    @ticket = ticket
  end

  def call
    errors = []

    Ticket.transaction do
      @ticket.lock!

      if @ticket.status != "investigating"
        errors << "調査中のチケットだけレビュー依頼に進めます"
        raise ActiveRecord::Rollback
      end

      unknown_count = @ticket.items.where(kind: "unknown").count
      if unknown_count.positive?
        errors << "不明点が#{unknown_count}件残っているため、レビュー依頼に進めません"
        raise ActiveRecord::Rollback
      end

      @ticket.update!(status: "in_review")
      @ticket.events.create!(user: @user, action: "review_requested", details: { status: %w[investigating in_review] })
    end

    Result.new(ticket: @ticket, errors: errors)
  end
end
