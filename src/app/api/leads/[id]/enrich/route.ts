import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/api/auth";
import { enrichAndUpdateLead } from "@/lib/tools/enrich-lead";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = checkAuth(req);
  if (authError) return authError;

  const { id } = await params;
  const result = await enrichAndUpdateLead(id);

  return NextResponse.json(result);
}
