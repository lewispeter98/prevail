import { today } from "@/lib/day";
import { getWeights } from "@/lib/weight";

export async function GET() {
  const entries = await getWeights(); // checks the session
  const csv = ["date,weight_kg", ...entries.map((e) => `${e.date},${e.kg.toFixed(1)}`)].join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="prevail-weight-${today()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
