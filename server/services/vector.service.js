import { ChromaClient } from "chromadb";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const client = new ChromaClient({
  host: "localhost",
  port: 8000,
  ssl: false,
});

const BATCH_SIZE = 50; // ✅ safe batch size for OpenAI embeddings

/* =========================
EMBEDDINGS — batched
========================= */
export async function embedChunks(chunks) {
  const allEmbeddings = [];

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);

    const res = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: batch,
    });

    allEmbeddings.push(...res.data.map((d) => d.embedding));

    // ✅ release batch reference immediately
    batch.length = 0;
  }

  return allEmbeddings;
}

/* =========================
STORE IN CHROMA — clean upsert
========================= */
export async function storeVectors(companyId, chunks, embeddings) {
  const collectionName = `loan-${companyId}`;

  // ✅ Delete old collection on re-upload so no stale chunks remain
  try {
    await client.deleteCollection({ name: collectionName });
  } catch {
    // Collection didn't exist yet — that's fine
  }

  const collection = await client.getOrCreateCollection({
    name: collectionName,
    metadata: { source: "loan-agreements" },
  });

  // ✅ Upsert in batches to avoid Chroma request size limits
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batchChunks = chunks.slice(i, i + BATCH_SIZE);
    const batchEmbeddings = embeddings.slice(i, i + BATCH_SIZE);

    await collection.upsert({
      ids: batchChunks.map((_, j) => `${companyId}-${i + j}`),
      embeddings: batchEmbeddings,
      documents: batchChunks,
      metadatas: batchChunks.map((_, j) => ({
        chunkIndex: i + j,
        companyId,
      })),
    });
  }

  return collectionName;
}