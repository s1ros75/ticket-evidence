class TicketItem < ApplicationRecord
  # 確認済み・不明点・仮定を同じテーブルで種別分けする（docs/design.md）
  KINDS = %w[confirmed unknown assumption].freeze
  RESOLVABLE_KINDS = %w[unknown assumption].freeze

  belongs_to :ticket
  has_many :evidences, -> { order(:created_at, :id) }, dependent: :destroy

  validates :kind, inclusion: { in: KINDS }
  validates :body, presence: true

  def resolvable?
    RESOLVABLE_KINDS.include?(kind)
  end
end
