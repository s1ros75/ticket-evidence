class TicketItem < ApplicationRecord
  # 確認済み・不明点・仮定を同じテーブルで種別分けする（docs/design.md）
  KINDS = %w[confirmed unknown assumption].freeze

  belongs_to :ticket

  validates :kind, inclusion: { in: KINDS }
  validates :body, presence: true
end
