# レビュー中のチケットを完了にする
class ApproveTicket
  Result = Struct.new(:ticket, :errors, keyword_init: true) do
    def success?
      errors.empty?
    end
  end

  def self.call(...)
    new(...).call
  end

  def initialize(ticket:)
    @ticket = ticket
  end

  def call
    errors = []

    Ticket.transaction do
      @ticket.lock!

      if @ticket.status != "in_review"
        errors << "レビュー中のチケットだけ完了にできます"
        raise ActiveRecord::Rollback
      end

      @ticket.update!(status: "done")
    end

    Result.new(ticket: @ticket, errors: errors)
  end
end
