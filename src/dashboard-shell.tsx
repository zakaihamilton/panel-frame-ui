"use client";

import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";

export type DashboardShellProps = {
  brand: ReactNode;
  navigation: ReactNode;
  sidebarContext?: ReactNode;
  sidebarFooter?: ReactNode;
  toolbar?: ReactNode;
  sidebarVisible?: boolean;
  contentAsMain?: boolean;
  children: ReactNode;
};

const focusableSelector =
  'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

export function DashboardShell({
  brand,
  navigation,
  sidebarContext,
  sidebarFooter,
  toolbar,
  sidebarVisible = true,
  contentAsMain = true,
  children,
}: DashboardShellProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 780px)");
    const update = () => {
      setIsMobile(media.matches);
      if (!media.matches) setMobileOpen(false);
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!isMobile || !mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        sidebarRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
      ).filter((element) => !element.hasAttribute("hidden"));

    focusable()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;
      const elements = focusable();
      const first = elements[0];
      const last = elements.at(-1);
      if (!first || !last) {
        event.preventDefault();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isMobile, mobileOpen]);

  function closeAfterNavigation(event: MouseEvent<HTMLElement>) {
    if (
      isMobile &&
      event.target instanceof Element &&
      event.target.closest("a[href]")
    ) {
      setMobileOpen(false);
    }
  }

  function closeDrawer() {
    setMobileOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div
      className="pf-dashboard-shell"
      data-mobile-open={mobileOpen ? "true" : "false"}
      data-sidebar-visible={sidebarVisible ? "true" : "false"}
    >
      <a className="pf-skip-link" href="#pf-main-content">
        Skip to main content
      </a>
      <aside
        ref={sidebarRef}
        aria-hidden={
          (isMobile && !mobileOpen) || (!isMobile && !sidebarVisible) ? true : undefined
        }
        aria-label="Primary navigation"
        aria-modal={isMobile && mobileOpen ? true : undefined}
        className="pf-sidebar"
        id="pf-dashboard-sidebar"
        inert={(isMobile && !mobileOpen) || (!isMobile && !sidebarVisible)}
        onClick={closeAfterNavigation}
        role={isMobile && mobileOpen ? "dialog" : undefined}
        tabIndex={-1}
      >
        <div className="pf-sidebar-brand">{brand}</div>
        {sidebarContext ? (
          <div className="pf-sidebar-context">{sidebarContext}</div>
        ) : null}
        <div className="pf-sidebar-navigation">
          {navigation}
        </div>
        <div className="pf-sidebar-spacer" />
        {sidebarFooter ? (
          <div className="pf-sidebar-footer">{sidebarFooter}</div>
        ) : null}
      </aside>

      {isMobile && mobileOpen ? (
        <button
          aria-label="Close dashboard navigation"
          className="pf-sidebar-backdrop"
          onClick={closeDrawer}
          tabIndex={-1}
          type="button"
        />
      ) : null}

      <div className="pf-dashboard-main">
        <header className="pf-dashboard-toolbar">
          <button
            aria-controls="pf-dashboard-sidebar"
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            className="pf-mobile-menu-button"
            onClick={() => setMobileOpen((open) => !open)}
            ref={triggerRef}
            type="button"
          >
            <span aria-hidden="true">☰</span>
          </button>
          {toolbar ? <div className="pf-toolbar-content">{toolbar}</div> : null}
        </header>
        {contentAsMain ? (
          <main className="pf-dashboard-content" id="pf-main-content" tabIndex={-1}>
            {children}
          </main>
        ) : (
          <div className="pf-dashboard-content" id="pf-main-content" tabIndex={-1}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
