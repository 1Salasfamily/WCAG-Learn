import { promises as fs } from "node:fs";
import path from "node:path";

export type WcagCriterion = {
  id: string;
  title: string;
  level: "A" | "AA";
  principle: "Perceivable" | "Operable" | "Understandable" | "Robust";
  shortExplanation: string;
};

export async function getWcagCriteria(): Promise<WcagCriterion[]> {
  const filePath = path.join(process.cwd(), "data", "wcag.json");
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as WcagCriterion[];
}
