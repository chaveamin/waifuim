import { readFileSync, writeFileSync, readdirSync } from "fs";
import { resolve } from "path";

const picsDir = resolve(import.meta.dirname ?? ".", "anime_pics");
const outDir = resolve(import.meta.dirname ?? ".", "src", "bot", "commands");

function extractUrls(filePath) {
  const data = JSON.parse(readFileSync(filePath, "utf-8"));
  const urls = [];
  for (const msg of data) {
    if (!msg.attachments) continue;
    for (const att of msg.attachments) {
      if (att.content_type?.startsWith("image/")) {
        urls.push(att.url);
      }
    }
  }
  return urls;
}

// Normal pages (1-49)
const normalUrls = [];
for (let i = 1; i <= 49; i++) {
  const file = resolve(picsDir, `anime_pics-page-${i}.json`);
  try {
    normalUrls.push(...extractUrls(file));
  } catch (e) {
    console.error(`Failed to load page ${i}:`, e.message);
  }
}

// Uncensored
const uncensoredUrls = [];
try {
  uncensoredUrls.push(...extractUrls(resolve(picsDir, "anime_pics_uncensored.json")));
} catch (e) {
  console.error("Failed to load uncensored:", e.message);
}

const output = { normal: normalUrls, uncensored: uncensoredUrls };
writeFileSync(resolve(outDir, "animePicsData.json"), JSON.stringify(output));
console.log(`Generated animePicsData.json: ${normalUrls.length} normal, ${uncensoredUrls.length} uncensored`);
