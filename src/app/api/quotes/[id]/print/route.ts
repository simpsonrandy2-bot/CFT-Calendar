import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

const SECTION_LABELS: Record<string, string> = {
  jobDetails: "Job Details",
  scopeOfWork: "Scope of Work",
  provisions: "Provisions by General Contractor / Owner / Builder",
  exclusions: "Exclusions",
  miscCharges: "Miscellaneous Charges",
  terms: "Terms",
};
const SECTION_ORDER = ["jobDetails", "scopeOfWork", "provisions", "exclusions", "miscCharges", "terms"];

function esc(s: string | null | undefined) {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      company: { include: { contacts: true } },
      items: { orderBy: { sortOrder: "asc" } },
      checklistItems: { orderBy: [{ section: "asc" }, { sortOrder: "asc" }] },
    },
  });
  if (!quote) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const totalCost = quote.items.reduce((s, i) => s + i.projectCost, 0);
  const primaryContact = quote.company?.contacts?.find(c => c.isPrimary) ?? quote.company?.contacts?.[0];

  const checklistBySection: Record<string, typeof quote.checklistItems> = {};
  for (const item of quote.checklistItems) {
    if (!checklistBySection[item.section]) checklistBySection[item.section] = [];
    checklistBySection[item.section].push(item);
  }

  const itemRows = quote.items.map((item, i) => `
    <tr>
      <td style="font-weight:600;color:#f97316">${i + 1}</td>
      <td>${esc(item.jobType)}</td>
      <td>${item.excludeSqFt ? "—" : item.squareFootage.toLocaleString()}</td>
      <td>${esc(item.floors)}</td>
      <td>${esc(item.pouringOn)}</td>
      <td>${esc([item.product1, item.product2].filter(Boolean).join(", "))}</td>
      <td>${esc(item.avgThickness)}</td>
      <td style="text-align:right;font-weight:600">$${item.projectCost.toLocaleString()}</td>
    </tr>`).join("");

  const checklistSections = SECTION_ORDER
    .filter(s => checklistBySection[s]?.length)
    .map(section => {
      const items = checklistBySection[section].map(item => `
        <div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:3px;font-size:8.5pt">
          <div style="width:11px;height:11px;border:1.5px solid ${item.checked ? "#f97316" : "#d1d5db"};border-radius:2px;flex-shrink:0;margin-top:1px;background:${item.checked ? "#f97316" : "white"};display:flex;align-items:center;justify-content:center">
            ${item.checked ? '<span style="color:white;font-size:7pt;font-weight:900;line-height:1">✓</span>' : ""}
          </div>
          <span style="color:${item.checked ? "#111" : "#6b7280"}">${esc(item.text)}</span>
        </div>`).join("");
      return `
        <div style="margin-bottom:14px;break-inside:avoid">
          <h4 style="font-size:9pt;font-weight:700;color:#111;border-bottom:1px solid #e5e7eb;padding-bottom:4px;margin-bottom:6px">${esc(SECTION_LABELS[section])}</h4>
          ${items}
        </div>`;
    }).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Quote ${esc(quote.quoteNumber)} — ${esc(quote.company?.name || quote.projectName)}</title>
  <style>
    @page { margin: 0.75in; size: letter; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #111; background: white; }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
    @media screen {
      body { background: #f3f4f6; }
      .page { max-width: 8.5in; margin: 0 auto; background: white; padding: 0.75in; box-shadow: 0 4px 24px rgba(0,0,0,0.12); min-height: 100vh; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="position:fixed;top:16px;right:16px;z-index:100;display:flex;gap:8px">
    <button onclick="window.print()" style="background:#f97316;color:white;border:none;border-radius:8px;padding:10px 20px;font-weight:700;cursor:pointer;font-size:14px">Print / Save PDF</button>
    <button onclick="window.close()" style="background:#6b7280;color:white;border:none;border-radius:8px;padding:10px 20px;font-weight:700;cursor:pointer;font-size:14px">Close</button>
  </div>

  <div class="page">
    <!-- Header -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;border-bottom:2px solid #f97316;padding-bottom:16px">
      <div>
        <div style="font-size:22pt;font-weight:900;color:#f97316;letter-spacing:-0.5px">CFT</div>
        <div style="font-size:8pt;color:#666;margin-top:2px">Concrete Floor Tek Inc.</div>
        ${quote.authorName ? `<div style="margin-top:8px;font-size:9pt">Prepared by: <strong>${esc(quote.authorName)}</strong></div>` : ""}
      </div>
      <div style="text-align:right">
        <div style="font-size:8pt;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px">Quote</div>
        <div style="font-size:18pt;font-weight:700">${esc(quote.quoteNumber)}</div>
        <div style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:8pt;font-weight:600;background:#dbeafe;color:#1d4ed8;margin-top:4px">${esc(quote.status)}</div>
        <div style="margin-top:6px;font-size:9pt;color:#6b7280">${new Date(quote.createdAt).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}</div>
      </div>
    </div>

    <!-- Client & Project -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">
      <div style="border:1px solid #e5e7eb;border-radius:6px;padding:12px">
        <div style="font-size:8pt;font-weight:700;text-transform:uppercase;color:#f97316;letter-spacing:0.5px;margin-bottom:8px">Client</div>
        ${quote.company ? `<div style="font-size:11pt;font-weight:700;margin-bottom:6px">${esc(quote.company.name)}</div>` : ""}
        ${primaryContact ? `
          <div style="display:flex;gap:4px;margin-bottom:4px;font-size:9pt"><span style="color:#6b7280;min-width:70px">Contact:</span><strong>${esc(primaryContact.name)}</strong></div>
          ${primaryContact.email ? `<div style="display:flex;gap:4px;margin-bottom:4px;font-size:9pt"><span style="color:#6b7280;min-width:70px">Email:</span><span>${esc(primaryContact.email)}</span></div>` : ""}
          ${primaryContact.cell ? `<div style="display:flex;gap:4px;margin-bottom:4px;font-size:9pt"><span style="color:#6b7280;min-width:70px">Phone:</span><span>${esc(primaryContact.cell)}</span></div>` : ""}
        ` : ""}
        ${quote.contactMethod ? `<div style="display:flex;gap:4px;font-size:9pt"><span style="color:#6b7280;min-width:70px">Via:</span><span>${esc(quote.contactMethod)}</span></div>` : ""}
      </div>
      <div style="border:1px solid #e5e7eb;border-radius:6px;padding:12px">
        <div style="font-size:8pt;font-weight:700;text-transform:uppercase;color:#f97316;letter-spacing:0.5px;margin-bottom:8px">Project</div>
        ${quote.projectName ? `<div style="display:flex;gap:4px;margin-bottom:4px;font-size:9pt"><span style="color:#6b7280;min-width:70px">Name:</span><strong>${esc(quote.projectName)}</strong></div>` : ""}
        ${quote.address ? `<div style="display:flex;gap:4px;margin-bottom:4px;font-size:9pt"><span style="color:#6b7280;min-width:70px">Address:</span><span>${esc(quote.address)}</span></div>` : ""}
        ${quote.location ? `<div style="display:flex;gap:4px;margin-bottom:4px;font-size:9pt"><span style="color:#6b7280;min-width:70px">Location:</span><span>${esc(quote.location)}</span></div>` : ""}
        ${quote.buildingType ? `<div style="display:flex;gap:4px;font-size:9pt"><span style="color:#6b7280;min-width:70px">Building:</span><span>${esc(quote.buildingType)}</span></div>` : ""}
      </div>
    </div>

    <!-- Items Table -->
    ${quote.items.length > 0 ? `
    <table style="width:100%;border-collapse:collapse;margin-bottom:8px;font-size:8.5pt">
      <thead>
        <tr>
          ${["#","Job Type","Sq Ft","Floors","Pouring On","Product","Thickness","Cost"].map((h, i) =>
            `<th style="background:#f97316;color:white;padding:5px 8px;text-align:${i===7?"right":"left"};font-weight:600;font-size:7.5pt;text-transform:uppercase">${h}</th>`
          ).join("")}
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>
    <div style="display:flex;justify-content:flex-end;margin-bottom:20px">
      <div style="border:2px solid #f97316;border-radius:6px;padding:8px 16px;text-align:right">
        <div style="font-size:8pt;color:#6b7280;text-transform:uppercase">Total Project Cost</div>
        <div style="font-size:16pt;font-weight:700;color:#f97316">$${totalCost.toLocaleString()}</div>
      </div>
    </div>` : ""}

    <!-- Checklist -->
    ${checklistSections}

    <!-- Notes -->
    ${quote.notes ? `
    <div style="border:1px solid #e5e7eb;border-radius:6px;padding:12px;margin-top:16px">
      <div style="font-size:8pt;font-weight:700;text-transform:uppercase;color:#f97316;letter-spacing:0.5px;margin-bottom:8px">Notes</div>
      <p style="font-size:9pt;color:#374151;white-space:pre-wrap">${esc(quote.notes)}</p>
    </div>` : ""}

    <!-- Footer -->
    <div style="margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:8pt;color:#9ca3af">
      <span>Concrete Floor Tek Inc.</span>
      <span>Quote ${esc(quote.quoteNumber)}</span>
      <span>${new Date().toLocaleDateString("en-CA")}</span>
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
