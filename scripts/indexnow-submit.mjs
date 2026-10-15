#!/usr/bin/env node
/**
 * Notifies IndexNow-participating search engines (Bing, Yandex, Naver, Seznam)
 * about the URLs in the live sitemap. Bing's index also feeds Copilot, DuckDuckGo
 * and ChatGPT search. Google does not support IndexNow; use Search Console.
 *
 * Usage: node scripts/indexnow-submit.mjs [--dry-run]
 *
 * The key must match the file served at https://<host>/<key>.txt
 * (apps/marketing/public/<key>.txt). It is public by design.
 */
const host = "getcontentsignal.com";
const key = "02661595d253f7d192af6e9cb13dd540";
const dryRun = process.argv.includes("--dry-run");

const sitemap = await fetch(`https://${host}/sitemap.xml`);
if (!sitemap.ok) {
  console.error(`Could not read sitemap: HTTP ${sitemap.status}`);
  process.exit(1);
}

const xml = await sitemap.text();
const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((match) => match[1])
  .filter((url) => new URL(url).hostname === host);

const keyCheck = await fetch(`https://${host}/${key}.txt`);
if (!keyCheck.ok || (await keyCheck.text()).trim() !== key) {
  console.error("Key file is not live yet; deploy first.");
  process.exit(1);
}

console.log(`${urlList.length} URLs from sitemap`);
if (dryRun) {
  console.log(urlList.join("\n"));
  process.exit(0);
}

const response = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host, key, keyLocation: `https://${host}/${key}.txt`, urlList })
});

// 200 = accepted, 202 = accepted pending key validation.
console.log(`IndexNow responded HTTP ${response.status}`);
process.exit(response.status === 200 || response.status === 202 ? 0 : 1);
