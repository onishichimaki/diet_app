import { NextResponse } from "next/server";
import {
  addHealthEntry,
  deleteHealthEntry,
  listHealthData,
  type HealthEntryInput,
} from "../../../db/health";

export async function GET() {
  try {
    return NextResponse.json(await listHealthData());
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "データを読み込めませんでした。" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as HealthEntryInput;
    if (!["meal", "weight", "activity", "sleep"].includes(input.kind) || !input.label?.trim()) {
      return NextResponse.json({ message: "入力内容を確認してください。" }, { status: 400 });
    }
    return NextResponse.json(await addHealthEntry(input), { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "記録を保存できませんでした。" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ message: "IDが必要です。" }, { status: 400 });
  }
  try {
    await deleteHealthEntry(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "記録を削除できませんでした。" }, { status: 500 });
  }
}
