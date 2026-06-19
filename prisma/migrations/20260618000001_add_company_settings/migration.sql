CREATE TABLE "CompanySettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "logoData" TEXT,
    "companyName" TEXT NOT NULL DEFAULT 'Concrete Floor Tek Inc.',
    "tagline" TEXT NOT NULL DEFAULT 'Self-Leveling Experts',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "website" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanySettings_pkey" PRIMARY KEY ("id")
);
