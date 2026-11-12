# Panel Frame

Panel Frame is a reusable React UI package for dashboards, account screens, and shared application interfaces.

It standardizes structure and interaction patterns while letting each consuming application provide its own brand, route links, account actions, and semantic theme colors.

## Install

```sh
pnpm add panel-frame-ui
```

Import the stylesheet once from the application's root stylesheet or root layout:

```css
@import "panel-frame-ui/styles.css";
```

Then map the app's existing theme values to the `--pf-*` variables. At minimum, set `--pf-background`, `--pf-surface`, `--pf-text`, `--pf-muted`, `--pf-border`, `--pf-accent`, and `--pf-accent-contrast`. The package has sensible defaults for other semantic colors.

## Dashboard shell

The shell owns the left sidebar, mobile drawer, toolbar, and right-hand page area. Pass app-owned navigation links and controls as slots so Next.js `Link`, authorization rules, and product-specific actions stay in the application.

```tsx
import { DashboardShell } from "panel-frame-ui";

<DashboardShell
  brand={<span className="pf-brand">Product</span>}
  navigation={
    <a className="pf-sidebar-link" href="/dashboard" aria-current="page">
      Overview
    </a>
  }
  toolbar={<AccountActions />}
>
  <PageContent />
</DashboardShell>;
```

The sidebar brand is the collapse control. Use non-interactive brand content; Panel Frame adds the custom tooltip and keeps the brand available in the toolbar while the sidebar is collapsed.

Use `pf-sidebar-group`, `pf-sidebar-group-label`, and `pf-sidebar-link` for a consistent navigation hierarchy and active state.
Set `contentAsMain={false}` when the page content already provides its own `<main>` landmark. When `sidebarContext` contains multiple controls, group them in a `<div>` to give them consistent spacing.

## Authentication shell

```tsx
import { AuthCard, AuthShell } from "panel-frame-ui";

<AuthShell brand={<Brand />} aside={<AuthIntro />} utility={<ThemePicker />}>
  <AuthCard>
    <LoginForm />
  </AuthCard>
</AuthShell>;
```

The app owns all form actions, identity-provider links, and recovery URLs. Panel Frame only provides the common frame and visual primitives.

## Shared controls and overlays

Use `Select` for custom option menus and `ContextSwitcher` for organization, workspace, or project context. Options can include descriptions and icons, while the footer can hold app-owned links or actions.

```tsx
import { ContextSwitcher, Select } from "panel-frame-ui";

<Select
  label="Environment"
  name="environment"
  options={[
    { value: "test", label: "Test" },
    { value: "live", label: "Live", description: "Production data" },
  ]}
/>

<ContextSwitcher
  aria-label="Organization"
  label="Organization"
  options={organizations}
  value={activeOrganizationId}
  onValueChange={selectOrganization}
  footer={<a className="pf-select-footer-link" href="/organizations">Manage organizations</a>}
/>
```

`Dialog` provides a modal frame. Use `AlertDialog` for a single decision or `ConfirmDialog` for a standard cancel/confirm action pair. Control visibility with `open` and `onOpenChange`; provide app-specific form content or handlers as children/props.

```tsx
import { AlertDialog, ConfirmDialog, Dialog } from "panel-frame-ui";

<Dialog open={open} onOpenChange={setOpen} title="Edit profile">
  <ProfileForm />
</Dialog>

<ConfirmDialog
  open={confirmOpen}
  onOpenChange={setConfirmOpen}
  title="Delete workspace?"
  description="This action cannot be undone."
  confirmLabel="Delete workspace"
  onConfirm={deleteWorkspace}
/>
```

`ThemeProvider` standardizes theme state and persistence, `ThemeControl` renders a theme picker, and `getThemeBootstrapScript` returns a script for setting the initial theme before the page paints. Pass the same persistence and system-mode settings to the bootstrap script and provider.

```tsx
import { ThemeProvider, getThemeBootstrapScript } from "panel-frame-ui";

const themePersistence = { type: "localStorage", key: "my-app-theme" } as const;
const initialThemeScript = getThemeBootstrapScript(themePersistence);

<ThemeProvider persistence={themePersistence}>
  <App />
</ThemeProvider>;
```

`Tooltip` supports a help-button trigger, a wrapper around existing content, or a `triggerProps` button for integrations that need to preserve their own event handlers and attributes.

## Components

The package exports `DashboardShell`, `AuthShell`, `AuthCard`, `Button`, `Card`, `Badge`, `Alert`, `Field`, `TextField`, `SelectField`, `EmptyState`, `Skeleton`, `PageHeader`, `Select`, `ContextSwitcher`, `Dialog`, `AlertDialog`, `ConfirmDialog`, `Tooltip`, `ThemeProvider`, `ThemeControl`, `ThemeSelect`, `useTheme`, and `getThemeBootstrapScript`.

React and React DOM are peer dependencies. The package does not depend on Next.js; pass framework links as React children in the app-owned navigation.

## Repository checks

Run `pnpm health` to build the package, lint and format-check the source, run component tests, and check type safety, unused code, duplication, and package exports. GitHub Actions runs those checks on pushes and pull requests, along with OSV-Scanner for dependency vulnerabilities, Gitleaks for secrets, and actionlint for workflow syntax.

The package is ESM-only. Are The Types Wrong? checks the JavaScript entry point; Publint checks the stylesheet export and published files.

## Releases

This repository uses Changesets. Add a changeset with `pnpm changeset` when a change is ready for release. Merging it to `main` opens or updates a version pull request. Merging that version pull request publishes the package and creates a GitHub release. Versioning permissions and npm publishing permissions are separated into different workflow jobs.

The npm package is published publicly with npm trusted publishing from `.github/workflows/release.yml`. For the first publish, use Node 22.14 or later and npm 11.5.1 or later, run `pnpm install --frozen-lockfile` and `pnpm health`, then publish version `0.1.0` with `npm publish --access public` from an npm account you control. Then, in the package's npm settings, add a GitHub Actions trusted publisher for user `zakaihamilton`, repository `panel-frame-ui`, and workflow `release.yml`, and allow direct `npm publish`. Enable GitHub Actions to create pull requests in the repository settings. GitHub may ask a repository writer to approve the health workflow on the automatically created version pull request before its checks run.

## License

Panel Frame UI is available under the MIT License. See [LICENSE](./LICENSE).
