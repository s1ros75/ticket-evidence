module Api
  module V1
    module Tickets
      class ItemsController < ApplicationController
        def create
          ticket = Ticket.find(params[:ticket_id])
          item = ticket.items.new(item_params)

          if item.save
            render json: item, status: :created
          else
            render json: { errors: item.errors.full_messages }, status: :unprocessable_entity
          end
        end

        private

        def item_params
          params.require(:item).permit(:kind, :body)
        end
      end
    end
  end
end
