import fs from "node:fs";
import path from "node:path";

export function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

export function repositoryRelative(repositoryRoot, file) {
  return path.relative(repositoryRoot, file).split(path.sep).join("/");
}

export function discoverPublicSkills(repositoryRoot) {
  const skillsRoot = path.join(repositoryRoot, "skills");
  const skillFiles = walk(skillsRoot)
    .filter((file) => path.basename(file) === "SKILL.md")
    .filter((file) => !repositoryRelative(skillsRoot, file).split("/").includes("develop"))
    .sort();
  const skills = new Map();

  for (const skillFile of skillFiles) {
    const directoryPath = path.dirname(skillFile);
    const name = path.basename(directoryPath);
    if (skills.has(name)) throw new Error(`duplicate Skill directory name: ${name}`);
    skills.set(name, {
      name,
      directory: repositoryRelative(repositoryRoot, directoryPath),
      directoryPath,
      skillFile,
    });
  }
  if (skills.size === 0) throw new Error("no public skills found");
  return skills;
}

export function resolveSkillHubMetadata(repositoryRoot, skills = discoverPublicSkills(repositoryRoot)) {
  const metadataRoot = path.join(repositoryRoot, "publish", "skillhub");
  const allMetadataFiles = walk(metadataRoot).sort();
  const unexpectedFile = allMetadataFiles.find((file) => !file.endsWith(".json"));
  if (unexpectedFile) {
    throw new Error(`${repositoryRelative(repositoryRoot, unexpectedFile)}: SkillHub metadata must be JSON`);
  }
  const metadataFiles = allMetadataFiles;
  const metadata = new Map();

  for (const file of metadataFiles) {
    const name = path.basename(file, ".json");
    if (metadata.has(name)) throw new Error(`duplicate SkillHub metadata name: ${name}`);
    if (path.dirname(file) !== metadataRoot) {
      throw new Error(`${repositoryRelative(repositoryRoot, file)}: metadata must be directly under publish/skillhub`);
    }
    if (!skills.has(name)) throw new Error(`orphaned SkillHub metadata: ${name}`);
    metadata.set(name, { name, file });
  }

  for (const name of skills.keys()) {
    if (!metadata.has(name)) throw new Error(`missing SkillHub metadata for ${name}`);
  }
  return metadata;
}
