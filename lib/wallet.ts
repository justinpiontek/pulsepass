import { createSign } from "crypto";

import type { CardRecord } from "@/lib/data";
import { BRAND_NAME } from "@/lib/brand";
import { getGoogleWalletEnv, getSiteUrl } from "@/lib/env";

function base64UrlEncode(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function signJwt(payload: Record<string, unknown>) {
  const env = getGoogleWalletEnv();
  const header = {
    alg: "RS256",
    typ: "JWT",
    ...(env.GOOGLE_WALLET_SERVICE_ACCOUNT_PRIVATE_KEY_ID
      ? {
          kid: env.GOOGLE_WALLET_SERVICE_ACCOUNT_PRIVATE_KEY_ID
        }
      : {})
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signer = createSign("RSA-SHA256");

  signer.update(`${encodedHeader}.${encodedPayload}`);
  signer.end();

  const signature = signer.sign(env.GOOGLE_WALLET_SERVICE_ACCOUNT_PRIVATE_KEY);
  return `${encodedHeader}.${encodedPayload}.${base64UrlEncode(signature)}`;
}

function localizedString(value: string) {
  return {
    defaultValue: {
      language: "en-US",
      value
    }
  };
}

function objectIdFragment(profile: CardRecord) {
  const safeSlug = (profile.slug || "member").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  const shortId = profile.id.replace(/-/g, "").slice(0, 10);
  return `contact-${safeSlug}-${shortId}`.slice(0, 60);
}

function textModule(id: string, header: string, body?: string | null) {
  if (!body) {
    return null;
  }

  return {
    id,
    header,
    body
  };
}

function linkModule(uri: string, description: string) {
  return {
    uri,
    description
  };
}

export function createGoogleWalletSaveUrl(options: {
  contactUrl: string;
  profile: CardRecord;
}) {
  const env = getGoogleWalletEnv();
  const origin = new URL(getSiteUrl()).origin;
  const classId = `${env.GOOGLE_WALLET_ISSUER_ID}.${env.GOOGLE_WALLET_CLASS_SUFFIX}`;
  const objectId = `${env.GOOGLE_WALLET_ISSUER_ID}.${objectIdFragment(options.profile)}`;
  const title = options.profile.company_name || BRAND_NAME;
  const header = options.profile.full_name || options.profile.company_name || "Digital contact";
  const subheader = options.profile.job_title || options.profile.email || options.profile.phone || "Scan to connect";

  const payload = {
    iss: env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL,
    aud: "google",
    typ: "savetowallet",
    iat: Math.floor(Date.now() / 1000),
    origins: [origin],
    payload: {
      genericClasses: [
        {
          id: classId
        }
      ],
      genericObjects: [
        {
          id: objectId,
          classId,
          state: "ACTIVE",
          cardTitle: localizedString(title),
          header: localizedString(header),
          subheader: localizedString(subheader),
          hexBackgroundColor: "#1f7a59",
          barcode: {
            type: "QR_CODE",
            value: options.contactUrl,
            alternateText: options.profile.slug
          },
          textModulesData: [
            textModule("email", "Email", options.profile.email),
            textModule("phone", "Phone", options.profile.phone),
            textModule("website", "Website", options.profile.website)
          ].filter(Boolean),
          linksModuleData: {
            uris: [
              linkModule(options.contactUrl, "Open contact page"),
              ...(options.profile.website ? [linkModule(options.profile.website, "Website")] : []),
              linkModule(`mailto:${options.profile.email}`, "Email")
            ]
          }
        }
      ]
    }
  };

  return `https://pay.google.com/gp/v/save/${signJwt(payload)}`;
}
