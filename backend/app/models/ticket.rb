class Ticket < ApplicationRecord
  STATUSES = %w[investigating in_review done].freeze

  has_many :items, -> { order(:created_at, :id) }, class_name: "TicketItem", dependent: :destroy
  has_many :events, class_name: "TicketEvent", dependent: :destroy

  # 一覧で使う。チケットごとにSQLを発行しないよう、残っている不明点の数をサブクエリで一緒に取る
  scope :with_unknown_count, -> {
    unknowns = TicketItem.where(kind: "unknown").where(TicketItem.arel_table[:ticket_id].eq(arel_table[:id]))
    select(arel_table[Arel.star], unknowns.select(Arel.star.count).arel.as("unknown_count"))
  }

  validates :title, presence: true
  validates :status, inclusion: { in: STATUSES }
end
