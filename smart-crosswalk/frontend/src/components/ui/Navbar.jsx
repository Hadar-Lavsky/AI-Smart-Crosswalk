import { Link, useLocation } from "react-router-dom";
import { cn } from "../../utils";
import { Logo } from "../ui";

const navLinks = [
  { to: "/", label: "Dashboard" },
  { to: "/alerts", label: "Alerts" },
  { to: "/crosswalks", label: "Crosswalks" },
];

/**
 * Navbar — sticky top navigation bar.
 * Highlights the active route via `useLocation`.
 * Requires a `<BrowserRouter>` ancestor.
 *
 * @example
 * <Navbar />
 */
export function Navbar() {
  const location = useLocation();

  return (
    <nav className="bg-slate-950 text-white shadow-lg sticky top-0 z-[--z-sticky]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <Logo size={40} />
            <span className="font-bold text-lg hidden sm:block">
              Smart Crosswalk
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  location.pathname === link.to
                    ? "bg-primary-600 text-white"
                    : "text-surface-300 hover:text-white hover:bg-surface-800",
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
