module Api
  module V1
    # 新しい組織を申し込む。組織と最初のアカウントを作り、そのままログインした状態にする
    class SignupsController < ApplicationController
      skip_before_action :require_login

      # 組織とアカウントを大量に作られないよう、同じ接続元からの申し込みの回数を制限する
      rate_limit to: 5, within: 1.hour, only: :create, name: "signup_by_ip",
                 store: Rails.application.config.x.rate_limit_store,
                 with: -> { render json: { errors: ["しばらく待ってから、もう一度お試しください"] }, status: :too_many_requests }

      def create
        result = SignUpOrganization.call(
          organization_name: params[:organization_name].to_s,
          name: params[:name].to_s,
          email: params[:email].to_s,
          password: params[:password].to_s
        )

        if result.success?
          start_new_session_for(result.user)
          render json: user_with_organization(result.user), status: :created
        else
          render json: { errors: result.errors }, status: :unprocessable_entity
        end
      end
    end
  end
end
