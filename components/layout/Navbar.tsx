"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Menu, Moon, Sun, X } from "lucide-react"
import { useTheme } from "@/components/theme/ThemeProvider"

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const handleScroll = () => setScrolled(window.scrollY > 18)
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false)
    }
    handleScroll()
    window.addEventListener("scroll", handleScroll)
    window.addEventListener("keydown", handleKey)
    return () => {
      window.removeEventListener("scroll", handleScroll)
      window.removeEventListener("keydown", handleKey)
    }
  }, [])

  const cycleTheme = () => {
    if (theme === "dark") setTheme("light")
    else setTheme("dark")
  }

  return (
    <header className={`ts-site-nav ${scrolled ? "ts-site-nav--scrolled" : ""}`}>
      <div className="ts-site-nav__inner">
        <Link className="ts-site-nav__brand" href="/" aria-label="TaskSui home">
          <img
            src={mounted && theme === "light" ? "/logo-light.png" : "/logo-dark.png"}
            alt="TaskSui"
            className="ts-site-nav__logo"
          />
          <span>TaskSui</span>
        </Link>

        <nav className="ts-site-nav__links" aria-label="Primary navigation">
          <Link className="ts-site-nav__link" href="/marketplace">Marketplace</Link>
          <Link className="ts-site-nav__link" href="/create">Create Task</Link>
          <Link className="ts-site-nav__link" href="/dashboard">Dashboard</Link>
        </nav>

        <div className="ts-site-nav__actions">
          {mounted && (
            <div className="ts-theme-switch" aria-label="Theme selection">
              <button
                className={theme === "dark" ? "is-active" : ""}
                onClick={() => setTheme("dark")}
                aria-label="Dark theme"
              >
                <Moon size={14} />
              </button>
              <button
                className={theme === "light" ? "is-active" : ""}
                onClick={() => setTheme("light")}
                aria-label="Light theme"
              >
                <Sun size={14} />
              </button>
            </div>
          )}
          <Link href="/create" className="ts-site-nav__cta">
            Create Task
          </Link>
          <button
            className="ts-site-nav__mobile"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {mobileOpen && (
          <div className="ts-mobile-panel">
            <Link href="/marketplace" onClick={() => setMobileOpen(false)}>Marketplace</Link>
            <Link href="/create" onClick={() => setMobileOpen(false)}>Create Task</Link>
            <Link href="/dashboard" onClick={() => setMobileOpen(false)}>Dashboard</Link>
            <div className="ts-mobile-panel__links">
              <a href="https://sui.io" target="_blank" rel="noopener noreferrer">Sui Network</a>
              <span onClick={cycleTheme} style={{ cursor: "pointer" }}>
                Theme: {mounted ? theme : "..."}
              </span>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
