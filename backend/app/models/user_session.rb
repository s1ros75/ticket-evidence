class UserSession < ApplicationRecord
  # 操作がないまま、この時間を過ぎるとログインが切れる
  IDLE_TIMEOUT = 2.hours
  # 操作を続けていても、ログインからこの時間を過ぎるとログインが切れる
  ABSOLUTE_TIMEOUT = 12.hours

  belongs_to :user

  before_validation { self.last_active_at ||= Time.current }

  def expired?(now = Time.current)
    now > last_active_at + IDLE_TIMEOUT || now > created_at + ABSOLUTE_TIMEOUT
  end

  # リクエストのたびに書き込まないよう、1分以上たっているときだけ更新する
  def record_activity!(now = Time.current)
    update_column(:last_active_at, now) if last_active_at < now - 1.minute
  end
end
