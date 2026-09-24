// utils/pdf.ts
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import type { CoverLetter, Resume } from "@/types";

/** Basic HTML escaping for safety */
function esc(s: string | undefined) {
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

/* ---------------- WEB-ONLY PDF DOWNLOAD ----------------
 * expo-print's printToFileAsync() opens the browser's print dialog on
 * web (documented Expo behavior) instead of producing a downloadable
 * file. For a real one-click download on web, we lay the plain text
 * out into a PDF client-side with jsPDF. Native platforms are
 * completely untouched — this code only runs when Platform.OS === "web".
 * ------------------------------------------------------- */
function decodeHtmlEntities(text: string) {
  return text
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'");
}

async function downloadTextAsPdfWeb(title: string, bodyText: string) {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const marginX = 54;
  const pageWidth = 612; // US Letter, points
  const pageHeight = 792;
  const maxWidth = pageWidth - marginX * 2;
  const lineHeight = 15;
  let y = 64;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  const titleLines = doc.splitTextToSize(title || "Document", maxWidth);
  for (const line of titleLines) {
    doc.text(line, marginX, y);
    y += 22;
  }
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  const paragraphs = decodeHtmlEntities(bodyText).split("\n");
  for (const para of paragraphs) {
    if (para.trim() === "") {
      y += lineHeight * 0.6;
      continue;
    }
    const lines = doc.splitTextToSize(para, maxWidth);
    for (const line of lines) {
      if (y > pageHeight - 60) {
        doc.addPage();
        y = 64;
      }
      doc.text(line, marginX, y);
      y += lineHeight;
    }
  }

  const safeName = (title || "document").replace(/[^\w\- ]+/g, "").trim();
  doc.save(`${safeName || "document"}.pdf`);
}

/* ---------------- EXPORTS ---------------- */

export async function exportCoverLetterToPdf(letter: CoverLetter) {
  const html = coverLetterToHtml(letter);

  if (Platform.OS === "web") {
    const title = (letter as any).title ?? "Cover Letter";
    await downloadTextAsPdfWeb(title, stripHtml(html));
    return;
  }

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

  if (Platform.OS === "web") {
    const title = (resume as any).title ?? "Resume";
    await downloadTextAsPdfWeb(title, stripHtml(html));
    return;
  }

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
