module Api
  module V1
    module Tickets
      class ItemsController < ApplicationController
        def create
          ticket = Ticket.find(params[:ticket_id])
          item = ticket.items.new(item_params)

          if item.save
            render json: item.as_json(include: :evidences), status: :created
          else
            render json: { errors: item.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def resolve
          item = Ticket.find(params[:ticket_id]).items.find(params[:id])
          result = ResolveTicketItem.call(item: item, evidence_params: evidence_params)

          if result.success?
            render json: result.item.as_json(include: :evidences)
          else
            render json: { errors: result.errors }, status: :unprocessable_entity
          end
        end

        private

        def item_params
          params.require(:item).permit(:kind, :body)
        end

        def evidence_params
          params.require(:evidence).permit(:url, :memo)
        end
      end
    end
  end
end
