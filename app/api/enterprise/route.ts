import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type EnterprisePayload = {
  companyName?: string;
  employeeCount?: number | string;
  fullName?: string;
  notes?: string;
  workEmail?: string;
};

function isJsonRequest(contentType: string | null) {
  return Boolean(contentType && contentType.includes("application/json"));
}

async function readPayload(request: Request): Promise<EnterprisePayload> {
  const contentType = request.headers.get("content-type");

  if (isJsonRequest(contentType)) {
    return (await request.json()) as EnterprisePayload;
  }

  const formData = await request.formData();
  return {
    companyName: String(formData.get("companyName") || ""),
    employeeCount: String(formData.get("employeeCount") || ""),
    fullName: String(formData.get("fullName") || ""),
    notes: String(formData.get("notes") || ""),
    workEmail: String(formData.get("workEmail") || "")
  };
}

export async function POST(request: Request) {
  try {
    const payload = await readPayload(request);

    if (!payload.fullName || !payload.workEmail || !payload.companyName) {
      return NextResponse.json({ error: "Full name, work email, and company name are required." }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("enterprise_leads").insert({
      full_name: payload.fullName,
      work_email: payload.workEmail,
      company_name: payload.companyName,
      employee_count: payload.employeeCount ? Number(payload.employeeCount) : null,
      notes: payload.notes || null
    } as never);

    if (error) {
      throw error;
    }

    if (isJsonRequest(request.headers.get("content-type"))) {
      return NextResponse.json({ ok: true });
    }

    return NextResponse.redirect(new URL("/enterprise?submitted=1", request.url));
  } catch (error) {
    const message = error instanceof Error ? error.message : "We could not submit your request.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
