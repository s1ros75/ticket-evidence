class ApplicationController < ActionController::API
  before_action :require_json_request
  before_action :require_login

  rescue_from ActiveRecord::RecordNotFound do
    render json: { errors: ["Not found"] }, status: :not_found
  end

  private

  def current_user
    @current_user ||= User.find_by(id: session[:user_id]) if session[:user_id]
  end

  def require_login
    render json: { errors: ["ログインしてください"] }, status: :unauthorized unless current_user
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
