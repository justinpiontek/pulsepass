import { NextResponse } from "next/server";
import QRCode from "qrcode";

import { BRAND_SLUG } from "@/lib/brand";
import type { QrFormat } from "@/lib/qr";

function numberInRange(rawValue: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(rawValue);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, min), max);
}

function safeFilename(rawValue: string | null, format: QrFormat) {
  const base = (rawValue || `${BRAND_SLUG}-qr`)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

  return `${base || `${BRAND_SLUG}-qr`}.${format}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const data = searchParams.get("data");
    const format = searchParams.get("format") === "png" ? "png" : "svg";
    const size = numberInRange(searchParams.get("size"), format === "png" ? 960 : 320, 128, 2048);
    const margin = numberInRange(searchParams.get("margin"), 1, 0, 8);
    const wantsDownload = searchParams.get("download") === "1";
    const filename = safeFilename(searchParams.get("filename"), format);

    if (!data) {
      return NextResponse.json({ error: "Missing data for QR generation." }, { status: 400 });
    }

    if (format === "png") {
      const png = await QRCode.toBuffer(data, {
        type: "png",
        errorCorrectionLevel: "M",
        margin,
        width: size,
        color: {
          dark: "#1b1914",
          light: "#ffffffff"
        }
      });

      return new NextResponse(new Uint8Array(png), {
        headers: {
          "Cache-Control": "no-store",
          "Content-Disposition": wantsDownload ? `attachment; filename="${filename}"` : `inline; filename="${filename}"`,
          "Content-Type": "image/png"
        }
      });
    }

    const svg = await QRCode.toString(data, {
      type: "svg",
      errorCorrectionLevel: "M",
      margin,
      width: size,
      color: {
        dark: "#1b1914",
        light: "#ffffffff"
      }
    });

    return new NextResponse(svg, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": wantsDownload ? `attachment; filename="${filename}"` : `inline; filename="${filename}"`,
        "Content-Type": "image/svg+xml; charset=utf-8"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "QR generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
