# レビュー中のチケットを調査中に差し戻す
# 理由は不明点として残すので、解決するまで再びレビュー依頼に進めない（RequestTicketReview）
class SendBackTicket
  Result = Struct.new(:ticket, :errors, keyword_init: true) do
    def success?
      errors.empty?
    end
  end

  def self.call(...)
    new(...).call
  end

  def initialize(user:, ticket:, reason:)
    @user = user
    @ticket = ticket
    @reason = reason
  end

  def call
    errors = []

    Ticket.transaction do
      @ticket.lock!

      if @ticket.status != "in_review"
        errors << "レビュー中のチケットだけ差し戻せます"
        raise ActiveRecord::Rollback
      end

      if @reason.blank?
        errors << "差し戻しの理由を入力してください"
        raise ActiveRecord::Rollback
      end

      @ticket.items.create!(kind: "unknown", body: @reason.strip)
      @ticket.update!(status: "investigating")
      @ticket.events.create!(
        user: @user,
        action: "sent_back",
        details: { status: %w[in_review investigating], reason: @reason.strip }
      )
    end

    Result.new(ticket: @ticket, errors: errors)
  end
end
