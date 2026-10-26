class User < ApplicationRecord
  # member: 担当者、reviewer: レビュアー（完了・差し戻しができる）
  ROLES = %w[member reviewer].freeze

  has_secure_password

  normalizes :email, with: ->(email) { email.strip.downcase }

  validates :name, presence: true
  validates :email, presence: true, uniqueness: true
  validates :role, inclusion: { in: ROLES }

  def reviewer?
    role == "reviewer"
  end

  # パスワードのハッシュなどを画面に返さないよう、出す項目を決めておく
  def as_json(options = {})
    super({ only: %i[id name email role] }.merge(options))
  end
end
