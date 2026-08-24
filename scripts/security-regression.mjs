import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const root = process.cwd();
const scanRoots = ["app", "lib"];
const forbidden = [
  { pattern: /Welcome123!/g, reason: "shared default password" },
  { pattern: /createAdminClient/g, reason: "admin Supabase client in Next runtime" },
  { pattern: /SUPABASE_SERVICE_ROLE_KEY/g, reason: "service-role key in Next runtime" },
  { pattern: /SUPABASE_SECRET_KEY/g, reason: "secret key in Next runtime" },
];
const extensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (extensions.has(entry.name.slice(entry.name.lastIndexOf(".")))) files.push(path);
  }
  return files;
}

const failures = [];
for (const scanRoot of scanRoots) {
  for (const file of await walk(join(root, scanRoot))) {
    const content = await readFile(file, "utf8");
    for (const rule of forbidden) {
      rule.pattern.lastIndex = 0;
      if (rule.pattern.test(content)) {
        failures.push(`${relative(root, file)}: ${rule.reason}`);
      }
    }
  }
}

const proxySource = await readFile(join(root, "lib/supabase/proxy.ts"), "utf8");
for (const requiredPublicPrefix of ["/auth", "/demo", "/pricing"]) {
  if (!proxySource.includes(`\"${requiredPublicPrefix}\"`)) {
    failures.push(`lib/supabase/proxy.ts: missing required public route ${requiredPublicPrefix}`);
  }
}

if (failures.length) {
  console.error("Security regression checks failed:\n" + failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log("Security regression checks passed.");
