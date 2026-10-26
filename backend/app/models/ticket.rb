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

  # レビュー中のチケットを、最後にレビュー依頼した人。依頼した本人は完了・差し戻しができない
  def review_requester
    return unless status == "in_review"

    events.where(action: "review_requested").order(created_at: :desc, id: :desc).first&.user
  end
  validates :status, inclusion: { in: STATUSES }
end
