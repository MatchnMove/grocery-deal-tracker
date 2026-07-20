import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { previewCsv } from "@/lib/csv-import";

export async function POST(request: NextRequest) {
  await requireUser();
  const body = (await request.json()) as { csv?: string };
  const csv = body.csv ?? "";
  if (csv.length > 512_000) {
    return NextResponse.json({ error: "CSV upload is too large" }, { status: 413 });
  }
  const rows = previewCsv(csv).map((row) => {
    if (!row.ok) return row;
    return {
      ...row,
      value: {
        ...row.value,
        specialStart: row.value.specialStart?.toISOString() ?? null,
        specialEnd: row.value.specialEnd?.toISOString() ?? null,
        checkedAt: row.value.checkedAt.toISOString()
      }
    };
  });
  return NextResponse.json({ rows });
}
