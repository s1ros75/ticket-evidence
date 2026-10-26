module Api
  module V1
    class SessionsController < ApplicationController
      skip_before_action :require_login, only: :create

      # パスワードの総当たりを遅らせる
      rate_limit to: 10, within: 3.minutes, only: :create, with: -> {
        render json: { errors: ["しばらく待ってから、もう一度ログインしてください"] }, status: :too_many_requests
      }

      def show
        render json: current_user
      end

      def create
        user = User.authenticate_by(email: params[:email].to_s, password: params[:password].to_s)

        if user
          # ログイン前のセッションを引き継がない（セッション固定攻撃への対策）
          reset_session
          session[:user_id] = user.id
          render json: user
        else
          render json: { errors: ["メールアドレスかパスワードが違います"] }, status: :unauthorized
        end
      end

      def destroy
        reset_session
        head :no_content
      end
    end
  end
end
