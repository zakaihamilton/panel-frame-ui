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
  'a[href], button:not(:disabled), input:not([type="hidden"]):not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

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
  const wasMobileOpenRef = useRef(false);

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
    if (mobileOpen) {
      wasMobileOpenRef.current = true;
      return;
    }
    if (wasMobileOpenRef.current) {
      wasMobileOpenRef.current = false;
      if (isMobile) triggerRef.current?.focus();
    }
  }, [isMobile, mobileOpen]);

  useEffect(() => {
    if (!isMobile || !mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        sidebarRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ??
          [],
      ).filter(
        (element) =>
          !element.closest('[hidden], [inert], [aria-hidden="true"]'),
      );

    const first = focusable()[0];
    (first ?? sidebarRef.current)?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDrawer();
        return;
      }
      if (event.key !== "Tab") return;
      const elements = focusable();
      const firstFocusable = elements[0];
      const lastFocusable = elements.at(-1);
      if (!firstFocusable || !lastFocusable) {
        event.preventDefault();
        sidebarRef.current?.focus();
      } else if (!sidebarRef.current?.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? lastFocusable : firstFocusable).focus();
      } else if (document.activeElement === sidebarRef.current) {
        event.preventDefault();
        (event.shiftKey ? lastFocusable : firstFocusable).focus();
      } else if (event.shiftKey && document.activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable.focus();
      } else if (!event.shiftKey && document.activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
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
      closeDrawer();
    }
  }

  function closeDrawer() {
    setMobileOpen(false);
  }

  return (
    <div
      className="pf-dashboard-shell"
      data-mobile-open={mobileOpen ? "true" : "false"}
      data-sidebar-visible={sidebarVisible ? "true" : "false"}
    >
      <a
        aria-hidden={isMobile && mobileOpen ? true : undefined}
        className="pf-skip-link"
        href="#pf-main-content"
        inert={isMobile && mobileOpen}
      >
        Skip to main content
      </a>
      <aside
        ref={sidebarRef}
        aria-hidden={
          (isMobile && !mobileOpen) || (!isMobile && !sidebarVisible)
            ? true
            : undefined
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
        <div className="pf-sidebar-navigation">{navigation}</div>
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

      <div
        aria-hidden={isMobile && mobileOpen ? true : undefined}
        className="pf-dashboard-main"
        inert={isMobile && mobileOpen}
      >
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
          <main
            className="pf-dashboard-content"
            id="pf-main-content"
            tabIndex={-1}
          >
            {children}
          </main>
        ) : (
          <div
            className="pf-dashboard-content"
            id="pf-main-content"
            tabIndex={-1}
          >
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
