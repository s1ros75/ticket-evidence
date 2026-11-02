require "rails_helper"

# 本番では、ビルドした画面（public/index.html）をRailsから配信する
# /tickets/1 のような画面のURLを直接開いても、画面を返す
RSpec.describe "画面の配信", type: :request do
  let(:public_dir) { Pathname(Dir.mktmpdir) }

  before do
    public_dir.join("index.html").write("<!doctype html><div id=\"root\"></div>")
    allow(Rails).to receive(:public_path).and_return(public_dir)
  end

  after { FileUtils.remove_entry(public_dir) }

  it "画面のURLには index.html を返す" do
    get "/tickets/1"

    expect(response).to have_http_status(200)
    expect(response.media_type).to eq "text/html"
    expect(response.body).to include('<div id="root">')
  end

  it "存在しないAPIのURLには画面を返さない" do
    get "/api/v1/unknown"

    expect(response).to have_http_status(404)
    expect(response.body).not_to include('<div id="root">')
  end
end
