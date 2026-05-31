import { db } from "@/lib/db";

export async function generateDealNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `D-${year}-`;

  // MAX on the numeric suffix so we get the highest existing number for this year
  const result = await db.$queryRaw<{ maxNum: bigint | null }[]>`
    SELECT MAX(CAST(SUBSTRING_INDEX(dealNumber, '-', -1) AS UNSIGNED)) AS maxNum
    FROM \`Deal\`
    WHERE dealNumber LIKE ${prefix + "%"}
  `;

  const maxNum = result[0]?.maxNum ? Number(result[0].maxNum) : 0;
  return `${prefix}${String(maxNum + 1).padStart(4, "0")}`;
}
