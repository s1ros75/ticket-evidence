class TicketEvent < ApplicationRecord
  ACTIONS = %w[
    ticket_created
    item_added
    item_resolved
    review_requested
    approved
    sent_back
  ].freeze

  belongs_to :ticket
  belongs_to :user

  validates :action, inclusion: { in: ACTIONS }

  def as_json(options = {})
    super({ only: %i[id action details created_at], include: { user: { only: %i[id name] } } }.merge(options))
  end
end
