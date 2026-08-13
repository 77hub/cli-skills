import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const skillsRoot = path.join(root, "skills");
const routingFixturesFile = path.join(root, "tests", "skill-routing-fixtures.json");
const expectedSkills = new Map([
  ["qiqi-business-foundations", "foundation"],
  ["qiqi-cli", "core"],
  ["qiqi-cli-installation", "core"],
  ["qiqi-project", "project"],
]);
const forbiddenPatterns = [
  ["本地地址", /\b(?:localhost|127\.0\.0\.1)\b/i],
  ["内部域名", /\b(?:[a-z0-9-]+\.)*(?:q7link|e7link)\.com\b/i],
  ["内部请求头", /\b(?:Tenant-Id|User-Id|Access-Token|X-Request-Id)\b/i],
  ["内部数据或运行组件", /\b(?:GraphQL|SQL|Redis|Jedis|Elasticsearch|PostgreSQL|MySQL)\b/i],
  ["内部源码路径", /(?:^|[\\/\s`])(?:internal|backend|openspec)[\\/]/im],
  ["内部接口路径", /\/(?:baseapp|ProjectMcp)\//i],
  ["内部环境名", /\bnx-[a-z0-9-]+\b/i],
  ["内部类或包名", /\bcom\.q7link\b/i],
  ["旧交付通道", /\bMCP\b/],
  ["非产品运行名称", /\b77hub-cli\b|\bqiqi-(?:dev|local)\b/i],
  ["过时能力名称", /\b(?:whoami|list_object_types|explore_object|get_record|get_pending_approvals|decide_approval|change_bill_submission|delete_record|get_async_task_status|get_project|create_task|update_task|execute_task|log_work_hours)\b/],
  ["过时工具或参数", /\b(?:complete_task|assigneeId|dueDate|flowActionId|fileId)\b/],
];
const errors = [];

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

function relative(file) {
  return path.relative(root, file).split(path.sep).join("/");
}

function lineNumber(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function parseFrontmatter(file, text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) {
    errors.push(`${relative(file)}: 缺少合法 YAML frontmatter`);
    return null;
  }
  const fields = new Map();
  for (const rawLine of match[1].split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator <= 0) {
      errors.push(`${relative(file)}: 无法解析 frontmatter 行 ${JSON.stringify(rawLine)}`);
      continue;
    }
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
    if (fields.has(key)) errors.push(`${relative(file)}: frontmatter 字段 ${key} 重复`);
    fields.set(key, value);
  }
  const keys = [...fields.keys()].sort();
  if (keys.join(",") !== "description,name") errors.push(`${relative(file)}: frontmatter 只能包含 name 和 description`);
  if (!fields.get("name")) errors.push(`${relative(file)}: name 不能为空`);
  if (!fields.get("description")) errors.push(`${relative(file)}: description 不能为空`);
  if (/\b(?:qiqi-business-foundations|qiqi-cli|qiqi-project)\b/i.test(fields.get("description"))) {
    errors.push(`${relative(file)}: description 不应依赖其它 Skill 名称`);
  }
  return fields;
}

function markdownAnchors(text) {
  const anchors = new Set();
  const counts = new Map();
  for (const match of text.matchAll(/^#{1,6}\s+(.+?)\s*#*$/gm)) {
    const base = match[1].trim().toLowerCase().replace(/<[^>]+>/g, "").replace(/[`*_~]/g, "")
      .replace(/[^\p{L}\p{N}\p{M}\s-]/gu, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    anchors.add(count === 0 ? base : `${base}-${count}`);
  }
  return anchors;
}

function validateLinks(file, text) {
  for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    let target = match[1].trim().replace(/^<|>$/g, "");
    if (/^(?:https?:|mailto:)/i.test(target)) continue;
    const hashIndex = target.indexOf("#");
    const anchor = hashIndex >= 0 ? decodeURIComponent(target.slice(hashIndex + 1)) : "";
    target = hashIndex >= 0 ? target.slice(0, hashIndex) : target;
    const resolved = target ? path.resolve(path.dirname(file), target) : file;
    if (!fs.existsSync(resolved)) {
      errors.push(`${relative(file)}:${lineNumber(text, match.index)}: 引用不存在 ${target}`);
    } else if (anchor && resolved.endsWith(".md")) {
      const targetText = resolved === file ? text : fs.readFileSync(resolved, "utf8");
      if (!markdownAnchors(targetText).has(anchor)) errors.push(`${relative(file)}:${lineNumber(text, match.index)}: Markdown 锚点不存在 #${anchor}`);
    }
  }
}

