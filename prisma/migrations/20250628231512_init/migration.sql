-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "uid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "photoURL" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siren" TEXT NOT NULL,
    "denomination" TEXT NOT NULL,
    "dateCreation" DATETIME,
    "dateImmatriculation" DATETIME,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "adresseSiege" TEXT,
    "natureEntreprise" TEXT,
    "formeJuridique" TEXT,
    "codeAPE" TEXT,
    "libelleAPE" TEXT,
    "capitalSocial" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "datePublication" DATETIME NOT NULL,
    "typeDocument" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "typeAvis" TEXT,
    "reference" TEXT,
    "description" TEXT,
    "contenu" TEXT,
    "lienDocument" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Document_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FinancialRatio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "ratioType" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinancialRatio_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_uid_key" ON "User"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_lastLoginAt_idx" ON "User"("lastLoginAt");

-- CreateIndex
CREATE UNIQUE INDEX "Company_siren_key" ON "Company"("siren");

-- CreateIndex
CREATE INDEX "Company_siren_idx" ON "Company"("siren");

-- CreateIndex
CREATE INDEX "Company_denomination_idx" ON "Company"("denomination");

-- CreateIndex
CREATE INDEX "Company_active_idx" ON "Company"("active");

-- CreateIndex
CREATE INDEX "Company_codeAPE_idx" ON "Company"("codeAPE");

-- CreateIndex
CREATE INDEX "Company_formeJuridique_idx" ON "Company"("formeJuridique");

-- CreateIndex
CREATE INDEX "Company_updatedAt_idx" ON "Company"("updatedAt");

-- CreateIndex
CREATE INDEX "Company_denomination_active_idx" ON "Company"("denomination", "active");

-- CreateIndex
CREATE INDEX "Company_codeAPE_active_idx" ON "Company"("codeAPE", "active");

-- CreateIndex
CREATE INDEX "Document_companyId_idx" ON "Document"("companyId");

-- CreateIndex
CREATE INDEX "Document_source_idx" ON "Document"("source");

-- CreateIndex
CREATE INDEX "Document_typeDocument_idx" ON "Document"("typeDocument");

-- CreateIndex
CREATE INDEX "Document_datePublication_idx" ON "Document"("datePublication");

-- CreateIndex
CREATE INDEX "Document_companyId_datePublication_idx" ON "Document"("companyId", "datePublication");

-- CreateIndex
CREATE INDEX "FinancialRatio_companyId_idx" ON "FinancialRatio"("companyId");

-- CreateIndex
CREATE INDEX "FinancialRatio_year_idx" ON "FinancialRatio"("year");

-- CreateIndex
CREATE INDEX "FinancialRatio_ratioType_idx" ON "FinancialRatio"("ratioType");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialRatio_companyId_year_ratioType_key" ON "FinancialRatio"("companyId", "year", "ratioType");
