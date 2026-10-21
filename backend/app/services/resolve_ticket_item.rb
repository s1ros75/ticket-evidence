# 不明点・仮定を「解決する」。根拠の保存と確認済みへの変更を、必ずまとめて行う
# ルールを画面ではなくここに置き、どの入口から呼ばれても根拠なしでは解決できないようにする（docs/design.md）
class ResolveTicketItem
  Result = Struct.new(:item, :errors, keyword_init: true) do
    def success?
      errors.empty?
    end
  end

  def self.call(...)
    new(...).call
  end

  def initialize(item:, evidence_params:)
    @item = item
    @evidence_params = evidence_params
  end

  def call
    errors = []

    TicketItem.transaction do
      # 同時に解決されたときに、根拠が二重に付かないようにする
      @item.lock!

      unless @item.resolvable?
        errors << "この項目は解決できません"
        raise ActiveRecord::Rollback
      end

      evidence = @item.evidences.new(@evidence_params)
      unless evidence.save
        errors.concat(evidence.errors.full_messages)
        raise ActiveRecord::Rollback
      end

      @item.update!(kind: "confirmed", resolved_at: Time.current)
    end

    Result.new(item: @item, errors: errors)
  end
end
