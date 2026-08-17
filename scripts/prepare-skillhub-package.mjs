#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const skillsRoot = path.join(repositoryRoot, "skills");
const versionFile = path.join(repositoryRoot, "VERSION");
const licenseFile = path.join(repositoryRoot, "LICENSE");
const skillHubConfigName = "skillhub.json";
const reservedFields = ["slug", "displayName", "version", "summary", "license"];
const semverPattern = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function fail(message) {
  throw new Error(message);
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

function readVersion() {
  if (!fs.existsSync(versionFile)) fail(`VERSION not found: ${versionFile}`);
  const version = fs.readFileSync(versionFile, "utf8").trim();
  if (!semverPattern.test(version)) fail(`VERSION is not semantic: ${version}`);
  return version;
}

function readConfig(skillDirectory) {
  const configFile = path.join(skillDirectory, skillHubConfigName);
  if (!fs.existsSync(configFile)) fail(`${configFile}: missing SkillHub metadata`);

  let config;
  try {
    config = JSON.parse(fs.readFileSync(configFile, "utf8"));
  } catch (error) {
    fail(`${configFile}: invalid JSON: ${error.message}`);
  }

  const keys = Object.keys(config).sort();
  const expectedKeys = ["displayName", "license", "slug", "summary", "version"].sort();
  if (keys.join(",") !== expectedKeys.join(",")) {
    fail(`${configFile}: expected only ${expectedKeys.join(", ")}`);
  }
  if (typeof config.slug !== "string" || !slugPattern.test(config.slug) || config.slug.length > 64) {
    fail(`${configFile}: slug must be lowercase hyphen-case with at most 64 characters`);
  }
  if (typeof config.version !== "string" || !semverPattern.test(config.version)) {
    fail(`${configFile}: version must be a semantic version string`);
  }
  for (const field of ["displayName", "summary", "license"]) {
    if (typeof config[field] !== "string" || config[field].trim() === "") {
      fail(`${configFile}: ${field} must be a non-empty string`);
    }
  }
  return config;
}

function parseSkill(skillDirectory) {
  const skillFile = path.join(skillDirectory, "SKILL.md");
  if (!fs.existsSync(skillFile)) fail(`${skillFile}: file not found`);

  const text = fs.readFileSync(skillFile, "utf8");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) fail(`${skillFile}: invalid YAML frontmatter`);

  const fields = new Map();
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim()) continue;
    const separator = line.indexOf(":");
    if (separator <= 0) fail(`${skillFile}: unsupported frontmatter line ${JSON.stringify(line)}`);
    fields.set(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
  }

  const name = fields.get("name")?.replace(/^['"]|['"]$/g, "");
  if (!name) fail(`${skillFile}: name is required`);
  if (name !== path.basename(skillDirectory)) {
    fail(`${skillFile}: name ${name} does not match directory ${path.basename(skillDirectory)}`);
  }
  for (const field of reservedFields) {
    if (fields.has(field)) fail(`${skillFile}: ${field} is generated from SkillHub metadata`);
  }

  return { skillFile, text, frontmatter: match[1], frontmatterLength: match[0].length, name };
}

function isPublicSkillFile(file) {
  return !path.relative(skillsRoot, file).split(path.sep).includes("develop");
}

function validateAll() {
  const skillFiles = walk(skillsRoot)
    .filter((file) => path.basename(file) === "SKILL.md" && isPublicSkillFile(file));
  const slugs = new Map();

  for (const skillFile of skillFiles) {
    const skillDirectory = path.dirname(skillFile);
    const skill = parseSkill(skillDirectory);
    const config = readConfig(skillDirectory);
    if (slugs.has(config.slug)) {
      fail(`duplicate SkillHub slug ${config.slug}: ${slugs.get(config.slug)} and ${skill.name}`);
    }
    slugs.set(config.slug, skill.name);
  }

  const configFiles = walk(skillsRoot)
    .filter((file) => path.basename(file) === skillHubConfigName && isPublicSkillFile(file));
  if (configFiles.length !== skillFiles.length) {
    fail(`expected one ${skillHubConfigName} per skill; found ${configFiles.length} configs for ${skillFiles.length} skills`);
  }

  readVersion();
  if (!fs.existsSync(licenseFile)) fail(`LICENSE not found: ${licenseFile}`);
  console.log(`Validated SkillHub metadata for ${skillFiles.length} skills`);
}

function yamlString(value) {
  return JSON.stringify(value);
}

function preparePackage(skillPath, outputPath) {
  const skillDirectory = path.resolve(repositoryRoot, skillPath);
  const outputDirectory = path.resolve(outputPath);
  const relativeSkillPath = path.relative(skillsRoot, skillDirectory);

  if (relativeSkillPath.startsWith("..") || path.isAbsolute(relativeSkillPath)) {
    fail(`skill directory must be inside ${skillsRoot}: ${skillDirectory}`);
  }
  const relativeOutputPath = path.relative(repositoryRoot, outputDirectory);
  if (!relativeOutputPath.startsWith("..") && !path.isAbsolute(relativeOutputPath)) {
    fail(`output directory must be outside the repository: ${outputDirectory}`);
  }

  const skill = parseSkill(skillDirectory);
  const config = readConfig(skillDirectory);
  // 仓库根 VERSION 仍用于发布校验；SkillHub 包版本以 skillhub.json 为准。
  readVersion();
  const generatedFields = [
    `slug: ${yamlString(config.slug)}`,
    `displayName: ${yamlString(config.displayName)}`,
    `version: ${yamlString(config.version)}`,
    `summary: ${yamlString(config.summary)}`,
    `license: ${yamlString(config.license)}`,
  ];
  const body = skill.text.slice(skill.frontmatterLength);
  const generatedSkill = `---\n${skill.frontmatter.trimEnd()}\n${generatedFields.join("\n")}\n---\n${body}`;

  fs.rmSync(outputDirectory, { recursive: true, force: true });
  fs.cpSync(skillDirectory, outputDirectory, { recursive: true });
  fs.rmSync(path.join(outputDirectory, skillHubConfigName));
  fs.writeFileSync(path.join(outputDirectory, "SKILL.md"), generatedSkill, "utf8");
  fs.copyFileSync(licenseFile, path.join(outputDirectory, "LICENSE"));

  console.log(`Prepared ${skill.name} as ${config.slug}@${config.version} in ${outputDirectory}`);
}

const args = process.argv.slice(2);
try {
  if (args.length === 1 && args[0] === "--check") {
    validateAll();
  } else if (args.length === 2) {
    validateAll();
    preparePackage(args[0], args[1]);
  } else {
    fail("usage: prepare-skillhub-package.mjs --check | <skill-directory> <output-directory>");
  }
} catch (error) {
  console.error(`SkillHub package preparation failed: ${error.message}`);
  process.exit(1);
}
