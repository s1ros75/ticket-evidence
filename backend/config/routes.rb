Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Defines the root path route ("/")
  # root "posts#index"

  namespace :api do
    namespace :v1 do
      resource :session, only: [:show, :create, :destroy]
      resource :dashboard, only: [:show]
      resource :password, only: [:update]

      namespace :admin do
        resources :users, only: [:index, :create] do
          post :reset_password, on: :member
        end
      end
      resources :tickets, only: [:index, :show, :create] do
        member do
          post :request_review
          post :approve
          post :send_back
        end
        resources :events, only: [:index], module: :tickets
        resources :items, only: [:create], module: :tickets do
          post :resolve, on: :member
        end
      end
    end
  end

  # 画面のURL（/tickets/1 など）は、ビルドした画面を返す。API と /up は対象外
  get "*path", to: "frontend#index", format: false,
               constraints: ->(request) { !request.path.start_with?("/api/", "/up") }
end
