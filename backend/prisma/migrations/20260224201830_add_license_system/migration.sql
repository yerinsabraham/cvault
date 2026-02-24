-- CreateEnum
CREATE TYPE "LicensePlan" AS ENUM ('TRIAL', 'STARTER', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "LicenseStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateTable
CREATE TABLE "licenses" (
    "id"          TEXT NOT NULL,
    "key"         TEXT NOT NULL,
    "tenant_id"   TEXT NOT NULL,
    "product"     TEXT NOT NULL,
    "plan"        "LicensePlan"   NOT NULL DEFAULT 'TRIAL',
    "status"      "LicenseStatus" NOT NULL DEFAULT 'ACTIVE',
    "max_uses"    INTEGER,
    "used_count"  INTEGER NOT NULL DEFAULT 0,
    "expires_at"  TIMESTAMP(3),
    "metadata"    JSONB NOT NULL DEFAULT '{}',
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "licenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "licenses_key_key" ON "licenses"("key");

-- CreateIndex
CREATE INDEX "licenses_tenant_id_idx" ON "licenses"("tenant_id");

-- CreateIndex
CREATE INDEX "licenses_product_idx" ON "licenses"("product");

-- AddForeignKey
ALTER TABLE "licenses"
    ADD CONSTRAINT "licenses_tenant_id_fkey"
    FOREIGN KEY ("tenant_id")
    REFERENCES "tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
