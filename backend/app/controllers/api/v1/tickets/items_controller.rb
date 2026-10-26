module Api
  module V1
    module Tickets
      class ItemsController < ApplicationController
        def create
          ticket = Ticket.find(params[:ticket_id])
          item = ticket.items.new(item_params)
          created = TicketItem.transaction do
            next false unless item.save

            ticket.events.create!(
              user: current_user,
              action: "item_added",
              details: { item_id: item.id, kind: item.kind, body: item.body }
            )
            true
          end

          if created
            render json: item.as_json(include: :evidences), status: :created
          else
            render json: { errors: item.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def resolve
          item = Ticket.find(params[:ticket_id]).items.find(params[:id])
          result = ResolveTicketItem.call(user: current_user, item: item, evidence_params: evidence_params)

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
