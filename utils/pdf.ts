// utils/pdf.ts
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import type { CoverLetter, Resume } from "@/types";

/** Basic HTML escaping for safety */
function esc(s: string) {
  return (s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/** Super simple HTML -> plain text (enough for RTF export) */
function stripHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/?[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Wraps content in a printable page */
function wrapHtml(body: string, title = "Export") {
  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>${esc(title)}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 24px; color: #111; }
        h1 { font-size: 20px; margin: 0 0 8px; }
        .meta { color: #444; font-size: 12px; margin-bottom: 18px; }
        .content { font-size: 14px; line-height: 1.55; white-space: pre-wrap; }
        .hr { height:1px; background:#e5e7eb; margin: 16px 0; }
      </style>
    </head>
    <body>
      ${body}
    </body>
  </html>`;
}

/** Build cover letter HTML from your CoverLetter object */
function coverLetterToHtml(letter: CoverLetter) {
  const title = esc(letter.title);
  const company = esc(letter.company);
  const jobTitle = esc(letter.jobTitle);
  const tone = esc(letter.tone);

  // Your model might store content in different fields.
  // Try these in order:
  const raw =
    // common names:
    (letter as any).content ??
    (letter as any).body ??
    (letter as any).text ??
    // if uploaded file, you may not have body text:
    "";

  const bodyText = esc(raw);

  const body = `
    <h1>${title || "Cover Letter"}</h1>
    <div class="meta">
      ${company ? `${company}` : ""}${company && jobTitle ? " · " : ""}${jobTitle ? `${jobTitle}` : ""}
      ${tone ? ` · ${tone}` : ""}
    </div>
    <div class="hr"></div>
    <div class="content">${bodyText || "No cover letter content found."}</div>
  `;

  return wrapHtml(body, title || "Cover Letter");
}

/** Build resume HTML from your Resume object (basic scaffold) */
function resumeToHtml(resume: Resume) {
  const title = esc((resume as any).title ?? "Resume");

  // Try common fields; tweak as your Resume shape evolves
  const name = esc((resume as any).name ?? "");
  const summary = esc((resume as any).summary ?? "");
  const experience = (resume as any).experience as any[] | undefined;
  const skills = (resume as any).skills as string[] | undefined;

  const expHtml = Array.isArray(experience)
    ? experience
        .map((e) => {
          const role = esc(e.role ?? "");
          const company = esc(e.company ?? "");
          const dates = esc(e.dates ?? "");
          const bullets = Array.isArray(e.bullets) ? e.bullets : [];
          return `
            <div style="margin-bottom:12px;">
              <div style="font-weight:700;">${role}${role && company ? " · " : ""}${company}</div>
              <div style="color:#444; font-size:12px; margin-top:2px;">${dates}</div>
              <div class="content" style="margin-top:6px;">${esc(bullets.join("\n"))}</div>
            </div>
          `;
        })
        .join("")
    : "";

  const skillsHtml =
    Array.isArray(skills) && skills.length
      ? `<div class="hr"></div><div style="font-weight:700; margin-bottom:6px;">Skills</div><div class="content">${esc(
          skills.join(" • "),
        )}</div>`
      : "";

  const body = `
    <h1>${name || title}</h1>
    ${summary ? `<div class="content">${summary}</div>` : ""}
    ${expHtml ? `<div class="hr"></div><div style="font-weight:700; margin-bottom:6px;">Experience</div>${expHtml}` : ""}
    ${skillsHtml}
  `;

  return wrapHtml(body, title);
}

/** Convert text -> tiny RTF doc */
function textToRtf(text: string) {
  const safe = (text ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll("{", "\\{")
    .replaceAll("}", "\\}")
    .replaceAll("\t", "\\tab ")
    .replaceAll("\n", "\\par\n");

  return `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Arial;}}\\fs24 ${safe}}`;
}

/* ---------------- EXPORTS ---------------- */

export async function exportCoverLetterToPdf(letter: CoverLetter) {
  const html = coverLetterToHtml(letter);
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri);
}

export async function exportCoverLetterToRtf(letter: CoverLetter) {
  const html = coverLetterToHtml(letter);
  const text = stripHtml(html);
  const rtf = textToRtf(text);

  // Print/share as a file via HTML wrapper
  const { uri } = await Print.printToFileAsync({
    html: wrapHtml(
      `<pre class="content">${esc(rtf)}</pre>`,
      "Cover Letter RTF",
    ),
  });

  await Sharing.shareAsync(uri);
}

export async function exportResumeToPdf(resume: Resume) {
  const html = resumeToHtml(resume);
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri);
}

export async function exportResumeToRtf(resume: Resume) {
  const html = resumeToHtml(resume);
  const text = stripHtml(html);
  const rtf = textToRtf(text);

  const { uri } = await Print.printToFileAsync({
    html: wrapHtml(`<pre class="content">${esc(rtf)}</pre>`, "Resume RTF"),
  });

  await Sharing.shareAsync(uri);
}
