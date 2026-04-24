-- LTI 1.3 (Canvas 연동용) 테이블 추가
-- Phase A: POC 공용 DB, lti_ 프리픽스로 기존 테이블과 분리

-- CreateTable
CREATE TABLE "lti_platform" (
    "id" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "authLoginUrl" TEXT NOT NULL,
    "authTokenUrl" TEXT NOT NULL,
    "jwksUrl" TEXT NOT NULL,
    "deploymentIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lti_platform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lti_session" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "platformIssuer" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "loginHint" TEXT,
    "ltiMessageHint" TEXT,
    "targetLinkUri" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lti_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lti_user_map" (
    "id" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "ltiSub" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "roles" TEXT,
    "lastLaunchAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lti_user_map_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lti_platform_issuer_clientId_key" ON "lti_platform"("issuer", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "lti_session_state_key" ON "lti_session"("state");

-- CreateIndex
CREATE INDEX "lti_session_state_idx" ON "lti_session"("state");

-- CreateIndex
CREATE INDEX "lti_session_expiresAt_idx" ON "lti_session"("expiresAt");

-- CreateIndex
CREATE INDEX "lti_user_map_userId_idx" ON "lti_user_map"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "lti_user_map_platformId_ltiSub_key" ON "lti_user_map"("platformId", "ltiSub");

-- AddForeignKey
ALTER TABLE "lti_user_map" ADD CONSTRAINT "lti_user_map_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "lti_platform"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lti_user_map" ADD CONSTRAINT "lti_user_map_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
