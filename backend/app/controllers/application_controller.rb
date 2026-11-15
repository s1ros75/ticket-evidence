class ApplicationController < ActionController::API
  before_action :require_json_request
  before_action :require_login

  rescue_from ActiveRecord::RecordNotFound do
    render json: { errors: ["Not found"] }, status: :not_found
  end

  private

  def current_user
    current_user_session&.user
  end

  # API の検索は、必ずここから始める（Ticket.find のように全体から探さない）
  # 他の組織のデータは「見つからない」ことになり、RecordNotFound から 404 を返す
  def current_organization
    current_user.organization
  end

  # Cookieにはサーバー側のセッションのidだけを持たせ、毎回DBで有効かを確かめる
  def current_user_session
    return @current_user_session if defined?(@current_user_session)

    user_session = UserSession.includes(user: :organization).find_by(id: session[:user_session_id]) if session[:user_session_id]
    if user_session&.expired?
      user_session.destroy
      user_session = nil
    end
    user_session&.record_activity!

    @current_user_session = user_session
  end

  # ログイン前のセッションを引き継がない（セッション固定攻撃への対策）
  def start_new_session_for(user)
    reset_session
    user_session = user.user_sessions.create!(
      ip_address: request.remote_ip,
      user_agent: request.user_agent.to_s.first(255)
    )
    session[:user_session_id] = user_session.id
    @current_user_session = user_session
  end

  # 画面のヘッダーに、どの組織でログインしているかを出すため、本人の情報にだけ組織を付ける
  # （ユーザーのJSONにいつも組織を含めると、「レビュー依頼した人」などにも付いてしまう）
  def user_with_organization(user)
    user.as_json.merge(organization: user.organization.as_json)
  end

  def require_login
    render json: { errors: ["ログインしてください"] }, status: :unauthorized unless current_user
  end

  def forbid_in_demo
    render json: { errors: ["デモ環境では使えません"] }, status: :forbidden if Rails.application.config.x.demo_mode
  end

  def require_reviewer
    render json: { errors: ["レビュアーだけが行えます"] }, status: :forbidden unless current_user.reviewer?
  end

  # Cookieでログインを保つので、ほかのサイトのフォームから送られた変更系のリクエスト（CSRF）を受け付けない
  # フォームはJSONを送れず、JSONを送るにはCORSの許可が要るが、このAPIは許可していない
  def require_json_request
    return if request.get? || request.head?
    return if request.media_type == "application/json"

    render json: { errors: ["JSONで送ってください"] }, status: :unsupported_media_type
  end
end
