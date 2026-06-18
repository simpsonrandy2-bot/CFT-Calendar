import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

const DEFAULT_CHECKLIST = [
  { section: "jobDetails", text: "Levelrock 2500 is a specially formulated gypsum base GREEN product that is recommended for this type of floor system", checked: true, sortOrder: 0 },
  { section: "jobDetails", text: "Finished Underlayment/Topping floor surface to be smooth and flat.", checked: true, sortOrder: 1 },
  { section: "jobDetails", text: "Expect increased humidity in the building during drying period (1-2 weeks under ideal drying conditions)", checked: true, sortOrder: 2 },
  { section: "jobDetails", text: "Client to obtain all work and street parking permits (if required)", checked: true, sortOrder: 3 },
  { section: "jobDetails", text: "Product strength (cube) testing will be conducted to ensure mix quality.", checked: false, sortOrder: 4 },
  { section: "jobDetails", text: "Finished Underlayment/Topping floor surface to be Level, smooth and flat", checked: false, sortOrder: 5 },
  { section: "jobDetails", text: "Finished floor flatness tolerance to meet CSA A23.1-04 ff 25 (1/4 inch in 10 feet)", checked: false, sortOrder: 6 },
  { section: "jobDetails", text: "Finished floor flatness tolerance to be 1/8 inch in 10 feet", checked: false, sortOrder: 7 },
  { section: "jobDetails", text: "Ensure radiant heat tubes have staples/clips installed at about 14 inch spacing to avoid floating of tubes to surface of overpour", checked: false, sortOrder: 8 },
  { section: "jobDetails", text: "Builder to unload flatbed trucks for delivery of material (Zoom Boom required)", checked: false, sortOrder: 9 },
  { section: "jobDetails", text: "No coreslab skim on slabs", checked: false, sortOrder: 10 },
  { section: "scopeOfWork", text: "Priming of sub-floor prior to placement of underlayment product", checked: true, sortOrder: 0 },
  { section: "scopeOfWork", text: "Survey floor area and spray/ mark grades as required.", checked: true, sortOrder: 1 },
  { section: "scopeOfWork", text: "Installation of self-leveling underlayment/ topping product as indicated over the sub-floor", checked: true, sortOrder: 2 },
  { section: "scopeOfWork", text: "Survey floor area and set grades as required", checked: false, sortOrder: 3 },
  { section: "scopeOfWork", text: "Survey floor area and set grades to achieve a level floor", checked: false, sortOrder: 4 },
  { section: "scopeOfWork", text: "Sealing of Levelrock product", checked: false, sortOrder: 5 },
  { section: "scopeOfWork", text: "Install bulkheads/ material stops where required", checked: false, sortOrder: 6 },
  { section: "scopeOfWork", text: "Cover vent openings with rigid foam", checked: false, sortOrder: 7 },
  { section: "scopeOfWork", text: "Broom sweep and/or vacuum subfloor", checked: false, sortOrder: 8 },
  { section: "provisions", text: "Adequate enclosure to pour location. Windows installed and Roof is complete to protect against water penetration", checked: true, sortOrder: 0 },
  { section: "provisions", text: "Minimum Temperature inside the building shall be 50 F (10 C) and maintained after the pour.", checked: true, sortOrder: 1 },
  { section: "provisions", text: "Bulkheads/ material stops to contain product where required", checked: true, sortOrder: 2 },
  { section: "provisions", text: "Protect sensitive areas (stone work, wood finishes, bath tubs etc.) from possible product splatter", checked: true, sortOrder: 3 },
  { section: "provisions", text: "Ensure minimal overlap/interference of work with other trades. Foot traffic can resume 3 hours after the floor is poured", checked: true, sortOrder: 4 },
  { section: "provisions", text: "Sufficient Air flow /Ventilation to allow moisture from floor to escape building. Most critical first 72 hours after the pour", checked: true, sortOrder: 5 },
  { section: "provisions", text: "Resolve/deal with sub-floor moisture issues (if any) as deemed necessary prior to topping application", checked: true, sortOrder: 6 },
  { section: "provisions", text: "Outside Staging areas for equipment and materials", checked: true, sortOrder: 7 },
  { section: "provisions", text: "Disposal access of empty paper bags, wood pallets, surplus sand to be left as is", checked: true, sortOrder: 8 },
  { section: "provisions", text: "Sub-floor is cleaned (vacuumed or well swept) to accept placement of primer and underlayment", checked: true, sortOrder: 9 },
  { section: "provisions", text: "A bond test with finished flooring goods is recommended. Follow thinnest/ adhesive manufactures recommendations for installation.", checked: true, sortOrder: 10 },
  { section: "provisions", text: "Structurally sound floor meeting local building codes. Deflection Minimum L/360", checked: true, sortOrder: 11 },
  { section: "provisions", text: "Dedicated potable Water with sufficient pressure/volume for mixing (provide a minimum of 3/4 inch service with hose bib connection", checked: false, sortOrder: 12 },
  { section: "provisions", text: "Outside Staging area for equipment and materials (1-2 loads of sand, bobcat, 8-12 pallets, mixer/pump, 30 foot truck)", checked: false, sortOrder: 13 },
  { section: "provisions", text: "Disposal access for empty paper bags and wood pallets", checked: false, sortOrder: 14 },
  { section: "provisions", text: "Floors to be poured complete each mobilization unless otherwise agreed upon", checked: false, sortOrder: 15 },
  { section: "provisions", text: "GC to expect up to 6 pallets of material left on site during project. (pallets can be stacked)", checked: false, sortOrder: 16 },
  { section: "provisions", text: "Sub-floor is cleaned (vacuumed) to accept placement of primer and topping. Any foam/ debris / dirt will float to surface causing imperfections.", checked: false, sortOrder: 17 },
  { section: "provisions", text: "Ensure all cracks, voids and utility openings are filled/patched/sealed to avoid leakage of liquefied product to lower levels or inside utilities", checked: false, sortOrder: 18 },
  { section: "exclusions", text: "Any and all delamination caused by poor quality of existing subfloor or excess moisture in existing subfloor", checked: true, sortOrder: 0 },
  { section: "exclusions", text: "Any delay/effect on product drying time and strength due to residual moisture in sub-floor or poor drying conditions", checked: true, sortOrder: 1 },
  { section: "exclusions", text: "Any damage to property/equipment caused by leakage of liquefied product", checked: true, sortOrder: 2 },
  { section: "exclusions", text: "Any and all repairs due to cracks caused by sub-floor movement, settlement or deflection", checked: true, sortOrder: 3 },
  { section: "exclusions", text: "Any pinholes/ air bubbles in surface of underlayment due to subfloor", checked: false, sortOrder: 4 },
  { section: "exclusions", text: "No other specifications other than those noted above", checked: false, sortOrder: 5 },
  { section: "miscCharges", text: "A charge over and above the quotation amount will be billed if the work area and job site is not ready when CFT workers arrive on date agreed. The rate will be charged at $750.00 an hour.", checked: true, sortOrder: 0 },
  { section: "miscCharges", text: "Minimum 72 hours' (business days) notice for a pour cancellation or a charge of $2,500.00 will be applied", checked: true, sortOrder: 1 },
  { section: "miscCharges", text: "If project is poured during half-load season (March-May) and is impacted by these restraints the customer will bear the additional costs of operating during this time (sand & material transportation)", checked: true, sortOrder: 2 },
  { section: "miscCharges", text: "Please allow for a $2,500.00 surcharge for mobilizations between Dec 15 - March 15, as there are many operational challenges in the Winter months.", checked: false, sortOrder: 3 },
  { section: "terms", text: "This quote remains firm for 3 months. Due to fluctuating costs prices subject to change after 3 months", checked: true, sortOrder: 0 },
  { section: "terms", text: "Backcharges for any deficiencies will not be accepted unless CFT has been formally advised prior to any action by others.", checked: true, sortOrder: 1 },
  { section: "terms", text: "All material is guaranteed and all work to be completed in a professional manner according to industry standards. Any revisions to the \"Scope of Work\" will be executed upon receiving written purchase orders, and will be subject to an extra charge over and above the quotation.", checked: true, sortOrder: 2 },
  { section: "terms", text: "Payment is due upon COMPLETION of work. Overdue amounts accrue interest at a rate of 24% per annum", checked: true, sortOrder: 3 },
  { section: "terms", text: "If payment is not received within 45 days Concrete Floor Tek Inc. reserves the right to file a construction lien against the property/project. All associated legal and administrative costs for filing or removing such lien shall be the responsibility of the client", checked: true, sortOrder: 4 },
  { section: "terms", text: "Payment is due NET 30. Overdue amounts accrue interest at a rate of 24% per annum", checked: false, sortOrder: 5 },
  { section: "terms", text: "PLEASE ADD 10% TO COST IF HOLDBACK IS TO BE APPLIED.", checked: false, sortOrder: 6 },
  { section: "terms", text: "50% deposit required prior to pouring", checked: false, sortOrder: 7 },
  { section: "terms", text: "Any tariffs placed on the material quoted may affect this quotation", checked: false, sortOrder: 8 },
];

