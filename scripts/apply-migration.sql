-- Migration: Remove Profile table, role, and timezone from User
-- Add bio and profileImage to User table
-- Rename name to fullName and avatar to profileImage

-- Step 1: Add bio and profileImage columns to User table first (if not exists)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bio" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "profileImage" TEXT;

-- Step 2: Migrate data from Profile to User (if Profile data exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Profile') THEN
    UPDATE "User" 
    SET 
      "bio" = (SELECT "bio" FROM "Profile" WHERE "Profile"."userId" = "User"."id"),
      "profileImage" = (SELECT "avatar" FROM "Profile" WHERE "Profile"."userId" = "User"."id")
    WHERE EXISTS (SELECT 1 FROM "Profile" WHERE "Profile"."userId" = "User"."id");
  END IF;
END $$;

-- Step 3: Drop foreign key constraint on Profile table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
             WHERE constraint_name = 'Profile_userId_fkey') THEN
    ALTER TABLE "Profile" DROP CONSTRAINT "Profile_userId_fkey";
  END IF;
END $$;

-- Step 4: Drop the unique index on Profile.userId (if it exists)
DROP INDEX IF EXISTS "Profile_userId_key";

-- Step 5: Drop Profile table (if exists)
DROP TABLE IF EXISTS "Profile";

-- Step 6: Remove timezone column from User (if exists)
ALTER TABLE "User" DROP COLUMN IF EXISTS "timezone";

-- Step 7: Remove role column from User (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'User' AND column_name = 'role') THEN
    ALTER TABLE "User" DROP COLUMN "role";
  END IF;
END $$;

-- Step 8: Drop Role enum (if exists and not used elsewhere)
DROP TYPE IF EXISTS "Role";

-- Step 9: Rename name column to fullName (if name exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'User' AND column_name = 'name') THEN
    ALTER TABLE "User" RENAME COLUMN "name" TO "fullName";
  END IF;
END $$;

-- Step 10: Handle avatar column if it exists (copy to profileImage and drop)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'User' AND column_name = 'avatar') THEN
    UPDATE "User" SET "profileImage" = "avatar" WHERE "avatar" IS NOT NULL AND "profileImage" IS NULL;
    ALTER TABLE "User" DROP COLUMN "avatar";
  END IF;
END $$;

