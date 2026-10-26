# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).
#
# Example:
#
#   ["Action", "Comedy", "Drama", "Horror"].each do |genre_name|
#     MovieGenre.find_or_create_by!(name: genre_name)
#   end

# 開発用のアカウント（アカウントを作る画面はないので、ここかRailsのコンソールで作る）
if Rails.env.development?
  [
    { name: "担当者", email: "member@example.com", role: "member" },
    { name: "レビュアー", email: "reviewer@example.com", role: "reviewer" }
  ].each do |attributes|
    User.find_or_create_by!(email: attributes[:email]) do |user|
      user.name = attributes[:name]
      user.role = attributes[:role]
      user.password = "password123"
    end
  end
end
