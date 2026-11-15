require "rails_helper"

# 他の組織のデータは、URLを直接打っても、APIを直接呼んでも、見られない・変えられないことを確かめる
# 他の組織のデータには 403 ではなく 404 を返す（そのデータが存在することも知らせない）
RSpec.describe "組織ごとのデータの分離", type: :request do
  let(:other_organization) { Organization.create!(name: "別の組織") }
  let(:other_user) { create_user(email: "other@example.com", organization: other_organization) }
  let!(:other_ticket) { create_ticket(organization: other_organization, title: "別の組織のチケット") }
  let!(:other_unknown) { other_ticket.items.create!(kind: "unknown", body: "別の組織の不明点") }

  # 自分の組織の管理者・レビュアーでログインし、どの操作も権限では止まらない状態にする
  let!(:me) { sign_in(create_user(role: "reviewer", admin: true)) }

  def errors
    JSON.parse(response.body)["errors"]
  end

  describe "チケット" do
    it "一覧に、他の組織のチケットを出さない" do
      mine = create_ticket(title: "自分の組織のチケット")

      get "/api/v1/tickets"

      expect(JSON.parse(response.body)["tickets"].map { |ticket| ticket["id"] }).to eq [mine.id]
    end

    it "他の組織のチケットの詳細は404" do
      get "/api/v1/tickets/#{other_ticket.id}"

      expect(response).to have_http_status(404)
    end

    it "他の組織のチケットの変更履歴は404" do
      other_ticket.events.create!(user: other_user, action: "ticket_created", details: {})

      get "/api/v1/tickets/#{other_ticket.id}/events"

      expect(response).to have_http_status(404)
    end

    it "作ったチケットは、自分の組織のものになる（別の組織を指定しても無視する）" do
      post "/api/v1/tickets",
           params: { ticket: { title: "新しいチケット", organization_id: other_organization.id } },
           as: :json

      expect(response).to have_http_status(201)
      expect(Ticket.find(JSON.parse(response.body)["id"]).organization).to eq default_organization
    end
  end

  describe "項目" do
    it "他の組織のチケットに項目を追加できない" do
      expect {
        post "/api/v1/tickets/#{other_ticket.id}/items", params: { item: { kind: "unknown", body: "追加" } }, as: :json
      }.not_to change(TicketItem, :count)

      expect(response).to have_http_status(404)
    end

    it "他の組織の項目を解決できない" do
      post "/api/v1/tickets/#{other_ticket.id}/items/#{other_unknown.id}/resolve",
           params: { evidence: { memo: "確認した" } }, as: :json

      expect(response).to have_http_status(404)
      expect(other_unknown.reload.kind).to eq "unknown"
    end

    it "自分の組織のチケットのURLに、他の組織の項目のidを付けても解決できない" do
      mine = create_ticket(title: "自分の組織のチケット")

      post "/api/v1/tickets/#{mine.id}/items/#{other_unknown.id}/resolve",
           params: { evidence: { memo: "確認した" } }, as: :json

      expect(response).to have_http_status(404)
      expect(other_unknown.reload.kind).to eq "unknown"
    end
  end

  describe "レビュー" do
    it "他の組織のチケットをレビュー依頼に進められない" do
      other_unknown.update!(kind: "confirmed")

      post "/api/v1/tickets/#{other_ticket.id}/request_review", as: :json

      expect(response).to have_http_status(404)
      expect(other_ticket.reload.status).to eq "investigating"
    end

    it "他の組織のチケットを完了にできない" do
      other_ticket.update!(status: "in_review")

      post "/api/v1/tickets/#{other_ticket.id}/approve", as: :json

      expect(response).to have_http_status(404)
      expect(other_ticket.reload.status).to eq "in_review"
    end

    it "他の組織のチケットを差し戻せない" do
      other_ticket.update!(status: "in_review")

      post "/api/v1/tickets/#{other_ticket.id}/send_back", params: { reason: "理由" }, as: :json

      expect(response).to have_http_status(404)
      expect(other_ticket.reload.status).to eq "in_review"
    end
  end

  describe "ダッシュボード" do
    it "他の組織のチケットを数えない" do
      create_ticket(title: "自分の組織のチケット")

      get "/api/v1/dashboard"

      body = JSON.parse(response.body)
      expect(body["status_counts"]).to eq("investigating" => 1, "in_review" => 0, "done" => 0)
      expect(body["investigating_with_unknowns"]).to eq 0
    end
  end

  describe "アカウント管理" do
    it "一覧に、他の組織のアカウントを出さない" do
      other_user

      get "/api/v1/admin/users"

      expect(JSON.parse(response.body).map { |user| user["email"] }).to eq [me.email]
    end

    it "作ったアカウントは、自分の組織のものになる（別の組織を指定しても無視する）" do
      post "/api/v1/admin/users",
           params: { user: { name: "新人", email: "new@example.com", role: "member", organization_id: other_organization.id } },
           as: :json

      expect(response).to have_http_status(201)
      expect(User.find_by!(email: "new@example.com").organization).to eq default_organization
    end

    it "他の組織のアカウントに、仮パスワードを発行できない" do
      digest = other_user.password_digest

      post "/api/v1/admin/users/#{other_user.id}/reset_password", as: :json

      expect(response).to have_http_status(404)
      expect(other_user.reload.password_digest).to eq digest
    end
  end

  describe "ログイン中のユーザー" do
    it "所属する組織の名前を返す" do
      get "/api/v1/session"

      expect(JSON.parse(response.body)["organization"]).to eq("id" => default_organization.id, "name" => "テスト株式会社")
    end
  end
end
