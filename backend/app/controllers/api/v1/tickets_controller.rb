module Api
  module V1
    class TicketsController < ApplicationController
      before_action :require_reviewer, only: [:approve, :send_back]

      # 50件ずつ返す。続きがあるときは next_cursor を返し、次はそれを cursor に付けて呼ぶ
      def index
        page = TicketListQuery.call(status: params[:status].to_s, cursor: params[:cursor].to_s)

        render json: { tickets: page.tickets, next_cursor: page.next_cursor }
      rescue TicketListQuery::InvalidCursor
        render json: { errors: ["cursorが正しくありません"] }, status: :bad_request
      end

      def show
        render_detail(params[:id])
      end

      def create
        ticket = Ticket.new(ticket_params)
        created = Ticket.transaction do
          next false unless ticket.save

          ticket.events.create!(user: current_user, action: "ticket_created", details: { title: ticket.title })
          true
        end

        if created
          render json: ticket, status: :created
        else
          render json: { errors: ticket.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def request_review
        ticket = Ticket.find(params[:id])
        result = RequestTicketReview.call(user: current_user, ticket: ticket)

        if result.success?
          render json: result.ticket
        else
          render json: { errors: result.errors }, status: :unprocessable_entity
        end
      end

      def approve
        result = ApproveTicket.call(user: current_user, ticket: Ticket.find(params[:id]))

        if result.success?
          render json: result.ticket
        else
          render json: { errors: result.errors }, status: :unprocessable_entity
        end
      end

      # 差し戻すと不明点が増えるので、項目も含めた詳細を返す
      def send_back
        result = SendBackTicket.call(user: current_user, ticket: Ticket.find(params[:id]), reason: params[:reason].to_s)

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
                           .merge(review_requester: ticket.review_requester&.as_json(only: %i[id name]))
      end

      def ticket_params
        params.require(:ticket).permit(:title, :description)
      end
    end
  end
end