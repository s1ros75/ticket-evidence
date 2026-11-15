# チケットとアカウントを分ける単位。ユーザーは1つの組織にだけ所属する
# 他の組織のデータは見られない。API の検索は、必ずログインしている人の組織から始める（docs/design.md）
class Organization < ApplicationRecord
  # 変更履歴がユーザーを参照しているので、チケット（と履歴）を先に消してからユーザーを消す
  has_many :tickets, dependent: :destroy
  has_many :users, dependent: :destroy

  normalizes :name, with: ->(name) { name.strip }

  validates :name, presence: true

  def as_json(options = {})
    super({ only: %i[id name] }.merge(options))
  end
end
