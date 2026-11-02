module Api
  module V1
    # 自分のパスワードを変える
    class PasswordsController < ApplicationController
      before_action :forbid_in_demo

      def update
        user = current_user
        # password_challenge で、今のパスワードが合っているかを has_secure_password に確かめさせる
        if user.update(password: params[:password].to_s, password_challenge: params[:current_password].to_s)
          # パスワードが変わると、この端末も含めて全セッションが消える（User の after_update）
          # 変えた本人がこの端末でログインし直さずに済むよう、この端末にだけ新しいセッションを作る
          start_new_session_for(user)
          head :no_content
        else
          render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
        end
      end
    end
  end
end
