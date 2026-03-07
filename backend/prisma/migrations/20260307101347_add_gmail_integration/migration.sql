-- AlterTable
ALTER TABLE "User" ADD COLUMN "gmailAccessToken" TEXT;
ALTER TABLE "User" ADD COLUMN "gmailEmail" TEXT;
ALTER TABLE "User" ADD COLUMN "gmailHistoryId" TEXT;
ALTER TABLE "User" ADD COLUMN "gmailRefreshToken" TEXT;
ALTER TABLE "User" ADD COLUMN "gmailTokenExpiry" TEXT;
ALTER TABLE "User" ADD COLUMN "gmailWatchExpiry" TEXT;

-- CreateTable
CREATE TABLE "EmailThread" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gmailThreadId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "clientId" TEXT,
    "dealId" TEXT,
    "managerId" TEXT NOT NULL,
    "lastMessageAt" TEXT NOT NULL,
    "snippet" TEXT,
    "createdAt" TEXT NOT NULL,
    CONSTRAINT "EmailThread_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EmailThread_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EmailThread_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmailMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gmailMessageId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyText" TEXT,
    "direction" TEXT NOT NULL,
    "sentAt" TEXT NOT NULL,
    "deliveryStatus" TEXT NOT NULL DEFAULT 'sent',
    "sentByUserId" TEXT,
    "createdAt" TEXT NOT NULL,
    CONSTRAINT "EmailMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "EmailThread" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EmailMessage_sentByUserId_fkey" FOREIGN KEY ("sentByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailThread_gmailThreadId_key" ON "EmailThread"("gmailThreadId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailMessage_gmailMessageId_key" ON "EmailMessage"("gmailMessageId");
