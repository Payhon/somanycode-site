-- CreateTable
CREATE TABLE "AgentResource" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "org" TEXT,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "layer" TEXT NOT NULL,
    "license" TEXT,
    "lang" TEXT,
    "stars" TEXT,
    "active" TEXT,
    "tags" TEXT,
    "site" TEXT,
    "github" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentResource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentResource_code_key" ON "AgentResource"("code");

-- CreateIndex
CREATE INDEX "AgentResource_layer_idx" ON "AgentResource"("layer");

-- CreateIndex
CREATE INDEX "AgentResource_type_idx" ON "AgentResource"("type");

-- CreateIndex
CREATE INDEX "AgentResource_code_idx" ON "AgentResource"("code");
