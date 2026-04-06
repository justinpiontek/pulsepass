export type QrFormat = "png" | "svg";

type BuildQrCodePathOptions = {
  data: string;
  download?: boolean;
  filename?: string;
  format?: QrFormat;
  margin?: number;
  size?: number;
};

function sanitizeFilename(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function buildQrCodePath(options: BuildQrCodePathOptions) {
  const searchParams = new URLSearchParams();

  searchParams.set("data", options.data);
  searchParams.set("format", options.format || "svg");

  if (typeof options.size === "number") {
    searchParams.set("size", String(options.size));
  }

  if (typeof options.margin === "number") {
    searchParams.set("margin", String(options.margin));
  }

  if (options.download) {
    searchParams.set("download", "1");
  }

  if (options.filename) {
    searchParams.set("filename", sanitizeFilename(options.filename));
  }

  return `/api/qr?${searchParams.toString()}`;
}
