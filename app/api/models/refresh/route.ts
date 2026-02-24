import { NextResponse } from "next/server";
import getClientPromise from "@/app/lib/mongodb";
import { fetchLatestPricing } from "@/app/lib/price-fetcher";

const DB_NAME = "ai_text_cleaner";
const COLLECTION = "models";
const META_COLLECTION = "models_meta";
const META_DOC_ID = "pricing_meta";
const UPDATE_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 1 week

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const force = body.force === true;

    const client = await getClientPromise();
    const db = client.db(DB_NAME);
    const metaCol = db.collection(META_COLLECTION);

    if (!force) {
      const meta = await metaCol.findOne({
        _id: META_DOC_ID as unknown as import("mongodb").ObjectId,
      });

      if (meta?.lastUpdated) {
        const elapsed = Date.now() - new Date(meta.lastUpdated).getTime();
        if (elapsed < UPDATE_INTERVAL_MS) {
          return NextResponse.json({
            status: "skipped",
            message: "Prices were updated recently, skipping refresh",
            lastUpdated: meta.lastUpdated,
            nextUpdate: meta.nextUpdate,
          });
        }
      }
    }

    const { models, fetchedAt, source } = await fetchLatestPricing();

    if (models.length === 0) {
      return NextResponse.json(
        { status: "error", message: "No models fetched from pricing source" },
        { status: 500 }
      );
    }

    const modelsCol = db.collection(COLLECTION);

    const bulkOps = models.map((model) => ({
      updateOne: {
        filter: { id: model.id },
        update: {
          $set: {
            id: model.id,
            name: model.name,
            provider: model.provider,
            inputPrice: model.inputPrice,
            outputPrice: model.outputPrice,
            tier: model.tier,
            updatedAt: fetchedAt,
          },
        },
        upsert: true,
      },
    }));

    const result = await modelsCol.bulkWrite(bulkOps);

    const nextUpdate = new Date(Date.now() + UPDATE_INTERVAL_MS).toISOString();
    await metaCol.updateOne(
      { _id: META_DOC_ID as unknown as import("mongodb").ObjectId },
      {
        $set: {
          lastUpdated: fetchedAt,
          nextUpdate,
          source,
          modelCount: models.length,
          modifiedCount: result.modifiedCount,
          upsertedCount: result.upsertedCount,
        },
      },
      { upsert: true }
    );

    return NextResponse.json({
      status: "success",
      modelsUpdated: models.length,
      modified: result.modifiedCount,
      inserted: result.upsertedCount,
      lastUpdated: fetchedAt,
      nextUpdate,
      source,
    });
  } catch (error) {
    console.error("Failed to refresh models:", error);
    return NextResponse.json(
      { status: "error", message: String(error) },
      { status: 500 }
    );
  }
}
