import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

const SECTION_LABELS: Record<string, string> = {
  jobDetails: "Job Details",
  scopeOfWork: "Scope of Work",
  provisions: "Provisions by General Contractor / Owner / Builder",
  exclusions: "Exclusions",
  miscCharges: "Miscellaneous Charges",
  terms: "Terms",
};

const SECTION_ORDER = ["jobDetails", "scopeOfWork", "provisions", "exclusions", "miscCharges", "terms"];

export default async function QuotePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  const { id } = await params;
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      company: { include: { contacts: true } },
      items: { orderBy: { sortOrder: "asc" } },
      checklistItems: { orderBy: [{ section: "asc" }, { sortOrder: "asc" }] },
    },
  });
  if (!quote) notFound();

  const totalCost = quote.items.reduce((sum, item) => sum + item.projectCost, 0);
  const primaryContact = quote.company?.contacts?.find(c => c.isPrimary) ?? quote.company?.contacts?.[0];

  const checklistBySection: Record<string, typeof quote.checklistItems> = {};
  for (const item of quote.checklistItems) {
    if (!checklistBySection[item.section]) checklistBySection[item.section] = [];
    checklistBySection[item.section].push(item);
  }

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>Quote {quote.quoteNumber} — {quote.company?.name || quote.projectName}</title>
        <style>{`
          @page { margin: 0.75in; size: letter; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #111; background: white; }

          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 2px solid #f97316; padding-bottom: 16px; }
          .logo-area h1 { font-size: 22pt; font-weight: 900; color: #f97316; letter-spacing: -0.5px; }
          .logo-area p { font-size: 8pt; color: #666; margin-top: 2px; }
          .quote-meta { text-align: right; }
          .quote-meta .quote-num { font-size: 18pt; font-weight: 700; color: #111; }
          .quote-meta .status { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 8pt; font-weight: 600; background: #dbeafe; color: #1d4ed8; margin-top: 4px; }

          .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
          .section-box { border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; }
          .section-box h3 { font-size: 8pt; font-weight: 700; text-transform: uppercase; color: #f97316; letter-spacing: 0.5px; margin-bottom: 8px; }
          .field-row { display: flex; gap: 4px; margin-bottom: 4px; font-size: 9pt; }
          .field-label { color: #6b7280; min-width: 90px; flex-shrink: 0; }
          .field-value { font-weight: 500; }

          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 8.5pt; }
          .items-table th { background: #f97316; color: white; padding: 5px 8px; text-align: left; font-weight: 600; font-size: 7.5pt; text-transform: uppercase; }
          .items-table td { padding: 5px 8px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
          .items-table tr:last-child td { border-bottom: none; }
          .items-table tr:nth-child(even) td { background: #fafafa; }
          .total-row { display: flex; justify-content: flex-end; margin-bottom: 20px; }
          .total-box { border: 2px solid #f97316; border-radius: 6px; padding: 8px 16px; text-align: right; }
          .total-box .label { font-size: 8pt; color: #6b7280; text-transform: uppercase; }
          .total-box .amount { font-size: 16pt; font-weight: 700; color: #f97316; }

          .checklist-section { margin-bottom: 14px; break-inside: avoid; }
          .checklist-section h4 { font-size: 9pt; font-weight: 700; color: #111; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 6px; }
          .checklist-item { display: flex; gap: 8px; align-items: flex-start; margin-bottom: 3px; font-size: 8.5pt; }
          .checklist-item .check { width: 11px; height: 11px; border: 1.5px solid #d1d5db; border-radius: 2px; flex-shrink: 0; margin-top: 1px; display: flex; align-items: center; justify-content: center; background: ${'"white"'}; }
          .checklist-item .check.checked { background: #f97316; border-color: #f97316; }
          .checkmark { color: white; font-size: 7pt; font-weight: 900; line-height: 1; }

          .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 8pt; color: #9ca3af; }

          @media print {
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            .no-print { display: none !important; }
          }
          @media screen {
            body { max-width: 8.5in; margin: 0 auto; padding: 0.75in; background: #f3f4f6; }
            .page { background: white; padding: 0.75in; box-shadow: 0 4px 24px rgba(0,0,0,0.12); }
          }
        `}</style>
      </head>
      <body>
        {/* Print button (screen only) */}
        <div className="no-print" style={{ position: "fixed", top: "16px", right: "16px", zIndex: 100, display: "flex", gap: "8px" }}>
          <button
            onClick={() => window.print()}
            style={{ background: "#f97316", color: "white", border: "none", borderRadius: "8px", padding: "10px 20px", fontWeight: 700, cursor: "pointer", fontSize: "14px" }}
          >
            Print / Save PDF
          </button>
          <button
            onClick={() => window.close()}
            style={{ background: "#6b7280", color: "white", border: "none", borderRadius: "8px", padding: "10px 20px", fontWeight: 700, cursor: "pointer", fontSize: "14px" }}
          >
            Close
          </button>
        </div>

        <div className="page">
          {/* Header */}
          <div className="header">
            <div className="logo-area">
              <h1>CFT</h1>
              <p>Concrete Floor Tek Inc.</p>
              <p style={{ marginTop: "8px", fontSize: "9pt" }}>
                {quote.authorName && <span>Prepared by: <strong>{quote.authorName}</strong></span>}
              </p>
            </div>
            <div className="quote-meta">
              <div style={{ fontSize: "8pt", color: "#6b7280", marginBottom: "2px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Quote</div>
              <div className="quote-num">{quote.quoteNumber}</div>
              <div className="status">{quote.status}</div>
              <div style={{ marginTop: "6px", fontSize: "9pt", color: "#6b7280" }}>
                {new Date(quote.createdAt).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}
              </div>
            </div>
          </div>

          {/* Client & Project Info */}
          <div className="two-col">
            <div className="section-box">
              <h3>Client</h3>
              {quote.company && <div className="field-row"><span className="field-value" style={{ fontSize: "11pt", fontWeight: 700 }}>{quote.company.name}</span></div>}
              {primaryContact && (
                <>
                  <div className="field-row"><span className="field-label">Contact:</span><span className="field-value">{primaryContact.name}</span></div>
                  {primaryContact.email && <div className="field-row"><span className="field-label">Email:</span><span className="field-value">{primaryContact.email}</span></div>}
                  {primaryContact.cell && <div className="field-row"><span className="field-label">Phone:</span><span className="field-value">{primaryContact.cell}</span></div>}
                </>
              )}
              {quote.contactMethod && <div className="field-row"><span className="field-label">Via:</span><span className="field-value">{quote.contactMethod}</span></div>}
            </div>
            <div className="section-box">
              <h3>Project</h3>
              {quote.projectName && <div className="field-row"><span className="field-label">Name:</span><span className="field-value">{quote.projectName}</span></div>}
              {quote.address && <div className="field-row"><span className="field-label">Address:</span><span className="field-value">{quote.address}</span></div>}
              {quote.location && <div className="field-row"><span className="field-label">Location:</span><span className="field-value">{quote.location}</span></div>}
              {quote.buildingType && <div className="field-row"><span className="field-label">Building:</span><span className="field-value">{quote.buildingType}</span></div>}
            </div>
          </div>

          {/* Option Items */}
          {quote.items.length > 0 && (
            <>
              <table className="items-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Job Type</th>
                    <th>Sq Ft</th>
                    <th>Floors</th>
                    <th>Pouring On</th>
                    <th>Product</th>
                    <th>Thickness</th>
                    <th style={{ textAlign: "right" }}>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.items.map((item, i) => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 600, color: "#f97316" }}>{i + 1}</td>
                      <td>{item.jobType}</td>
                      <td>{item.excludeSqFt ? "—" : item.squareFootage.toLocaleString()}</td>
                      <td>{item.floors}</td>
                      <td>{item.pouringOn}</td>
                      <td>{[item.product1, item.product2].filter(Boolean).join(", ")}</td>
                      <td>{item.avgThickness}</td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>${item.projectCost.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="total-row">
                <div className="total-box">
                  <div className="label">Total Project Cost</div>
                  <div className="amount">${totalCost.toLocaleString()}</div>
                </div>
              </div>
            </>
          )}

          {/* Checklist Sections */}
          {SECTION_ORDER.filter(s => checklistBySection[s]?.length).map(section => (
            <div key={section} className="checklist-section">
              <h4>{SECTION_LABELS[section]}</h4>
              {checklistBySection[section].map(item => (
                <div key={item.id} className="checklist-item">
                  <div className={`check ${item.checked ? "checked" : ""}`}>
                    {item.checked && <span className="checkmark">✓</span>}
                  </div>
                  <span style={{ color: item.checked ? "#111" : "#6b7280" }}>{item.text}</span>
                </div>
              ))}
            </div>
          ))}

          {/* Notes */}
          {quote.notes && (
            <div className="section-box" style={{ marginTop: "16px" }}>
              <h3>Notes</h3>
              <p style={{ fontSize: "9pt", color: "#374151", whiteSpace: "pre-wrap" }}>{quote.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="footer">
            <span>Concrete Floor Tek Inc.</span>
            <span>Quote {quote.quoteNumber}</span>
            <span>{new Date().toLocaleDateString("en-CA")}</span>
          </div>
        </div>

        <script dangerouslySetInnerHTML={{ __html: "" }} />
      </body>
    </html>
  );
}
