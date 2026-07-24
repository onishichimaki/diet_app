import { NextResponse } from "next/server";
import { updateHealthGoals } from "../../../db/health";

const keys = ["calories", "carbs", "protein", "fat", "weight", "steps", "sleepHours"] as const;

export async function PUT(request: Request) {
  try {
    const input = (await request.json()) as Record<string, number>;
    if (keys.some((key) => !Number.isFinite(Number(input[key])) || Number(input[key]) <= 0)) {
      return NextResponse.json({ message: "目標値を確認してください。" }, { status: 400 });
    }
    const goals = Object.fromEntries(keys.map((key) => [key, Number(input[key])]));
    return NextResponse.json(await updateHealthGoals(goals));
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "目標を保存できませんでした。" }, { status: 500 });
  }
}
