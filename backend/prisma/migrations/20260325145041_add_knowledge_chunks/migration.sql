-- CreateTable
CREATE TABLE "KnowledgeChunk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "embedding" TEXT NOT NULL,
    "docTitle" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "section" TEXT NOT NULL DEFAULT '',
    "position" TEXT NOT NULL DEFAULT '',
    "docHash" TEXT NOT NULL,
    "chunkIdx" INTEGER NOT NULL,
    "createdAt" TEXT NOT NULL
);
