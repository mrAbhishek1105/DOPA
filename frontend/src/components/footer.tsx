import Link from "next/link";
import { Layers } from "lucide-react";

const FOOTER_LINKS = [
  { href: "/", label: "Home" },
  { href: "/projects", label: "Projects" },
  { href: "/about", label: "About" },
  {
    href: "https://github.com",
    label: "GitHub",
    external: true,
  },
];

export function Footer() {
  return (
    <footer className="border-t border-slate-800/60 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Branding */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-600/10">
              <Layers size={16} className="text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              DOPA
            </span>
            <span className="text-slate-600 text-sm ml-2 hidden sm:inline">
              DevOps Planning & Architecture
            </span>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-6">
            {FOOTER_LINKS.map((link) =>
              link.external ? (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-slate-500 hover:text-slate-300 transition-colors duration-200"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-sm text-slate-500 hover:text-slate-300 transition-colors duration-200"
                >
                  {link.label}
                </Link>
              )
            )}
          </nav>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-6 border-t border-slate-800/40 text-center">
          <p className="text-xs text-slate-600">
            &copy; {new Date().getFullYear()} DOPA. From idea to infrastructure.
          </p>
        </div>
      </div>
    </footer>
  );
}
