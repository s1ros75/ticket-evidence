class Ticket < ApplicationRecord
  STATUSES = %w[investigating in_review done].freeze

  has_many :items, -> { order(:created_at, :id) }, class_name: "TicketItem", dependent: :destroy

  validates :title, presence: true
  validates :status, inclusion: { in: STATUSES }
end
