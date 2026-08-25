import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const output = join(root, "_site");
const recipient = process.env.FORM_RECIPIENT?.trim();

if (!recipient) {
  throw new Error("FORM_RECIPIENT repository secret is required for the Pages build.");
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const file of ["styles.css", "app.js"]) {
  await copyFile(join(root, file), join(output, file));
}

const assetVersion = (process.env.GITHUB_SHA || "local").slice(0, 12);
const sourceHtml = await readFile(join(root, "index.html"), "utf8");
const versionedHtml = sourceHtml
  .replace("./styles.css", `./styles.css?v=${assetVersion}`)
  .replace("./config.js", `./config.js?v=${assetVersion}`)
  .replace("./app.js", `./app.js?v=${assetVersion}`);
await writeFile(join(output, "index.html"), versionedHtml, "utf8");

const encodedRecipient = Buffer.from(recipient, "utf8").toString("base64");
const pagesConfig = `window.GSM_CONFIG = Object.freeze({
  provider: "formsubmit",
  submissionEndpoint: "https://formsubmit.co/ajax/" + atob("${encodedRecipient}"),
});
`;

await writeFile(join(output, "config.js"), pagesConfig, "utf8");
await writeFile(join(output, ".nojekyll"), "", "utf8");

console.log("GitHub Pages artifact prepared.");