export async function GET(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "";
  const year = searchParams.get("year") || "";
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "25");
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (status && status !== "All") where.status = status;
  if (year) where.quoteNumber = { startsWith: `${year.slice(-2)}-` };
  if (search) {
    where.OR = [
      { quoteNumber: { contains: search } },
      { projectName: { contains: search } },
      { location: { contains: search } },
      { company: { name: { contains: search } } },
    ];
  }

  const [quotes, total] = await Promise.all([
    prisma.quote.findMany({
      where,
      include: {
        company: true,
        items: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.quote.count({ where }),
  ]);

  const stats = await prisma.quote.groupBy({
    by: ["status"],
    _count: true,
    where: year ? { quoteNumber: { startsWith: `${year.slice(-2)}-` } } : {},
  });

  return NextResponse.json({ quotes, total, page, limit, stats });
}

export async function POST(request: NextRequest) {
  const session = await requireAuth("office");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await request.json();

  // Try to find a template matching the requested product/template name
  let checklistItems = DEFAULT_CHECKLIST;
  if (data.templateName) {
    const template = await prisma.checklistTemplate.findUnique({
      where: { name: data.templateName },
      include: { items: { orderBy: [{ section: "asc" }, { sortOrder: "asc" }] } },
    });
    if (template && template.items.length > 0) {
      checklistItems = template.items.map(({ section, text, checked, sortOrder }) => ({ section, text, checked, sortOrder }));
    }
  }

  const quote = await prisma.quote.create({
    data: {
      quoteNumber: data.quoteNumber,
      companyId: data.companyId || null,
      projectName: data.projectName || "",
      address: data.address || "",
      location: data.location || "",
      buildingType: data.buildingType || "",
      contactMethod: data.contactMethod || "Email",
      contactDate: data.contactDate ? new Date(data.contactDate) : null,
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
      finalDate: data.finalDate ? new Date(data.finalDate) : null,
      authorName: data.authorName || "",
      status: "Draft",
      notes: data.notes || "",
      items: data.items ? {
        create: data.items.map((item: Record<string, unknown>, i: number) => ({ ...item, sortOrder: i })),
      } : undefined,
      checklistItems: {
        create: checklistItems,
      },
    },
    include: {
      company: true,
      items: true,
      checklistItems: true,
    },
  });

  return NextResponse.json(quote, { status: 201 });
}