function validateFencedBlocks(file, text) {
  if ((text.match(/^```/gm) ?? []).length % 2 !== 0) errors.push(`${relative(file)}: Markdown 代码围栏未成对闭合`);
  for (const match of text.matchAll(/```mermaid\s*\r?\n([\s\S]*?)\r?\n```/g)) {
    const source = match[1].trim();
    const location = `${relative(file)}:${lineNumber(text, match.index)}`;
    if (!/^(?:flowchart|graph|sequenceDiagram|stateDiagram(?:-v2)?|classDiagram|erDiagram|journey|gantt|pie|mindmap|timeline)\b/.test(source)) {
      errors.push(`${location}: Mermaid 缺少受支持的图表声明`);
    }
    for (const [open, close] of [["[", "]"], ["(", ")"], ["{", "}"]]) {
      if (source.split(open).length !== source.split(close).length) errors.push(`${location}: Mermaid 符号 ${open}${close} 未配对`);
    }
    if ((source.match(/(?<!\\)"/g) ?? []).length % 2 !== 0) errors.push(`${location}: Mermaid 双引号未配对`);
  }
}

function validatePublicContent(file, text) {
  if (/\bTODO\b|\[TODO|placeholder/i.test(text)) errors.push(`${relative(file)}: 包含未完成占位内容`);
  for (const [label, pattern] of forbiddenPatterns) {
    const match = pattern.exec(text);
    if (match) errors.push(`${relative(file)}:${lineNumber(text, match.index)}: 检测到${label} ${JSON.stringify(match[0])}`);
  }
  if (text.split(/\r?\n/).length > 500) errors.push(`${relative(file)}: 共超过 500 行，SKILL.md 或引用文件不得超过 500 行`);
}

function validateSkillShape(file, text) {
  if (/^##\s+(?:工具边界|工具列表|参数(?:说明|清单)?)\s*$/m.test(text)) errors.push(`${relative(file)}: 主技能不得退化为工具或参数目录`);
  if (/^\|\s*(?:工具|参数)\s*\|[^\n]*(?:说明|必填)/m.test(text)) errors.push(`${relative(file)}: 主技能不得复制运行时命令参数表`);
  if ((text.match(/^-\s+`[a-z][a-z0-9_]+`\s*[：:]/gm) ?? []).length >= 4) errors.push(`${relative(file)}: 主技能包含疑似逐工具清单`);
}

if (!fs.existsSync(skillsRoot)) errors.push("缺少 skills/ 目录");
const isDevelopFile = (file) => relative(file).startsWith("skills/develop/");
const discoveredSkillFiles = walk(skillsRoot).filter((file) => path.basename(file) === "SKILL.md" && !isDevelopFile(file));
const discoveredNames = new Set();

for (const file of discoveredSkillFiles) {
  const text = fs.readFileSync(file, "utf8");
  const fields = parseFrontmatter(file, text);
  if (!fields) continue;
  const name = fields.get("name");
  const folderName = path.basename(path.dirname(file));
  const category = path.basename(path.dirname(path.dirname(file)));
  discoveredNames.add(name);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) errors.push(`${relative(file)}: name 必须使用小写连字符格式`);
  if (name !== folderName) errors.push(`${relative(file)}: name ${name} 与目录 ${folderName} 不一致`);
  if (expectedSkills.get(name) !== category) errors.push(`${relative(file)}: 技能分类应为 ${expectedSkills.get(name) ?? "未定义"}`);
  const skillDirectory = path.dirname(file);
  for (const forbiddenDirectory of ["agents", "assets", "scripts"]) {
    if (fs.existsSync(path.join(skillDirectory, forbiddenDirectory))) errors.push(`${relative(file)}: 首版本不得包含技能级 ${forbiddenDirectory}/`);
  }
  const referencesDirectory = path.join(skillDirectory, "references");
  if (!fs.existsSync(referencesDirectory)) {
    errors.push(`${relative(file)}: 缺少 references/`);
  } else {
    for (const referenceFile of walk(referencesDirectory)) {
      if (path.dirname(referenceFile) !== referencesDirectory || path.extname(referenceFile) !== ".md") errors.push(`${relative(referenceFile)}: references 只允许一层 Markdown 文件`);
      if (!text.includes(`](references/${path.basename(referenceFile)})`)) errors.push(`${relative(file)}: 未直接链接 references/${path.basename(referenceFile)}`);
    }
  }
  validateLinks(file, text);
  validateFencedBlocks(file, text);
  validatePublicContent(file, text);
  validateSkillShape(file, text);
}

for (const [name, category] of expectedSkills) if (!discoveredNames.has(name)) errors.push(`缺少技能 ${category}/${name}`);
for (const name of discoveredNames) if (!expectedSkills.has(name)) errors.push(`发现未登记技能 ${name}`);
if (discoveredSkillFiles.length !== expectedSkills.size) errors.push(`应发现 ${expectedSkills.size} 个技能，实际发现 ${discoveredSkillFiles.length} 个`);

for (const file of walk(skillsRoot).filter((file) => file.endsWith(".md") && !isDevelopFile(file))) {
  if (path.basename(file) === "SKILL.md") continue;
  const text = fs.readFileSync(file, "utf8");
  validateLinks(file, text);
  validateFencedBlocks(file, text);
  validatePublicContent(file, text);
}

const readmeFile = path.join(root, "README.md");
if (fs.existsSync(readmeFile)) {
  const text = fs.readFileSync(readmeFile, "utf8");
  validateLinks(readmeFile, text);
  validateFencedBlocks(readmeFile, text);
  validatePublicContent(readmeFile, text);
}

const requiredContent = new Map([
  ["qiqi-business-foundations", ["当前租户", "业务阶段", "权威事实"]],
  ["qiqi-cli", [
    "--profile", "77hub.large-output", "状态未知",
    "records attachments list/url/upload/delete", "records attachments url",
  ]],
  ["qiqi-cli-installation", [
    "@77hub/cli@latest", "https://github.com/77hub/cli-skills",
    "CLI：", "授权：", "Skills：", "--skill \"*\"", "不得使用 `--all`",
  ]],
  ["qiqi-project", [
    "project task create", "project task update", "project task start",
    "project task finish", "project work-hours log", "同一父任务", "默认串行",
  ]],
]);

for (const [name, snippets] of requiredContent) {
  const skillFile = discoveredSkillFiles.find((file) => path.basename(path.dirname(file)) === name);
  if (!skillFile) continue;
  const content = walk(path.dirname(skillFile)).filter((file) => file.endsWith(".md")).map((file) => fs.readFileSync(file, "utf8")).join("\n");
  for (const snippet of snippets) if (!content.includes(snippet)) errors.push(`${name}: 缺少关键行为约束 ${snippet}`);
}

const allSkillText = walk(skillsRoot).filter((file) => file.endsWith(".md") && !isDevelopFile(file)).map((file) => fs.readFileSync(file, "utf8")).join("\n");
if (/do-action\s+WorkTask(?::|<)/i.test(allSkillText)) errors.push("Project 任务开始或完成不得使用 do-action WorkTask 路径");
const qiqiCLIText = walk(path.join(skillsRoot, "core", "qiqi-cli-installation")).filter((file) => file.endsWith(".md")).map((file) => fs.readFileSync(file, "utf8")).join("\n");
for (const pattern of [/requires\s+qiqi/i, /qiqi-dev/i, /npm\s*(?:会|将)\s*自动(?:安装|更新).*Skills/i, /placeholder/i]) {
  if (pattern.test(qiqiCLIText)) errors.push(`qiqi-cli-installation: 安装内容检测到禁止内容 ${pattern}`);
}
try {
  const fixtures = JSON.parse(fs.readFileSync(routingFixturesFile, "utf8"));
  const expected = ["qiqi-cli", "qiqi-cli-installation", "qiqi-dev-runtime"];
  if (!Array.isArray(fixtures) || [...new Set(fixtures.map((fixture) => fixture.expectedSkill))].sort().join("\n") !== expected.sort().join("\n")) {
    errors.push("技能路由 fixture 必须覆盖 production 安装、运行与 develop adapter");
  }
} catch (error) {
  errors.push(`技能路由 fixture 无法读取: ${error.message}`);
}

if (errors.length > 0) {
  console.error(`Skills validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`Validated ${discoveredSkillFiles.length} skills: ${[...discoveredNames].sort().join(", ")}`);
