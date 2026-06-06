import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

/* =========================
PDF PARSER (ESM SAFE)
========================= */
export async function parsePdf(buffer) {
  if (!buffer) throw new Error("Empty PDF buffer");

  const uint8Array = new Uint8Array(buffer);

  const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;

  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    const pageText = content.items.map((item) => item.str).join(" ");
    fullText += pageText + "\n";
  }

  return normalizeText(fullText);
}

/* =========================
TEXT NORMALIZATION
========================= */
function normalizeText(text = "") {
  return text
    .replace(/\s+/g, " ")
    .replace(/\u0000/g, "")
    .trim();
}

/* =========================
SAFE CHUNKING ENGINE (FIXED)
========================= */
export function chunkText(text = "", size = 800, overlap = 120) {
  if (!text) return [];

  const chunks = [];

  const maxChunks = 150; // 🚨 prevents memory explosion

  let start = 0;

  while (start < text.length && chunks.length < maxChunks) {
    let end = Math.min(start + size, text.length);

    // try to cut at sentence/space boundary
    const lastSpace = text.lastIndexOf(" ", end);
    if (lastSpace > start + 100) {
      end = lastSpace;
    }

    const chunk = text.slice(start, end).trim();

    if (chunk.length > 20) {
      chunks.push(chunk);
    }

    if (end >= text.length) break;

    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}