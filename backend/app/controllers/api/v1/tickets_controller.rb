module Api
  module V1
    class TicketsController < ApplicationController
      def index
        tickets = Ticket.order(created_at: :desc)
        tickets = tickets.where(status: params[:status].to_s) if params[:status].present?

        render json: tickets
      end

      def show
        ticket = Ticket.includes(items: :evidences).find(params[:id])

        render json: ticket.as_json(include: { items: { include: :evidences } })
      end

      def create
        ticket = Ticket.new(ticket_params)

        if ticket.save
          render json: ticket, status: :created
        else
          render json: { errors: ticket.errors.full_messages }, status: :unprocessable_entity
        end
      end

      private

      def ticket_params
        params.require(:ticket).permit(:title, :description)
      end
    end
  end
end