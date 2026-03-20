import { NextRequest, NextResponse } from "next/server";

const BOT_USER_AGENTS = [
  "facebookexternalhit",
  "Facebot",
  "Twitterbot",
  "LinkedInBot",
  "WhatsApp",
  "Slackbot",
  "TelegramBot",
  "Discordbot",
  "Pinterest",
  "Embedly",
  "Quora Link Preview",
  "Showyoubot",
  "vkShare",
  "Applebot",
  "cfnetwork",        // iMessage link previews
  "Google-InspectionTool",
  "Googlebot",
  "bingbot",
  "MJ12bot",
];

const OG_METADATA_URL =
  "https://gembiiadiqxgomguzirl.supabase.co/functions/v1/og-metadata";

const LOVABLE_ORIGIN = "https://quote-portfolio-elevate.lovable.app";

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico|lovable-uploads|assets).*)",
};

function isBot(ua: string): boolean {
  const lower = ua.toLowerCase();
  return BOT_USER_AGENTS.some((bot) => lower.includes(bot.toLowerCase()));
}

export default async function middleware(req: NextRequest) {
  const ua = req.headers.get("user-agent") || "";
  const { pathname, search } = req.nextUrl;

  // Bot detected → serve pre-rendered OG HTML from edge function
  if (isBot(ua)) {
    try {
      const ogUrl = `${OG_METADATA_URL}?path=${encodeURIComponent(pathname)}`;
      const ogRes = await fetch(ogUrl, {
        headers: { "User-Agent": ua },
      });

      if (ogRes.ok) {
        const html = await ogRes.text();
        return new NextResponse(html, {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
          },
        });
      }
    } catch (e) {
      // Fall through to proxy on error
      console.error("OG metadata fetch failed:", e);
    }
  }

  // Human visitor → reverse-proxy to Lovable
  const target = new URL(`${LOVABLE_ORIGIN}${pathname}${search}`);
  const res = await fetch(target.toString(), {
    headers: req.headers,
    redirect: "manual",
  });

  const responseHeaders = new Headers(res.headers);
  // Remove headers that shouldn't be forwarded
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("transfer-encoding");

  return new NextResponse(res.body, {
    status: res.status,
    headers: responseHeaders,
  });
}
