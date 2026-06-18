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
const ACCENT = "#1e3a5f";

function esc(s: string | null | undefined) {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [quote, companySettings] = await Promise.all([
    prisma.quote.findUnique({
      where: { id },
      include: {
        company: { include: { contacts: true } },
        items: { orderBy: { sortOrder: "asc" } },
        checklistItems: { orderBy: [{ section: "asc" }, { sortOrder: "asc" }] },
        quoteContacts: { include: { person: true } },
      },
    }),
    prisma.companySettings.findUnique({ where: { id: "singleton" } }),
  ]);
  if (!quote) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const coName = companySettings?.companyName || "Concrete Floor Tek Inc.";
  const coTagline = companySettings?.tagline || "Self-Leveling Experts";
  const coPhone = companySettings?.phone || "";
  const coEmail = companySettings?.email || "";
  const logoData = companySettings?.logoData || "";

  const clientLogo = quote.company?.logo || "";
  const clientName = quote.company?.name || "";
  const clientAddress = [quote.company?.address, quote.company?.city, quote.company?.province].filter(Boolean).join(", ");
  const clientPhone = quote.company?.phone || "";

  // Selected contacts for this quote, falling back to primary company contact
  const quoteContacts = (quote.quoteContacts || []).map((qc: { person: { name: string; cell: string; office: string; email: string; position: string } }) => qc.person);
  const displayContacts = quoteContacts.length > 0
    ? quoteContacts
    : quote.company?.contacts?.filter((c: { isPrimary: boolean }) => c.isPrimary).slice(0, 1) || [];

  const totalCost = quote.items.reduce((s, i) => s + i.projectCost, 0);

  const checklistBySection: Record<string, typeof quote.checklistItems> = {};
  for (const item of quote.checklistItems) {
    if (!checklistBySection[item.section]) checklistBySection[item.section] = [];
    checklistBySection[item.section].push(item);
  }

  // Each item gets its own structured block like production
  const itemBlocks = quote.items.map((item, i) => `
    <div style="margin-bottom:20px;break-inside:avoid">
      <div style="font-weight:700;font-size:9.5pt;margin-bottom:6px;color:#111">ITEM NO. ${i + 1}</div>
      <table style="width:100%;border-collapse:collapse;font-size:8.5pt">
        <thead>
          <tr style="background:${ACCENT};color:white">
            <th style="padding:5px 8px;text-align:left;font-weight:600;text-transform:uppercase;font-size:7.5pt">Job Type</th>
            <th style="padding:5px 8px;text-align:left;font-weight:600;text-transform:uppercase;font-size:7.5pt">Building Type</th>
            <th style="padding:5px 8px;text-align:left;font-weight:600;text-transform:uppercase;font-size:7.5pt">Sq Ft</th>
          </tr>
        </thead>
        <tbody>
          <tr style="background:#f8fafc">
            <td style="padding:5px 8px;border:1px solid #e2e8f0">${esc(item.jobType)}</td>
            <td style="padding:5px 8px;border:1px solid #e2e8f0">${esc(quote.buildingType)}</td>
            <td style="padding:5px 8px;border:1px solid #e2e8f0">${item.excludeSqFt ? "—" : item.squareFootage.toLocaleString()}</td>
          </tr>
        </tbody>
        <thead>
          <tr style="background:${ACCENT};color:white">
            <th style="padding:5px 8px;text-align:left;font-weight:600;text-transform:uppercase;font-size:7.5pt">Product(s)</th>
            <th style="padding:5px 8px;text-align:left;font-weight:600;text-transform:uppercase;font-size:7.5pt">Strength</th>
            <th style="padding:5px 8px;text-align:left;font-weight:600;text-transform:uppercase;font-size:7.5pt">Thickness</th>
            <th style="padding:5px 8px;text-align:left;font-weight:600;text-transform:uppercase;font-size:7.5pt">Mobilizations</th>
          </tr>
        </thead>
        <tbody>
          <tr style="background:#f8fafc">
            <td style="padding:5px 8px;border:1px solid #e2e8f0">${esc([item.product1, item.product2].filter(Boolean).join(", "))}</td>
            <td style="padding:5px 8px;border:1px solid #e2e8f0">${esc(item.strengthPsi ? `${item.strengthPsi} psi` : "")}</td>
            <td style="padding:5px 8px;border:1px solid #e2e8f0">${esc(item.avgThickness ? `Avg. ${item.avgThickness}` : "")}</td>
            <td style="padding:5px 8px;border:1px solid #e2e8f0">${item.mobs > 0 ? item.mobs : ""}</td>
          </tr>
        </tbody>
        <thead>
          <tr style="background:${ACCENT};color:white">
            <th style="padding:5px 8px;text-align:left;font-weight:600;text-transform:uppercase;font-size:7.5pt">Pouring On</th>
            <th style="padding:5px 8px;text-align:left;font-weight:600;text-transform:uppercase;font-size:7.5pt">Floors</th>
            <th style="padding:5px 8px;text-align:left;font-weight:600;text-transform:uppercase;font-size:7.5pt">Levels</th>
            <th style="padding:5px 8px;text-align:right;font-weight:600;text-transform:uppercase;font-size:7.5pt">Lump Sum Price</th>
          </tr>
        </thead>
        <tbody>
          <tr style="background:#f8fafc">
            <td style="padding:5px 8px;border:1px solid #e2e8f0">${esc(item.pouringOn)}</td>
            <td style="padding:5px 8px;border:1px solid #e2e8f0">${esc(item.floors)}</td>
            <td style="padding:5px 8px;border:1px solid #e2e8f0">${item.levels > 0 ? item.levels : ""}</td>
            <td style="padding:5px 8px;border:1px solid #e2e8f0;text-align:right;font-weight:700;color:${ACCENT}">$${item.projectCost.toLocaleString()} + hst${item.squareFootage > 0 && !item.excludeSqFt ? ` ($${(item.projectCost / item.squareFootage).toFixed(2)}/ sq ft)` : ""}</td>
          </tr>
        </tbody>
      </table>
      ${item.notes ? `<div style="font-size:8.5pt;margin-top:6px;color:#374151"><strong>Notes:</strong> <span style="white-space:pre-wrap">${esc(item.notes)}</span></div>` : ""}
    </div>`).join("");

  const checklistSections = SECTION_ORDER
    .map(section => {
      const checkedItems = (checklistBySection[section] || []).filter(item => item.checked);
      if (!checkedItems.length) return "";
      const items = checkedItems.map(item => `
        <div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:3px;font-size:8.5pt">
          <div style="width:11px;height:11px;border:1.5px solid ${ACCENT};border-radius:2px;flex-shrink:0;margin-top:1px;background:${ACCENT};display:flex;align-items:center;justify-content:center">
            <span style="color:white;font-size:7pt;font-weight:900;line-height:1">✓</span>
          </div>
          <span style="color:#111">${esc(item.text)}</span>
        </div>`).join("");
      return `
        <div style="margin-bottom:14px;break-inside:avoid">
          <h4 style="font-size:9pt;font-weight:700;color:${ACCENT};border-bottom:2px solid ${ACCENT};padding-bottom:4px;margin-bottom:6px">${esc(SECTION_LABELS[section])}</h4>
          ${items}
        </div>`;
    }).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Quote ${esc(quote.quoteNumber)} — ${esc(clientName || quote.projectName)}</title>
  <style>
    @page { margin: 0.75in; size: letter; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #111; background: white; }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    }
    @media screen {
      body { background: #e5e7eb; }
      .page { max-width: 8.5in; margin: 0 auto; background: white; padding: 0.75in; box-shadow: 0 4px 24px rgba(0,0,0,0.15); min-height: 100vh; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Header: logo left | date/quotation right -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:16px;border-bottom:3px solid ${ACCENT}">
    <!-- Left: company logo + name -->
    <div style="display:flex;align-items:flex-start;gap:12px">
      ${logoData
        ? `<img src="${logoData}" alt="Logo" style="max-height:80px;max-width:220px;object-fit:contain" />`
        : `<div style="font-size:28pt;font-weight:900;color:${ACCENT};letter-spacing:-1px">CFT</div>`
      }
      ${!logoData ? `<div>
        <div style="font-size:12pt;font-weight:800;color:${ACCENT}">${esc(coName)}</div>
        ${coTagline ? `<div style="font-size:8pt;color:#555;text-transform:uppercase;letter-spacing:0.5px">${esc(coTagline)}</div>` : ""}
        ${coPhone ? `<div style="font-size:7.5pt;color:#555;margin-top:2px">${esc(coPhone)}</div>` : ""}
        ${coEmail ? `<div style="font-size:7.5pt;color:#555">${esc(coEmail)}</div>` : ""}
      </div>` : ""}
    </div>
    <!-- Right: date/quote# + Quotation heading -->
    <div style="text-align:right">
      <table style="margin-left:auto;border-collapse:collapse;margin-bottom:8px">
        <tr>
          <td style="font-size:8pt;color:#555;padding-right:10px;white-space:nowrap">Date:</td>
          <td style="font-size:8.5pt;font-weight:600;white-space:nowrap">${fmtDate(quote.createdAt)}</td>
        </tr>
        <tr>
          <td style="font-size:8pt;color:#555;padding-right:10px;white-space:nowrap">Quote No:</td>
          <td style="font-size:8.5pt;font-weight:600;white-space:nowrap">${esc(quote.quoteNumber)}</td>
        </tr>
      </table>
      <div style="font-size:28pt;font-weight:300;color:#444;letter-spacing:-0.5px;border-bottom:2px solid ${ACCENT};padding-bottom:2px">Quotation</div>
      ${quote.authorName ? `<div style="font-size:7.5pt;color:#888;margin-top:4px">Prepared by: <strong>${esc(quote.authorName)}</strong></div>` : ""}
    </div>
  </div>

  <!-- Client & Project side by side -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:20px">

    <!-- Client -->
    <div>
      ${clientLogo ? `<img src="${clientLogo}" alt="${esc(clientName)}" style="max-height:52px;max-width:140px;object-fit:contain;margin-bottom:8px;display:block" />` : ""}
      ${clientName ? `<div style="font-size:14pt;font-weight:800;text-transform:uppercase;color:#111;margin-bottom:4px">${esc(clientName)}</div>` : ""}
      ${clientAddress ? `<div style="font-size:9pt;color:#444;margin-bottom:2px">${esc(clientAddress)}</div>` : ""}
      ${clientPhone ? `<div style="font-size:9pt;color:#444">${esc(clientPhone)}</div>` : ""}
    </div>

    <!-- Project & Contacts -->
    <div>
      ${quote.projectName ? `<div style="font-size:14pt;font-weight:800;text-transform:uppercase;color:#111;margin-bottom:6px">${esc(quote.projectName)}</div>` : ""}
      ${quote.address ? `<div style="font-size:9pt;color:#444;margin-bottom:2px">${esc(quote.address)}</div>` : ""}
      ${quote.location ? `<div style="font-size:9pt;color:#444;margin-bottom:8px">${esc(quote.location)}</div>` : ""}
      ${displayContacts.map((ct: { name: string; cell: string; office: string; email: string }) => `
        <div style="margin-bottom:2px">
          <span style="font-size:9pt;font-weight:600">${esc(ct.name)}</span>
          ${ct.cell ? `<span style="font-size:9pt;color:#444;margin-left:12px">${esc(ct.cell)}</span>` : ""}
        </div>
        ${ct.email ? `<div style="font-size:8.5pt;color:#444">${esc(ct.email)}</div>` : ""}
      `).join("")}
      ${quote.contactMethod || quote.contactDate ? `
        <div style="font-size:8.5pt;color:#555;margin-top:6px">
          Specifications: ${esc(quote.contactMethod)}${quote.contactDate ? ` ${fmtDate(quote.contactDate)}` : ""}
        </div>` : ""}
    </div>
  </div>

  <!-- Intro paragraph -->
  <p style="font-size:9pt;color:#333;margin-bottom:20px;font-style:italic">
    We hereby propose to provide all labour, equipment and material required to complete the application of self-leveling underlayment/topping at the cost as follows:
  </p>

  <!-- Item blocks -->
  ${itemBlocks}

  <!-- Total -->
  ${quote.items.length > 0 && totalCost > 0 ? `
  <div style="display:flex;justify-content:flex-end;margin:16px 0 24px">
    <div style="border:2px solid ${ACCENT};border-radius:4px;padding:8px 20px;text-align:right;min-width:200px">
      <div style="font-size:8pt;color:#666;text-transform:uppercase;letter-spacing:0.5px">Total Project Cost</div>
      <div style="font-size:16pt;font-weight:800;color:${ACCENT}">$${totalCost.toLocaleString()} + hst</div>
    </div>
  </div>` : ""}

  <!-- Checklist -->
  ${checklistSections}

  <!-- Notes -->
  ${quote.notes ? `
  <div style="border-left:3px solid ${ACCENT};padding:10px 14px;margin-top:20px;background:#f8fafc">
    <div style="font-size:8pt;font-weight:700;text-transform:uppercase;color:${ACCENT};letter-spacing:0.5px;margin-bottom:6px">Notes</div>
    <p style="font-size:9pt;color:#374151;white-space:pre-wrap">${esc(quote.notes)}</p>
  </div>` : ""}

  <!-- Footer -->
  <div style="margin-top:32px;padding-top:10px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:7.5pt;color:#9ca3af">
    <span>${esc(coName)}</span>
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
