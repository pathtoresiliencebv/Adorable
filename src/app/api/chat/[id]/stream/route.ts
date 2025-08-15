import { getStream, stopStream } from "@/lib/internal/stream-manager";
import { NextRequest } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const appId = (await params).id;
  console.log("🔍 [STREAM ROUTE] GET stream for appId:", appId);
  
  try {
    const currentStream = await getStream(appId);
    console.log("📡 [STREAM ROUTE] Current stream exists:", !!currentStream);

    if (!currentStream) {
      console.log("❌ [STREAM ROUTE] No stream found, returning empty response");
      return new Response(null, { 
        status: 204,
        headers: {
          "Cache-Control": "no-cache",
          "Content-Type": "text/plain",
        },
      });
    }

    console.log("✅ [STREAM ROUTE] Returning stream response");
    return currentStream.response();
  } catch (error) {
    console.error("💥 [STREAM ROUTE] Error getting stream:", error);
    return new Response("Stream error", { 
      status: 500,
      headers: {
        "Cache-Control": "no-cache",
        "Content-Type": "text/plain",
      },
    });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const appId = (await params).id;

  await stopStream(appId);

  return new Response(null, {
    status: 204,
    headers: {
      "Cache-Control": "no-cache",
      "Content-Type": "text/plain",
    },
  });
}
