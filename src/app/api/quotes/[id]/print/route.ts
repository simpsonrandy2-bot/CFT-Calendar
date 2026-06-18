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
const HDR  = "#484848";   // dark charcoal — header row background
const HDRLT = "#f0f0f0";  // very light gray — data row background
const BORD = "#cccccc";   // cell border color

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

  const coName   = companySettings?.companyName || "Concrete Floor Tek Inc.";
  const coTagline = companySettings?.tagline || "Self-Leveling Experts";
  const coPhone  = companySettings?.phone || "";
  const coEmail  = companySettings?.email || "";
  const logoData = companySettings?.logoData || "";

  const clientLogo    = quote.company?.logo || "";
  const clientName    = quote.company?.name || "";
  const clientAddress = [quote.company?.address, quote.company?.city, quote.company?.province].filter(Boolean).join(", ");
  const clientPhone   = quote.company?.phone || "";

  const quoteContacts = (quote.quoteContacts || []).map(
    (qc: { person: { name: string; cell: string; office: string; email: string; position: string } }) => qc.person
  );
  const displayContacts = quoteContacts.length > 0
    ? quoteContacts
    : (quote.company?.contacts?.filter((c: { isPrimary: boolean }) => c.isPrimary).slice(0, 1) || []);

  const totalCost = quote.items.reduce((s, i) => s + i.projectCost, 0);

  const checklistBySection: Record<string, typeof quote.checklistItems> = {};
  for (const item of quote.checklistItems) {
    if (!checklistBySection[item.section]) checklistBySection[item.section] = [];
    checklistBySection[item.section].push(item);
  }

  // ── item blocks ──────────────────────────────────────────────────────────
  const TH = `background:${HDR};color:#fff;font-size:7.5pt;font-weight:600;text-transform:uppercase;padding:5px 8px;text-align:left;letter-spacing:0.3px`;
  const TH_R = `${TH};text-align:right`;
  const TD = `background:${HDRLT};border:1px solid ${BORD};font-size:8.5pt;padding:5px 8px;vertical-align:middle`;
  const TD_R = `${TD};text-align:right;font-weight:700`;

  const itemBlocks = quote.items.map((item, i) => {
    const sqFt = item.excludeSqFt ? "—" : item.squareFootage.toLocaleString();
    const price = `$${item.projectCost.toLocaleString()} + hst${item.squareFootage > 0 && !item.excludeSqFt ? `  ($${(item.projectCost / item.squareFootage).toFixed(2)}/ sq ft)` : ""}`;
    return `
    <div style="margin-bottom:20px;page-break-inside:avoid">
      <div style="font-size:9pt;font-weight:700;text-transform:uppercase;margin-bottom:4px">Item No. ${i + 1}</div>
      <table style="width:100%;border-collapse:collapse;table-layout:fixed">
        <colgroup><col style="width:28%"><col style="width:40%"><col style="width:32%"></colgroup>
        <tr><th style="${TH}">Job Type</th><th style="${TH}">Building Type</th><th style="${TH}">Sq Ft</th></tr>
        <tr><td style="${TD}">${esc(item.jobType)}</td><td style="${TD}">${esc(quote.buildingType)}</td><td style="${TD}">${sqFt}</td></tr>
      </table>
      <table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-top:-1px">
        <colgroup><col style="width:35%"><col style="width:20%"><col style="width:22%"><col style="width:23%"></colgroup>
        <tr><th style="${TH}">Product(s)</th><th style="${TH}">Strength</th><th style="${TH}">Thickness</th><th style="${TH}">Mobilizations</th></tr>
        <tr>
          <td style="${TD}">${esc([item.product1, item.product2].filter(Boolean).join(", "))}</td>
          <td style="${TD}">${esc(item.strengthPsi ? `${item.strengthPsi} psi` : "")}</td>
          <td style="${TD}">${esc(item.avgThickness ? `Avg. ${item.avgThickness}` : "")}</td>
          <td style="${TD}">${item.mobs > 0 ? item.mobs : ""}</td>
        </tr>
      </table>
      <table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-top:-1px">
        <colgroup><col style="width:20%"><col style="width:17%"><col style="width:13%"><col style="width:50%"></colgroup>
        <tr><th style="${TH}">Pouring On</th><th style="${TH}">Floors</th><th style="${TH}">Levels</th><th style="${TH_R}">Lump Sum Price</th></tr>
        <tr>
          <td style="${TD}">${esc(item.pouringOn)}</td>
          <td style="${TD}">${esc(item.floors)}</td>
          <td style="${TD}">${item.levels > 0 ? item.levels : ""}</td>
          <td style="${TD_R}">${esc(price)}</td>
        </tr>
      </table>
      ${item.notes ? `<div style="font-size:8.5pt;margin-top:5px;line-height:1.5"><strong>Notes:</strong>&nbsp;<span style="white-space:pre-wrap">${esc(item.notes)}</span></div>` : ""}
    </div>`;
  }).join("");

  // ── checklist ─────────────────────────────────────────────────────────────
  const checklistSections = SECTION_ORDER.map(section => {
    const checkedItems = (checklistBySection[section] || []).filter(item => item.checked);
    if (!checkedItems.length) return "";
    const rows = checkedItems.map(item => `
      <tr>
        <td style="width:16px;vertical-align:top;padding:0 6px 3px 0">
          <div style="width:12px;height:12px;background:${HDR};border-radius:2px;display:inline-flex;align-items:center;justify-content:center;margin-top:1px">
            <span style="color:white;font-size:8pt;line-height:1;font-weight:900">&#10003;</span>
          </div>
        </td>
        <td style="font-size:8.5pt;padding-bottom:3px;line-height:1.4">${esc(item.text)}</td>
      </tr>`).join("");
    return `
      <div style="margin-bottom:14px;page-break-inside:avoid">
        <div style="font-size:9pt;font-weight:700;color:#222;border-bottom:2px solid ${HDR};padding-bottom:3px;margin-bottom:6px">${esc(SECTION_LABELS[section])}</div>
        <table style="border-collapse:collapse;width:100%">${rows}</table>
      </div>`;
  }).join("");

  // ── HTML ──────────────────────────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Quote ${esc(quote.quoteNumber)} — ${esc(clientName || quote.projectName)}</title>
  <style>
    @page { margin: 0.75in; size: letter; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #111; background: white; line-height: 1.4; }
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
    @media screen {
      body { background: #d1d5db; }
      .page { max-width: 8.5in; margin: 0 auto; background: white; padding: 0.75in; box-shadow: 0 4px 32px rgba(0,0,0,0.2); min-height: 11in; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:0">
    <tr>
      <td style="vertical-align:bottom;padding-bottom:14px;width:52%">
        ${logoData
          ? `<img src="${logoData}" alt="Logo" style="max-height:90px;max-width:260px;object-fit:contain;display:block"/>`
          : `<table style="border-collapse:collapse"><tr>
               <td style="font-size:34pt;font-weight:900;color:#333;line-height:1;padding-right:10px">CFT</td>
               <td style="vertical-align:middle">
                 <div style="font-size:12pt;font-weight:800;color:#333">${esc(coName)}</div>
                 ${coTagline ? `<div style="font-size:8pt;color:#555;text-transform:uppercase;letter-spacing:0.5px">${esc(coTagline)}</div>` : ""}
                 ${coPhone ? `<div style="font-size:8pt;color:#555;margin-top:2px">${esc(coPhone)}</div>` : ""}
                 ${coEmail ? `<div style="font-size:8pt;color:#555">${esc(coEmail)}</div>` : ""}
               </td>
             </tr></table>`
        }
      </td>
      <td style="vertical-align:bottom;text-align:right;padding-bottom:14px">
        <div style="font-size:8.5pt;color:#555;margin-bottom:2px">
          Date:&nbsp;&nbsp;<strong style="font-size:9pt;color:#111">${fmtDate(quote.createdAt)}</strong>
        </div>
        <div style="font-size:8.5pt;color:#555;margin-bottom:12px">
          Quote No:&nbsp;&nbsp;<strong style="font-size:9pt;color:#111">${esc(quote.quoteNumber)}</strong>
        </div>
        <div style="font-size:32pt;font-weight:300;color:#333;letter-spacing:-1px;line-height:1;border-bottom:2px solid #444;padding-bottom:6px;min-width:200px">Quotation</div>
        ${quote.authorName ? `<div style="font-size:7.5pt;color:#888;margin-top:4px">Prepared by: <strong>${esc(quote.authorName)}</strong></div>` : ""}
      </td>
    </tr>
  </table>
  <div style="border-top:2px solid #444;margin-bottom:18px"></div>

  <!-- CLIENT + PROJECT -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
    <tr>
      <td style="width:46%;vertical-align:top;padding-right:24px">
        ${clientLogo ? `<img src="${clientLogo}" alt="${esc(clientName)}" style="max-height:52px;max-width:140px;object-fit:contain;display:block;margin-bottom:6px"/>` : ""}
        ${clientName ? `<div style="font-size:12pt;font-weight:800;text-transform:uppercase;color:#111;margin-bottom:2px">${esc(clientName)}</div>` : ""}
        ${clientAddress ? `<div style="font-size:9pt;color:#444;line-height:1.5">${esc(clientAddress)}</div>` : ""}
        ${clientPhone ? `<div style="font-size:9pt;color:#444">${esc(clientPhone)}</div>` : ""}
      </td>
      <td style="width:54%;vertical-align:top">
        ${quote.projectName ? `<div style="font-size:12pt;font-weight:800;text-transform:uppercase;color:#111;margin-bottom:3px">${esc(quote.projectName)}</div>` : ""}
        ${quote.address ? `<div style="font-size:9pt;color:#444;margin-bottom:1px">${esc(quote.address)}</div>` : ""}
        ${quote.location ? `<div style="font-size:9pt;color:#444;margin-bottom:6px">${esc(quote.location)}</div>` : ""}
        ${displayContacts.map((ct: { name: string; cell: string; office: string; email: string }) => `
          <div style="margin-bottom:1px">
            <span style="font-size:9pt;font-weight:600">${esc(ct.name)}</span>
            ${ct.cell ? `<span style="font-size:9pt;color:#444;margin-left:16px">${esc(ct.cell)}</span>` : ""}
          </div>
          ${ct.email ? `<div style="font-size:8.5pt;color:#444;margin-bottom:3px">${esc(ct.email)}</div>` : ""}
        `).join("")}
        ${quote.contactMethod || quote.contactDate ? `
          <div style="font-size:8.5pt;color:#444;margin-top:4px">
            Specifications: ${esc(quote.contactMethod)}${quote.contactDate ? ` ${fmtDate(quote.contactDate)}` : ""}
          </div>` : ""}
      </td>
    </tr>
  </table>

  <!-- INTRO -->
  <p style="font-size:9pt;color:#333;margin-bottom:16px;font-style:italic;line-height:1.5">
    We hereby propose to provide all labour, equipment and material required to complete the application of self-leveling underlayment/topping at the cost as follows:
  </p>

  <!-- ITEMS -->
  ${itemBlocks}

  <!-- TOTAL -->
  ${totalCost > 0 ? `
  <table style="width:100%;border-collapse:collapse;margin:12px 0 20px">
    <tr>
      <td></td>
      <td style="width:260px;border:2px solid #444;padding:10px 18px;text-align:center">
        <div style="font-size:7.5pt;color:#666;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">Total Project Cost</div>
        <div style="font-size:17pt;font-weight:800;color:#222">$${totalCost.toLocaleString()} + hst</div>
      </td>
    </tr>
  </table>` : ""}

  <!-- CHECKLIST -->
  ${checklistSections}

  <!-- NOTES -->
  ${quote.notes ? `
  <div style="border-left:3px solid #888;padding:10px 14px;margin-top:16px;background:#f8f8f8">
    <div style="font-size:8pt;font-weight:700;text-transform:uppercase;color:#444;letter-spacing:0.5px;margin-bottom:4px">Notes</div>
    <div style="font-size:9pt;color:#374151;white-space:pre-wrap;line-height:1.5">${esc(quote.notes)}</div>
  </div>` : ""}

  <!-- FOOTER -->
  <div style="margin-top:28px;padding-top:8px;border-top:1px solid #ddd;display:flex;justify-content:space-between;font-size:7.5pt;color:#aaa">
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
