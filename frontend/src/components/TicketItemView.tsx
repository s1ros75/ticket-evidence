import { useState } from 'react'
import type { Evidence, TicketItem } from '../api/tickets'
import { ResolveForm } from './ResolveForm'

type Props = {
  item: TicketItem
  onResolved: (item: TicketItem) => void
}

// APIでhttp/httpsに限っているが、表示側でもそれ以外はリンクにしない
function isHttpUrl(url: string) {
  return /^https?:\/\//i.test(url)
}

function EvidenceView({ evidence }: { evidence: Evidence }) {
  return (
    <li>
      {evidence.url &&
        (isHttpUrl(evidence.url) ? (
          <a href={evidence.url} target="_blank" rel="noopener noreferrer">
            {evidence.url}
          </a>
        ) : (
          <span>{evidence.url}</span>
        ))}
      {evidence.memo && <p className="memo">{evidence.memo}</p>}
    </li>
  )
}

export function TicketItemView({ item, onResolved }: Props) {
  const [resolving, setResolving] = useState(false)
  const resolvable = item.kind !== 'confirmed'

  return (
    <li className="item">
      <div className="item-row">
        <span className="body">{item.body}</span>
        {resolvable && !resolving && (
          <button type="button" className="secondary" onClick={() => setResolving(true)}>
            解決する
          </button>
        )}
      </div>

      {item.resolved_at && (
        <p className="resolved-at">{new Date(item.resolved_at).toLocaleDateString('ja-JP')}に解決</p>
      )}
      {item.evidences.length > 0 && (
        <ul className="evidences">
          {item.evidences.map((evidence) => (
            <EvidenceView key={evidence.id} evidence={evidence} />
          ))}
        </ul>
      )}

      {resolving && <ResolveForm item={item} onResolved={onResolved} onCancel={() => setResolving(false)} />}
    </li>
  )
}
