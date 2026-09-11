import { NextRequest, NextResponse } from "next/server";
import { avatarSvg } from "@/lib/avatar";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { seed: string } }
) {
  const label = req.nextUrl.searchParams.get("label") ?? params.seed;
  const svg = avatarSvg(params.seed, label);
  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
