module Api
  module V1
    class SessionsController < ApplicationController
      skip_before_action :require_login, only: :create

      TOO_MANY_ATTEMPTS = -> {
        render json: { errors: ["しばらく待ってから、もう一度ログインしてください"] }, status: :too_many_requests
      }

      # パスワードの総当たりを遅らせる。同じ接続元からの試行と、同じアカウントへの試行（接続元を変えながらの攻撃）の両方を数える
      rate_limit to: 10, within: 3.minutes, only: :create, name: "login_by_ip",
                 store: Rails.application.config.x.rate_limit_store, with: TOO_MANY_ATTEMPTS
      rate_limit to: 5, within: 15.minutes, only: :create, name: "login_by_email",
                 by: -> { params[:email].to_s.strip.downcase },
                 store: Rails.application.config.x.rate_limit_store, with: TOO_MANY_ATTEMPTS

      def show
        render json: current_user
      end

      def create
        user = User.authenticate_by(email: params[:email].to_s, password: params[:password].to_s)

        if user
          # ログイン前のセッションを引き継がない（セッション固定攻撃への対策）
          reset_session
          user_session = user.user_sessions.create!(
            ip_address: request.remote_ip,
            user_agent: request.user_agent.to_s.first(255)
          )
          session[:user_session_id] = user_session.id
          render json: user
        else
          render json: { errors: ["メールアドレスかパスワードが違います"] }, status: :unauthorized
        end
      end

      def destroy
        current_user_session.destroy
        reset_session
        head :no_content
      end
    end
  end
end
