// utils/parseDocument.ts
//
// Free, offline text extraction.
//   TXT  → read directly
//   RTF  → strip control words, decode escapes
//   DOCX → scan ZIP for word/document.xml, strip XML tags
//   PDF  → not supported; shows a tip to export as .txt

import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

// ─────────────────────────────────────────────
// Platform-safe base64 reader
//   Native: expo-file-system (handles file:// paths)
//   Web:    fetch + FileReader (handles blob: URLs from DocumentPicker,
//           which expo-file-system cannot read on web)
// ─────────────────────────────────────────────
async function readAsBase64(uri: string): Promise<string> {
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // result is a data URL like "data:...;base64,AAAA" — strip the prefix
        const base64 = result.split(",")[1] ?? "";
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  return FileSystem.readAsStringAsync(uri, { encoding: "base64" as any });
}

// ─────────────────────────────────────────────
// RTF extraction (fully local)
// ─────────────────────────────────────────────
function extractRtfText(base64: string): string {
  try {
    const raw = atob(base64);

    return (
      raw
        // Skip entire groups we don't want (font table, color table, pictures, etc.)
        .replace(
          /\{\\(?:fonttbl|colortbl|stylesheet|info|pict|header|footer|object|fldinst)[\s\S]*?\}/g,
          "",
        )
        // Unicode character escapes: \uN?
        .replace(/\\u(\d+)\??/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
        // Hex escapes: \'XX
        .replace(/\\'([0-9a-fA-F]{2})/g, (_, h) =>
          String.fromCharCode(parseInt(h, 16)),
        )
        // Paragraph / line breaks → newline
        .replace(/\\pard?[\s]?/g, "\n")
        .replace(/\\par[\s]?/g, "\n")
        .replace(/\\line[\s]?/g, "\n")
        .replace(/\\page[\s]?/g, "\n\n")
        // Tab
        .replace(/\\tab[\s]?/g, "\t")
        // Remove all remaining RTF control words (\word or \word123)
        .replace(/\\[a-zA-Z]+[-]?\d*[ ]?/g, "")
        // Remove remaining RTF syntax characters
        .replace(/\\\*/g, "")
        .replace(/[{}\\]/g, "")
        // Clean up whitespace
        .replace(/[ \t]{2,}/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
    );
  } catch {
    return "";
  }
}

// ─────────────────────────────────────────────
// DOCX extraction (fully local)
// ─────────────────────────────────────────────
function extractDocxText(base64: string): string {
  try {
    const binary = atob(base64);
    let i = 0;

    while (i < binary.length - 30) {
      // ZIP local file header: PK\x03\x04
      if (
        binary.charCodeAt(i) !== 0x50 ||
        binary.charCodeAt(i + 1) !== 0x4b ||
        binary.charCodeAt(i + 2) !== 0x03 ||
        binary.charCodeAt(i + 3) !== 0x04
      ) {
        i++;
        continue;
      }

      const compressedSize =
        (binary.charCodeAt(i + 18) |
          (binary.charCodeAt(i + 19) << 8) |
          (binary.charCodeAt(i + 20) << 16) |
          (binary.charCodeAt(i + 21) << 24)) >>>
        0;
      const fnLen =
        binary.charCodeAt(i + 26) | (binary.charCodeAt(i + 27) << 8);
      const extraLen =
        binary.charCodeAt(i + 28) | (binary.charCodeAt(i + 29) << 8);
      const dataStart = i + 30 + fnLen + extraLen;
      const fileName = binary.slice(i + 30, i + 30 + fnLen);

      if (fileName === "word/document.xml") {
        const xml = binary.slice(dataStart, dataStart + compressedSize);
        const text = xml
          .replace(/<w:br[^>]*\/>/gi, "\n")
          .replace(/<w:p[ >\/][^>]*>/gi, "\n")
          .replace(/<[^>]+>/g, "")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
          .replace(/[ \t]{2,}/g, " ")
          .replace(/\n{3,}/g, "\n\n")
          .trim();

        if (text.length > 30) return text;

        throw new Error(
          "This DOCX uses internal compression that can't be read on device.\n\nTip: Open in Word or Google Docs and export as .rtf or .txt, then upload that.",
        );
      }

      i = dataStart + Math.max(compressedSize, 1);
    }

    throw new Error(
      "Couldn't find text in this DOCX.\n\nTip: Try exporting as .rtf or .txt from Word or Google Docs.",
    );
  } catch (e: any) {
    if (
      e?.message?.startsWith("This DOCX") ||
      e?.message?.startsWith("Couldn't find")
    )
      throw e;
    throw new Error(
      "Couldn't read the DOCX. Try uploading a .rtf or .txt file instead.",
    );
  }
}

// ─────────────────────────────────────────────
// PDF tip
// ─────────────────────────────────────────────
function throwPdfTip(): never {
  throw new Error(
    "PDF files can't be read directly on device.\n\n" +
      "Easy fix — export from your PDF app as:\n" +
      "  • .rtf  (best, keeps formatting)\n" +
      "  • .txt  (simplest)\n" +
      "  • .docx (if from Word)\n\n" +
      "Or open the PDF, select all text, paste into Notes, and save as .txt.",
  );
}

// ─────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────
export async function extractTextFromFile(
  uri: string,
  mimeType?: string,
): Promise<string> {
  const lower = uri.toLowerCase();

  const isPdf = mimeType === "application/pdf" || lower.endsWith(".pdf");
  const isRtf =
    mimeType === "text/rtf" ||
    mimeType === "application/rtf" ||
    lower.endsWith(".rtf");
  const isDocx =
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword" ||
    lower.endsWith(".docx") ||
    lower.endsWith(".doc");

  // PDF: show tip, don't even read the file
  if (isPdf) throwPdfTip();

  const base64 = await readAsBase64(uri);

  if (isRtf) return extractRtfText(base64);
  if (isDocx) return extractDocxText(base64);

  // Plain text (.txt etc.)
  return atob(base64)
    .replace(/[^\x20-\x7E\n\r\t]/g, " ")
    .trim();
}
