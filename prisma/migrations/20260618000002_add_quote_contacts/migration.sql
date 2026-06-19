CREATE TABLE "QuoteContact" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    CONSTRAINT "QuoteContact_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "QuoteContact" ADD CONSTRAINT "QuoteContact_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuoteContact" ADD CONSTRAINT "QuoteContact_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "QuoteContact_quoteId_personId_key" ON "QuoteContact"("quoteId", "personId");
