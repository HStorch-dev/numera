import { NextResponse } from "next/server";

const API_URL =
  process.env.NUMERA_API_URL ?? "http://localhost:3000";

export async function POST(request: Request) {
  try {
    const registration = await request.json();

    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(registration),
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, {
        status: response.status,
      });
    }

    const result = NextResponse.json({
      authenticated: true,
    });

    result.cookies.set(
      "numera_access_token",
      data.accessToken,
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      },
    );

    return result;
  } catch {
    return NextResponse.json(
      {
        message: "Unable to connect to the NUMERA API",
      },
      {
        status: 502,
      },
    );
  }
}