import { NextResponse } from "next/server";
import getClientPromise from "@/app/lib/mongodb";

const DB_NAME = "ai_text_cleaner";
const COLLECTION = "stats";
const STATS_DOC_ID = "global";

async function getCollection() {
  const client = await getClientPromise();
  return client.db(DB_NAME).collection(COLLECTION);
}

const EMPTY_STATS = {
  hiddenChars: 0,
  nonBreakingSpaces: 0,
  dashesNormalized: 0,
  quotesNormalized: 0,
  ellipsesConverted: 0,
  trailingWhitespace: 0,
  asterisksRemoved: 0,
  markdownHeadings: 0,
  totalCleaned: 0,
};

export async function GET() {
  try {
    const collection = await getCollection();
    const doc = await collection.findOne({ _id: STATS_DOC_ID as unknown as import("mongodb").ObjectId });

    if (!doc) {
      return NextResponse.json(EMPTY_STATS);
    }

    const { _id, ...stats } = doc;
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    return NextResponse.json(EMPTY_STATS);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const collection = await getCollection();

    await collection.updateOne(
      { _id: STATS_DOC_ID as unknown as import("mongodb").ObjectId },
      {
        $inc: {
          hiddenChars: body.hiddenChars ?? 0,
          nonBreakingSpaces: body.nonBreakingSpaces ?? 0,
          dashesNormalized: body.dashesNormalized ?? 0,
          quotesNormalized: body.quotesNormalized ?? 0,
          ellipsesConverted: body.ellipsesConverted ?? 0,
          trailingWhitespace: body.trailingWhitespace ?? 0,
          asterisksRemoved: body.asterisksRemoved ?? 0,
          markdownHeadings: body.markdownHeadings ?? 0,
          totalCleaned: body.totalCleaned ?? 0,
        },
      },
      { upsert: true }
    );

    const updated = await collection.findOne({ _id: STATS_DOC_ID as unknown as import("mongodb").ObjectId });
    if (!updated) {
      return NextResponse.json(EMPTY_STATS);
    }
    const { _id, ...stats } = updated;
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Failed to update stats:", error);
    return NextResponse.json(
      { error: "Failed to update stats" },
      { status: 500 }
    );
  }
}
