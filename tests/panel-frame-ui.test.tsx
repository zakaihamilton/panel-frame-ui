import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  AuthCard,
  AuthShell,
  DashboardShell,
  ThemeSelect,
} from "../src/index.js";

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe("DashboardShell", () => {
  it("keeps the sidebar and page content in the shared dashboard frame", () => {
    render(
      <DashboardShell
        brand={<span className="pf-brand">Panel Frame</span>}
        navigation={
          <nav aria-label="Product">
            <a href="/overview">Overview</a>
          </nav>
        }
        toolbar={<button type="button">Account</button>}
      >
        <h1>Overview</h1>
      </DashboardShell>,
    );

    expect(
      screen.getByRole("complementary", { name: "Primary navigation" }),
    ).toBeTruthy();
    expect(screen.getByRole("main").textContent).toContain("Overview");
    expect(screen.getByRole("button", { name: "Account" })).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Skip to main content" })
        .getAttribute("href"),
    ).toBe("#pf-main-content");
  });

  it("opens the mobile drawer, traps initial focus, and restores focus on close", () => {
    mockMatchMedia(true);
    render(
      <DashboardShell
        brand={<span className="pf-brand">Panel Frame</span>}
        navigation={
          <nav>
            <a href="/overview">Overview</a>
            <a href="/settings">Settings</a>
          </nav>
        }
      >
        <h1>Overview</h1>
      </DashboardShell>,
    );

    const trigger = screen.getByRole("button", { name: "Open navigation" });
    fireEvent.click(trigger);

    const drawer = screen.getByRole("dialog", { name: "Primary navigation" });
    const closeNavigation = screen.getByRole("button", { name: "Panel Frame" });
    expect(drawer.getAttribute("aria-modal")).toBe("true");
    expect(document.activeElement).toBe(closeNavigation);
    const descriptionId = closeNavigation.getAttribute("aria-describedby");
    expect(descriptionId).toBeTruthy();
    expect(document.getElementById(descriptionId!)?.textContent).toBe(
      "Close navigation",
    );
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(
      screen.getByRole("link", { name: "Settings" }),
    );
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(closeNavigation);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(
      screen
        .getByRole("button", { name: "Open navigation" })
        .getAttribute("aria-expanded"),
    ).toBe("false");
    expect(document.activeElement).toBe(trigger);
    expect(document.body.style.overflow).toBe("");
  });

  it("closes the mobile drawer after following a page link", () => {
    mockMatchMedia(true);
    render(
      <DashboardShell
        brand={<span className="pf-brand">Panel Frame</span>}
        navigation={
          <nav>
            <a href="/settings" onClick={(event) => event.preventDefault()}>
              Settings
            </a>
          </nav>
        }
      >
        <h1>Overview</h1>
      </DashboardShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    fireEvent.click(screen.getByRole("link", { name: "Settings" }));

    expect(
      screen
        .getByRole("button", { name: "Open navigation" })
        .getAttribute("aria-expanded"),
    ).toBe("false");
    expect(document.body.style.overflow).toBe("");
  });
});

describe("AuthShell and AuthCard", () => {
  it("provides consistent branded account regions and card styling", () => {
    const { container } = render(
      <AuthShell
        brand={<span>Panel Frame</span>}
        aside={<p>Welcome back</p>}
        utility={<button type="button">Theme</button>}
        footer={<a href="/privacy">Privacy</a>}
      >
        <AuthCard className="login-card">
          <h1>Sign in</h1>
        </AuthCard>
      </AuthShell>,
    );

    expect(screen.getByRole("main")).toBeTruthy();
    expect(screen.getByRole("region", { name: "Account access" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeTruthy();
    expect(
      container
        .querySelector(".pf-auth-card")
        ?.classList.contains("login-card"),
    ).toBe(true);
    expect(screen.getByRole("link", { name: "Privacy" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Theme" })).toBeTruthy();
  });
});

describe("ThemeSelect", () => {
  it("reports the selected theme while leaving the selected value controlled", () => {
    const onChange = vi.fn();
    render(<ThemeSelect value="light" onChange={onChange} />);

    fireEvent.click(screen.getByRole("combobox", { name: "Color theme" }));
    fireEvent.click(screen.getByRole("option", { name: "Dark" }));

    expect(onChange).toHaveBeenCalledWith("dark");
  });
});
