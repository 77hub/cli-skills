#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { discoverPublicSkills, walk } from "./public-skills.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const releasesDirectory = path.join(repositoryRoot, "publish", "releases");
const versionFile = path.join(repositoryRoot, "VERSION");
const versionPattern = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/;
const changeTypes = new Set(["patch", "minor", "major"]);

function fail(message) {
  throw new Error(message);
}

function knownSkills() {
  return new Map([...discoverPublicSkills(repositoryRoot)].map(([name, skill]) => [name, skill.directory]));
}

function readManifest(manifestPath) {
  const file = path.resolve(repositoryRoot, manifestPath);
  if (!fs.existsSync(file)) fail(`release manifest not found: ${manifestPath}`);

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail(`${manifestPath}: invalid JSON: ${error.message}`);
  }
  if (Object.keys(manifest).sort().join(",") !== "skills,version") {
    fail(`${manifestPath}: expected only skills and version`);
  }
  if (typeof manifest.version !== "string" || !versionPattern.test(manifest.version)) {
    fail(`${manifestPath}: version must be semantic without a v prefix`);
  }
  if (path.basename(file) !== `v${manifest.version}.json`) {
    fail(`${manifestPath}: filename must be v${manifest.version}.json`);
  }
  if (!Array.isArray(manifest.skills) || manifest.skills.length === 0) {
    fail(`${manifestPath}: skills must be a non-empty array`);
  }

  const availableSkills = knownSkills();
  const names = new Set();
  for (const entry of manifest.skills) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      fail(`${manifestPath}: every skills entry must be an object`);
    }
    if (Object.keys(entry).sort().join(",") !== "changelog,name,type") {
      fail(`${manifestPath}: every skills entry must contain only name, type, and changelog`);
    }
    if (!availableSkills.has(entry.name)) fail(`${manifestPath}: unknown skill ${entry.name}`);
    if (names.has(entry.name)) fail(`${manifestPath}: duplicate skill ${entry.name}`);
    if (!changeTypes.has(entry.type)) fail(`${manifestPath}: invalid change type for ${entry.name}`);
    if (typeof entry.changelog !== "string" || entry.changelog.trim() === "") {
      fail(`${manifestPath}: changelog for ${entry.name} must not be empty`);
    }
    names.add(entry.name);
  }
  return { file, manifest, availableSkills };
}

function formatReleaseNotes(manifest) {
  const sections = [
    "## 本次发布的 Skills",
    "",
    "本次 Release 仅包含以下发生变化的 Skill：",
  ];
  for (const entry of manifest.skills) {
    sections.push(
      "",
      `### \`${entry.name}\``,
      "",
      `**变更级别：** \`${entry.type}\``,
      "",
      entry.changelog.trim(),
    );
  }
  return `${sections.join("\n")}\n`;
}

function currentManifestPath() {
  const version = fs.readFileSync(versionFile, "utf8").trim();
  if (!versionPattern.test(version)) fail(`VERSION is not semantic: ${version}`);
  return path.join(releasesDirectory, `v${version}.json`);
}

const args = process.argv.slice(2);
try {
  if (args.length === 1 && args[0] === "--all") {
    const manifests = walk(releasesDirectory).filter((file) => file.endsWith(".json")).sort();
    if (manifests.length === 0) fail("no release manifests found");
    for (const manifest of manifests) readManifest(manifest);
    const current = readManifest(currentManifestPath());
    const recordedVersion = fs.readFileSync(versionFile, "utf8").trim();
    if (current.manifest.version !== recordedVersion) fail("current release manifest does not match VERSION");
    console.log(`Validated ${manifests.length} release manifest(s)`);
  } else if (args.length === 1 && args[0] === "--current") {
    const { manifest } = readManifest(currentManifestPath());
    console.log(`Validated current release v${manifest.version}`);
  } else if (args.length === 3 && args[0] === "--has") {
    const { manifest } = readManifest(args[1]);
    process.stdout.write(manifest.skills.some((entry) => entry.name === args[2]) ? "true" : "false");
  } else if (args.length === 3 && args[0] === "--changelog") {
    const { manifest } = readManifest(args[1]);
    const entry = manifest.skills.find((candidate) => candidate.name === args[2]);
    if (!entry) fail(`${args[2]} is not listed in ${args[1]}`);
    process.stdout.write(entry.changelog);
  } else if (args.length === 2 && args[0] === "--entries") {
    const { manifest, availableSkills } = readManifest(args[1]);
    const entries = manifest.skills
      .map((entry) => `${entry.name}\t${availableSkills.get(entry.name)}`)
      .join("\n");
    process.stdout.write(`${entries}\n`);
  } else if (args.length === 1 && args[0] === "--known-entries") {
    const entries = [...knownSkills()].map(([name, directory]) => `${name}\t${directory}`).join("\n");
    process.stdout.write(`${entries}\n`);
  } else if (args.length === 2 && args[0] === "--notes") {
    const { manifest } = readManifest(args[1]);
    process.stdout.write(formatReleaseNotes(manifest));
  } else {
    fail("usage: validate-skillhub-release.mjs --all | --current | --has <manifest> <skill> | --changelog <manifest> <skill> | --entries <manifest> | --known-entries | --notes <manifest>");
  }
} catch (error) {
  console.error(`Release manifest validation failed: ${error.message}`);
  process.exit(1);
}
