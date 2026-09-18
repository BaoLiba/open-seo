import fs from "node:fs";
import path from "node:path";

const files = [
  path.resolve("dist/server/wrangler.json"),
  path.resolve("dist/open_seo_audit/wrangler.json"),
];

for (const file of files) {
  if (fs.existsSync(file)) {
    try {
      const content = fs.readFileSync(file, "utf8");
      const json = JSON.parse(content);
      if ("legacy_env" in json) {
        delete json.legacy_env;
        fs.writeFileSync(file, JSON.stringify(json, null, 2), "utf8");
        console.log(`[fix-wrangler-dist] Removed legacy_env from ${file}`);
      }
    } catch (err) {
      console.warn(`[fix-wrangler-dist] Failed to process ${file}:`, err);
    }
  }
}
