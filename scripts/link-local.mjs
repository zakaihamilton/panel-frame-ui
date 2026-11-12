#!/usr/bin/env node
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const libraryDirectory = resolve(scriptDirectory, "..");
const packageName = "panel-frame-ui";
const versionSpec =
  /^(?:\^|~)?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

function readProjectRoot() {
  return execFileSync("git", ["rev-parse", "--show-toplevel"], {
    cwd: process.cwd(),
    encoding: "utf8",
  }).trim();
}

function readPackage(directory) {
  return JSON.parse(readFileSync(resolve(directory, "package.json"), "utf8"));
}

function getDependency(packageJson) {
  for (const section of ["dependencies", "devDependencies"]) {
    const spec = packageJson[section]?.[packageName];
    if (typeof spec === "string") return { section, spec };
  }
  throw new Error(
    packageName + " must be a direct dependency in this project.",
  );
}

function statePath(directory) {
  const path = execFileSync(
    "git",
    ["rev-parse", "--git-path", "panel-frame-ui-link.json"],
    {
      cwd: directory,
      encoding: "utf8",
    },
  ).trim();
  return resolve(directory, path);
}

function readState(directory) {
  const path = statePath(directory);
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : null;
}

function writeState(directory, entry) {
  const path = statePath(directory);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(entry, null, 2) + "\n");
}

function readHeadDependency(directory) {
  const manifest = JSON.parse(
    execFileSync("git", ["show", "HEAD:package.json"], {
      cwd: directory,
      encoding: "utf8",
    }),
  );
  return getDependency(manifest);
}

function writeManifest(directory, packageJson) {
  writeFileSync(
    resolve(directory, "package.json"),
    JSON.stringify(packageJson, null, 2) + "\n",
  );
}

function localSpecFor(projectDirectory) {
  const path = relative(projectDirectory, libraryDirectory)
    .split(sep)
    .join("/");
  return "file:" + path;
}

function hasLocalWorkspaceOverride(directory) {
  const path = resolve(directory, "pnpm-workspace.yaml");
  if (!existsSync(path)) return false;
  return /^[ \t]+panel-frame-ui[ \t]*:[ \t]*(?:file|link):/m.test(
    readFileSync(path, "utf8"),
  );
}

function packagePointsToLocal(directory) {
  const dependencyPath = resolve(directory, "node_modules", packageName);
  if (!existsSync(dependencyPath)) return false;
  try {
    return realpathSync(dependencyPath) === realpathSync(libraryDirectory);
  } catch {
    return false;
  }
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(command + " " + args.join(" ") + " failed in " + cwd);
  }
}

function install(directory) {
  run("pnpm", ["install", "--no-frozen-lockfile"], directory);
}

function switchToLocal(directory, packageJson, entry, localSpec) {
  const saved = readState(directory);
  if (
    entry.spec.startsWith("link:") ||
    entry.spec.startsWith("workspace:") ||
    hasLocalWorkspaceOverride(directory)
  ) {
    run("pnpm", ["unlink", packageName], directory);
    packageJson = readPackage(directory);
    entry = getDependency(packageJson);
  }

  if (entry.spec.startsWith("file:") && entry.spec !== localSpec) {
    throw new Error(
      "The project already links " +
        packageName +
        " from another path: " +
        entry.spec,
    );
  }

  if (entry.spec !== localSpec) {
    if (!versionSpec.test(entry.spec)) {
      throw new Error(
        "Cannot save the published npm version from specifier " + entry.spec,
      );
    }
    writeState(directory, entry);
    packageJson[entry.section][packageName] = localSpec;
    writeManifest(directory, packageJson);
  } else if (!saved) {
    const headEntry = readHeadDependency(directory);
    if (!versionSpec.test(headEntry.spec)) {
      throw new Error(
        "No published npm version is available in the last commit.",
      );
    }
    writeState(directory, headEntry);
  }

  const compiler = resolve(libraryDirectory, "node_modules/typescript/bin/tsc");
  run(process.execPath, [compiler, "-p", "tsconfig.json"], libraryDirectory);
  install(directory);
  console.log("Using local " + packageName + " from " + libraryDirectory + ".");
}

