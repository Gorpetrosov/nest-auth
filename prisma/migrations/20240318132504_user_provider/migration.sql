-- CreateEnum
CREATE TYPE "Providers" AS ENUM ('LOCAL', 'GOOGLE', 'YANDEX');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "provider" "Providers" NOT NULL DEFAULT 'LOCAL';
