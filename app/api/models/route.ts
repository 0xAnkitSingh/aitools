import { NextResponse } from "next/server";
import getClientPromise from "@/app/lib/mongodb";
import { MODELS as FALLBACK_MODELS } from "@/app/lib/models";

const DB_NAME = "ai_text_cleaner";
const COLLECTION = "models";
const META_COLLECTION = "models_meta";
const META_DOC_ID = "pricing_meta";

export async function GET() {
  try {
    const client = await getClientPromise();
    const db = client.db(DB_NAME);

    const models = await db.collection(COLLECTION).find({}).toArray();
    const meta = await db.collection(META_COLLECTION).findOne({
      _id: META_DOC_ID as unknown as import("mongodb").ObjectId,
    });

    if (models.length === 0) {
      return NextResponse.json({
        models: FALLBACK_MODELS,
        lastUpdated: null,
        source: "hardcoded-fallback",
        providers: [...new Set(FALLBACK_MODELS.map((m) => m.provider))],
      });
    }

    const cleaned = models.map(({ _id, ...rest }) => rest);

    return NextResponse.json({
      models: cleaned,
      lastUpdated: meta?.lastUpdated ?? null,
      nextUpdate: meta?.nextUpdate ?? null,
      source: meta?.source ?? "mongodb",
      providers: [...new Set(cleaned.map((m) => m.provider))],
    });
  } catch (error) {
    console.error("Failed to fetch models:", error);
    return NextResponse.json({
      models: FALLBACK_MODELS,
      lastUpdated: null,
      source: "hardcoded-fallback",
      providers: [...new Set(FALLBACK_MODELS.map((m) => m.provider))],
    });
  }
}
