module Api
  module V1
    class TicketsController < ApplicationController
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