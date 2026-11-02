# 本番では、ビルドした画面（public/index.html）をRailsから配信する
# 画面とAPIを同じオリジンにする（CSRF対策の前提。docs/design.md）
# /tickets/1 のような画面のURLを直接開いたりリロードしたりしても、画面を返す
class FrontendController < ActionController::API
  def index
    index_html = Rails.public_path.join("index.html")

    if index_html.exist?
      send_file index_html, type: "text/html", disposition: "inline"
    else
      head :not_found
    end
  end
end
