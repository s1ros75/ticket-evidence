class User < ApplicationRecord
  # member: 担当者、reviewer: レビュアー（完了・差し戻しができる）
  ROLES = %w[member reviewer].freeze

  MINIMUM_PASSWORD_LENGTH = 12

  has_secure_password
  has_many :user_sessions, dependent: :destroy

  normalizes :email, with: ->(email) { email.strip.downcase }

  validates :name, presence: true
  validates :email, presence: true, uniqueness: true
  validates :role, inclusion: { in: ROLES }
  validates :password, length: { minimum: MINIMUM_PASSWORD_LENGTH }, allow_nil: true

  # パスワードを変えたら、ほかの場所でログインしたままのセッション（盗まれたものも含む）を無効にする
  after_update -> { user_sessions.destroy_all }, if: :saved_change_to_password_digest?

  def reviewer?
    role == "reviewer"
  end

  # パスワードのハッシュなどを画面に返さないよう、出す項目を決めておく
  def as_json(options = {})
    super({ only: %i[id name email role] }.merge(options))
  end
end
