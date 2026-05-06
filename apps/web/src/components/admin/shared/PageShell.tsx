import { Link } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

interface Crumb {
  label: string;
  href?: string;
}

interface PageShellProps {
  breadcrumbs: Crumb[];
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function PageShell({ breadcrumbs, title, subtitle, children }: PageShellProps) {
  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 text-sm">
          {breadcrumbs.map((c, i) => (
            <li key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />}
              {c.href ? (
                <Link
                  to={c.href}
                  className="text-muted-foreground hover:text-foreground inline-flex items-center min-h-11 px-1"
                >
                  {c.label}
                </Link>
              ) : (
                <span aria-current="page" className="text-foreground">
                  {c.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight leading-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
