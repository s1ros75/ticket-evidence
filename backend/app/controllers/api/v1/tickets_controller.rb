module Api
  module V1
    class TicketsController < ApplicationController
      def index
        tickets = Ticket.with_unknown_count.order(created_at: :desc)
        tickets = tickets.where(status: params[:status].to_s) if params[:status].present?

        render json: tickets
      end

      def show
        render_detail(params[:id])
      end

      def create
        ticket = Ticket.new(ticket_params)

        if ticket.save
          render json: ticket, status: :created
        else
          render json: { errors: ticket.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def request_review
        ticket = Ticket.find(params[:id])
        result = RequestTicketReview.call(ticket: ticket)

        if result.success?
          render json: result.ticket
        else
          render json: { errors: result.errors }, status: :unprocessable_entity
        end
      end

      def approve
        result = ApproveTicket.call(ticket: Ticket.find(params[:id]))

        if result.success?
          render json: result.ticket
        else
          render json: { errors: result.errors }, status: :unprocessable_entity
        end
      end

      # 差し戻すと不明点が増えるので、項目も含めた詳細を返す
      def send_back
        result = SendBackTicket.call(ticket: Ticket.find(params[:id]), reason: params[:reason].to_s)

        if result.success?
          render_detail(result.ticket.id)
        else
          render json: { errors: result.errors }, status: :unprocessable_entity
        end
      end

      private

      def render_detail(id)
        ticket = Ticket.includes(items: :evidences).find(id)

        render json: ticket.as_json(include: { items: { include: :evidences } })
      end

      def ticket_params
        params.require(:ticket).permit(:title, :description)
      end
    end
  end
end