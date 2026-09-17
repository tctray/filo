// utils/rtfToText.ts
export function rtfToPlainText(rtf: string): string {
  if (!rtf) return "";

  let text = rtf;

  // Convert common paragraph/line breaks
  text = text.replace(/\\par[d]?/g, "\n");
  text = text.replace(/\\line/g, "\n");

  // Decode hex escapes like \'e9
  text = text.replace(/\\'([0-9a-fA-F]{2})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16)),
  );

  // Remove groups like {\*\...} (optional, helps clean noise)
  text = text.replace(/\{\\\*[^}]*\}/g, "");

  // Remove control words: \b0, \fs24, \cf1, etc.
  text = text.replace(/\\[a-zA-Z]+-?\d* ?/g, "");

  // Remove escaped braces and backslashes
  text = text.replace(/\\[{}\\]/g, "");

  // Remove remaining braces
  text = text.replace(/[{}]/g, "");

  // Clean extra spaces
  text = text.replace(/\n{3,}/g, "\n\n").trim();

  return text;
}
