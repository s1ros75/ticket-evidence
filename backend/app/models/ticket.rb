class Ticket < ApplicationRecord
  STATUSES = %w[investigating in_review done].freeze

  validates :title, presence: true
  validates :status, inclusion: { in: STATUSES }
end