module Api
  module V1
    class DashboardsController < ApplicationController
      def show
        counts = Ticket.group(:status).count
        # 件数が0のステータスも、画面でそのまま0と出せるように必ず含める
        status_counts = Ticket::STATUSES.index_with { |status| counts.fetch(status, 0) }

        investigating_with_unknowns = Ticket.where(status: "investigating")
                                            .where(id: TicketItem.where(kind: "unknown").select(:ticket_id))
                                            .count

        render json: { status_counts: status_counts, investigating_with_unknowns: investigating_with_unknowns }
      end
    end
  end
end
