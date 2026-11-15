module Api
  module V1
    module Tickets
      class EventsController < ApplicationController
        def index
          ticket = current_organization.tickets.find(params[:ticket_id])

          render json: ticket.events.includes(:user).order(created_at: :desc, id: :desc)
        end
      end
    end
  end
end
