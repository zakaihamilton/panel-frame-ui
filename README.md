# Panel Frame

Panel Frame is a React UI package for the shared dashboards and account screens in the Visitoring, Perminister, Nanogres, and Postparticle applications.

The package standardizes structure and interaction patterns while letting each application provide its own brand, route links, account actions, and semantic theme colors.

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
  brand={<a className="pf-brand" href="/dashboard">Product</a>}
  navigation={
    <a className="pf-sidebar-link" href="/dashboard" aria-current="page">
      Overview
    </a>
  }
  toolbar={<AccountActions />}
>
  <PageContent />
</DashboardShell>
```

Use `pf-sidebar-group`, `pf-sidebar-group-label`, and `pf-sidebar-link` for a consistent navigation hierarchy and active state.
Set `contentAsMain={false}` when the page content already provides its own `<main>` landmark.

## Authentication shell

```tsx
import { AuthCard, AuthShell } from "panel-frame-ui";

<AuthShell brand={<Brand />} aside={<AuthIntro />} utility={<ThemePicker />}>
  <AuthCard>
    <LoginForm />
  </AuthCard>
</AuthShell>
```

The app owns all form actions, identity-provider links, and recovery URLs. Panel Frame only provides the common frame and visual primitives.

## Components

The package exports `DashboardShell`, `AuthShell`, `AuthCard`, `Button`, `Card`, `Badge`, `Alert`, `Field`, `TextField`, `SelectField`, `EmptyState`, `Skeleton`, `PageHeader`, and `ThemeSelect`.

React and React DOM are peer dependencies. The package does not depend on Next.js; pass framework links as React children in the app-owned navigation.

## Repository checks

Run `pnpm health` to build the package and check type safety, unused code, duplication, and package exports. GitHub Actions runs those checks on pushes and pull requests, along with OSV-Scanner for dependency vulnerabilities, Gitleaks for secrets, and actionlint for workflow syntax.

The package is ESM-only. Are The Types Wrong? checks the JavaScript entry point; Publint checks the stylesheet export and published files.
