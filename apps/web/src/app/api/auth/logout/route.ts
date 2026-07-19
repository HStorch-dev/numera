import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({
    authenticated: false,
  });

  response.cookies.set(
    "numera_access_token",
    "",
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    },
  );

  return response;
}