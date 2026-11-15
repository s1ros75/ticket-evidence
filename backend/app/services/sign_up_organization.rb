# 新しい組織を申し込む。組織と、最初のアカウント（レビュアー兼管理者）を必ずまとめて作る
#
# - 組織とアカウントの両方を先に検証し、誤りはまとめて返す（片方を直したら、もう片方の誤りが出てくる、を避ける）
# - 保存は1つのトランザクションで行い、組織だけ・アカウントだけが残ることを起こさない
# - 最初のアカウントは、メンバーを追加できるよう必ず管理者にする。ロールや管理者の印は利用者に選ばせない
class SignUpOrganization
  Result = Struct.new(:user, :errors, keyword_init: true) do
    def success?
      errors.empty?
    end
  end

  def self.call(...)
    new(...).call
  end

  def initialize(organization_name:, name:, email:, password:)
    @organization = Organization.new(name: organization_name)
    # organization.users.new で作ると、組織を検証するときにアカウントも検証され、
    # 「Usersが正しくありません」という利用者には意味の分からない誤りが加わる。別々に作って、それぞれ1回ずつ検証する
    @user = User.new(organization: @organization, name: name, email: email, password: password,
                     role: "reviewer", admin: true)
  end

  def call
    errors = validation_errors
    return Result.new(user: nil, errors: errors) if errors.any?

    ActiveRecord::Base.transaction do
      @organization.save!
      @user.save!
    end
    Result.new(user: @user, errors: [])
  rescue ActiveRecord::RecordNotUnique
    # 検証のあとで、同じメールアドレスが別の申し込みで先に登録された場合（DBの一意制約で止まる）
    Result.new(user: nil, errors: [@user.errors.full_message(:email, I18n.t("errors.messages.taken"))])
  end

  private

  def validation_errors
    # 両方の誤りを集めるため、片方が無効でももう片方も検証する（&& で短絡させない）
    organization_valid = @organization.valid?
    user_valid = @user.valid?
    return [] if organization_valid && user_valid

    @organization.errors.full_messages + @user.errors.full_messages
  end
end
