class Evidence < ApplicationRecord
  belongs_to :ticket_item

  validate :url_or_memo_present
  validate :url_must_be_http

  private

  # 負担を減らすため、リンクかメモのどちらか1つあれば通す（docs/design.md）
  def url_or_memo_present
    errors.add(:base, "リンクかメモのどちらかを入力してください") if url.blank? && memo.blank?
  end

  # 画面でリンクとして表示するので、javascript: などのスキームを入れられないようにする
  def url_must_be_http
    return if url.blank?

    uri = URI.parse(url)
    errors.add(:url, "はhttpかhttpsで始まるURLを入力してください") unless uri.is_a?(URI::HTTP) && uri.host.present?
  rescue URI::InvalidURIError
    errors.add(:url, "はhttpかhttpsで始まるURLを入力してください")
  end
end
