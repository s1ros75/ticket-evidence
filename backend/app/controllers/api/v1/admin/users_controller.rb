module Api
  module V1
    module Admin
      # 管理者によるアカウントの作成と、仮パスワードの発行
      # 仮パスワードはサーバーで作り、応答で1回だけ返す（DBにはハッシュしか残らない）
      class UsersController < ApplicationController
        before_action :require_admin

        def index
          render json: User.order(:id)
        end

        def create
          temporary_password = generate_password
          user = User.new(user_params.merge(password: temporary_password))

          if user.save
            render json: { user: user, temporary_password: temporary_password }, status: :created
          else
            render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
          end
        end

        # パスワードが変わるので、その人のログイン中のセッションはすべて切れる（User の after_update）
        def reset_password
          user = User.find(params[:id])
          temporary_password = generate_password
          user.update!(password: temporary_password)

          render json: { temporary_password: temporary_password }
        end

        private

        def require_admin
          render json: { errors: ["管理者だけが行えます"] }, status: :forbidden unless current_user.admin?
        end

        def user_params
          params.require(:user).permit(:name, :email, :role, :admin)
        end

        def generate_password
          SecureRandom.alphanumeric(16)
        end
      end
    end
  end
end