function switchToRemote(directory, packageJson, entry, localSpec) {
  if (
    entry.spec.startsWith("link:") ||
    entry.spec.startsWith("workspace:") ||
    hasLocalWorkspaceOverride(directory)
  ) {
    run("pnpm", ["unlink", packageName], directory);
    packageJson = readPackage(directory);
    entry = getDependency(packageJson);
  }

  if (entry.spec.startsWith("file:") && entry.spec !== localSpec) {
    throw new Error(
      "The project links " + packageName + " from another path: " + entry.spec,
    );
  }

  const saved = readState(directory);
  const needsInstall =
    entry.spec === localSpec ||
    saved !== null ||
    packagePointsToLocal(directory);
  if (entry.spec === localSpec) {
    const remoteEntry = saved ?? readHeadDependency(directory);
    if (!versionSpec.test(remoteEntry.spec)) {
      throw new Error("No published npm version is available to restore.");
    }
    packageJson[remoteEntry.section][packageName] = remoteEntry.spec;
    writeManifest(directory, packageJson);
  }

  if (needsInstall) install(directory);
  const path = statePath(directory);
  if (existsSync(path)) rmSync(path);
  console.log("Using the published npm package for " + packageName + ".");
}

function readStaged(directory, path) {
  try {
    return execFileSync("git", ["show", ":" + path], {
      cwd: directory,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return null;
  }
}

function isLocalSpec(spec) {
  return /^(?:file|link|workspace|portal):/.test(spec);
}

function lockHasLocalPackage(text) {
  return /(?:file|link):[^\s)]*panel-frame-ui/.test(text);
}

function guardCommit() {
  const directory = readProjectRoot();
  const problems = [];

  for (const [label, source] of [
    ["working tree", readFileSync(resolve(directory, "package.json"), "utf8")],
    ["staged commit", readStaged(directory, "package.json")],
  ]) {
    if (source === null) continue;
    try {
      const entry = getDependency(JSON.parse(source));
      if (isLocalSpec(entry.spec) || !versionSpec.test(entry.spec)) {
        problems.push(label + " package.json uses " + entry.spec);
      }
    } catch (error) {
      problems.push(
        label + " package.json could not be checked: " + error.message,
      );
    }
  }

  for (const path of ["pnpm-workspace.yaml", "pnpm-lock.yaml"]) {
    const absolute = resolve(directory, path);
    const working = existsSync(absolute) ? readFileSync(absolute, "utf8") : "";
    const staged = readStaged(directory, path) ?? "";
    const versions = [working, staged];
    if (
      versions.some((text) =>
        /^[ \t]+panel-frame-ui[ \t]*:[ \t]*(?:file|link):/m.test(text),
      )
    ) {
      problems.push(path + " contains a local package override");
    }
    if (path === "pnpm-lock.yaml" && versions.some(lockHasLocalPackage)) {
      problems.push(path + " resolves " + packageName + " from a local path");
    }
  }

  if (packagePointsToLocal(directory)) {
    problems.push("node_modules points directly to the local package checkout");
  }

  if (problems.length === 0) return 0;
  console.error(
    "Commit blocked: switch " + packageName + " to remote mode first.",
  );
  for (const problem of problems) console.error("  - " + problem);
  console.error("Run: pnpm run link panel-frame-ui remote");
  console.error(
    "If dependency files were staged, stage their restored remote versions and retry.",
  );
  return 1;
}

function main() {
  if (process.argv[2] === "--pre-commit") process.exit(guardCommit());

  const [requestedPackage, mode] = process.argv.slice(2);
  if (
    requestedPackage !== packageName ||
    !["local", "remote", "status"].includes(mode)
  ) {
    console.error("Usage: pnpm run link panel-frame-ui <local|remote|status>");
    process.exit(2);
  }

  try {
    const directory = readProjectRoot();
    const packageJson = readPackage(directory);
    const entry = getDependency(packageJson);
    const localSpec = localSpecFor(directory);

    if (mode === "status") {
      const local =
        isLocalSpec(entry.spec) ||
        hasLocalWorkspaceOverride(directory) ||
        packagePointsToLocal(directory);
      console.log(
        packageName +
          ": " +
          (local ? "local" : "remote") +
          " (" +
          entry.spec +
          ")",
      );
      return;
    }

    const libraryPackage = readPackage(libraryDirectory);
    if (libraryPackage.name !== packageName) {
      throw new Error(
        "The adjacent library checkout is not " + packageName + ".",
      );
    }
    if (mode === "local") {
      switchToLocal(directory, packageJson, entry, localSpec);
    } else {
      switchToRemote(directory, packageJson, entry, localSpec);
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

main();
