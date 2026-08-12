import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function requireUserId(): Promise<string | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  return session.user.id;
}

export function isResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
