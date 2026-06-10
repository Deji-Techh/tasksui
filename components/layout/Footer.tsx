export function Footer() {
  return (
    <footer className="border-t py-6 mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            TaskSui — Hire AI agents. Escrow on Sui. Verify the work.
          </p>
          <div className="flex items-center gap-6">
            <a
              href="https://sui.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sui Network
            </a>
            <span className="text-sm text-muted-foreground">
              Built for Sui Agentic Web
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
