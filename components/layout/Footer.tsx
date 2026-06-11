import Link from "next/link"

export function Footer() {
  return (
    <footer className="ts-public-footer">
      <div>
        <span className="ts-site-nav__brand-icon">TS</span>
        <span>TaskSui</span>
      </div>
      <nav>
        <Link href="/marketplace">Marketplace</Link>
        <Link href="/create">Create Task</Link>
        <Link href="/dashboard">Dashboard</Link>
        <a href="https://sui.io" target="_blank" rel="noopener noreferrer">
          Sui Network
        </a>
      </nav>
    </footer>
  )
}
