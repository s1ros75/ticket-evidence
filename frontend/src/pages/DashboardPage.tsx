import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { fetchDashboard, type Dashboard } from '../api/dashboard'
import { STATUS_LABELS, TICKET_STATUSES } from '../api/tickets'

export function DashboardPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    fetchDashboard()
      .then(setDashboard)
      .catch(() => setLoadError(true))
  }, [])

  return (
    <main>
      <h1>ダッシュボード</h1>

      {loadError ? (
        <p role="alert">ダッシュボードを取得できませんでした</p>
      ) : dashboard === null ? (
        <p>読み込み中…</p>
      ) : (
        <>
          {/* 各タイルから、そのステータスで絞り込んだ一覧に移れるようにする
              数字を<strong>で囲むと読み上げ名が「4 件」と区切られるので、aria-labelで名前をまとめて付ける */}
          <ul className="stat-tiles">
            {TICKET_STATUSES.map((status) => (
              <li key={status}>
                <Link
                  to={`/?status=${status}`}
                  className={`stat-tile stat-tile-${status}`}
                  aria-label={`${STATUS_LABELS[status]} ${dashboard.status_counts[status]}件`}
                >
                  <span className="stat-label">{STATUS_LABELS[status]}</span>{' '}
                  <span className="stat-value">
                    <strong>{dashboard.status_counts[status]}</strong>件
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <p className="stat-note">
            <Link
              to="/?status=investigating"
              className="stat-tile stat-tile-blocked"
              aria-label={`うち不明点が残る ${dashboard.investigating_with_unknowns}件`}
            >
              <span className="stat-label">うち不明点が残る</span>{' '}
              <span className="stat-value">
                <strong>{dashboard.investigating_with_unknowns}</strong>件
              </span>
            </Link>
            <span className="stat-hint">不明点を解決するまで、レビュー依頼に進めない調査中のチケットです</span>
          </p>
        </>
      )}
    </main>
  )
}
