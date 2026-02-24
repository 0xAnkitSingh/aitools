import { NextResponse } from "next/server";
import getClientPromise from "@/app/lib/mongodb";
import { fetchLatestPricing } from "@/app/lib/price-fetcher";

const DB_NAME = "ai_text_cleaner";
const COLLECTION = "models";
const META_COLLECTION = "models_meta";
const META_DOC_ID = "pricing_meta";
const UPDATE_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = await getClientPromise();
    const db = client.db(DB_NAME);
    const metaCol = db.collection(META_COLLECTION);

    const meta = await metaCol.findOne({
      _id: META_DOC_ID as unknown as import("mongodb").ObjectId,
    });

    if (meta?.lastUpdated) {
      const elapsed = Date.now() - new Date(meta.lastUpdated).getTime();
      if (elapsed < UPDATE_INTERVAL_MS) {
        return NextResponse.json({
          status: "skipped",
          message: `Last updated ${Math.round(elapsed / 3600000)}h ago, next update in ${Math.round((UPDATE_INTERVAL_MS - elapsed) / 3600000)}h`,
          lastUpdated: meta.lastUpdated,
        });
      }
    }

    const { models, fetchedAt, source } = await fetchLatestPricing();
    if (models.length === 0) {
      return NextResponse.json({ status: "error", message: "No models fetched" }, { status: 500 });
    }

    const modelsCol = db.collection(COLLECTION);
    const bulkOps = models.map((model) => ({
      updateOne: {
        filter: { id: model.id },
        update: {
          $set: { ...model, updatedAt: fetchedAt },
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
      lastUpdated: fetchedAt,
      nextUpdate,
    });
  } catch (error) {
    console.error("Cron price update failed:", error);
    return NextResponse.json(
      { status: "error", message: String(error) },
      { status: 500 }
    );
  }
}
