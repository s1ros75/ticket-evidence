# 操作する人とチケットが同じ組織かを確かめる
#
# コントローラーは自分の組織のチケットしか渡さない（current_organization から探す）が、
# 将来、別の入口（管理用のタスクや別の画面など）から Service Object が呼ばれても、組織をまたいで操作させない。
# ここに来るのはプログラムの誤りなので、画面に出すエラーではなく例外にする
module OrganizationGuard
  private

  def ensure_same_organization!(user, ticket)
    return if user.organization_id == ticket.organization_id

    raise ArgumentError, "操作する人とチケットの組織が違います"
  end
end
