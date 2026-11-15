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
        render json: user_with_organization(current_user)
      end

      def create
        user = User.authenticate_by(email: params[:email].to_s, password: params[:password].to_s)

        if user
          start_new_session_for(user)
          render json: user_with_organization(user)
        else
          render json: { errors: ["メールアドレスかパスワードが違います"] }, status: :unauthorized
        end
      end

      def destroy
        current_user_session.destroy
        reset_session
        head :no_content
      end

      private

      # 画面のヘッダーに、どの組織でログインしているかを出すため、本人の情報にだけ組織を付ける
      def user_with_organization(user)
        user.as_json.merge(organization: user.organization.as_json)
      end
    end
  end
end
