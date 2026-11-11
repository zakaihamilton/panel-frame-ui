import type { HTMLAttributes, ReactNode } from "react";

export type AuthShellProps = {
  brand: ReactNode;
  aside: ReactNode;
  utility?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({ brand, aside, utility, children, footer }: AuthShellProps) {
  return (
    <main className="pf-auth-shell">
      <div className="pf-auth-layout">
        <aside className="pf-auth-aside">
          <div className="pf-auth-brand">{brand}</div>
          <div className="pf-auth-aside-content">{aside}</div>
          {footer ? <div className="pf-auth-aside-footer">{footer}</div> : null}
        </aside>
        <section aria-label="Account access" className="pf-auth-main">
          {utility ? <div className="pf-auth-utility">{utility}</div> : null}
          <div className="pf-auth-content">{children}</div>
        </section>
      </div>
    </main>
  );
}

export function AuthCard({ className = "", ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={`pf-auth-card ${className}`.trim()} {...props} />;
}
