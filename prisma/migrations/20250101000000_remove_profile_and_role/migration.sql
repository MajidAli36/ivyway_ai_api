-- Migration: Remove Profile table, role, and timezone from User
-- Add bio and profileImage to User table
-- Rename name to fullName and avatar to profileImage

-- Step 1: Add bio and profileImage columns to User table first
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bio" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "profileImage" TEXT;

-- Step 2: Migrate data from Profile to User (if Profile data exists)
UPDATE "User" 
SET 
  "bio" = (SELECT "bio" FROM "Profile" WHERE "Profile"."userId" = "User"."id"),
  "profileImage" = (SELECT "avatar" FROM "Profile" WHERE "Profile"."userId" = "User"."id")
WHERE EXISTS (SELECT 1 FROM "Profile" WHERE "Profile"."userId" = "User"."id");

-- Step 3: Drop foreign key constraint on Profile table
ALTER TABLE "Profile" DROP CONSTRAINT IF EXISTS "Profile_userId_fkey";

-- Step 4: Drop the unique index on Profile.userId (if it exists)
DROP INDEX IF EXISTS "Profile_userId_key";

-- Step 5: Drop Profile table
DROP TABLE IF EXISTS "Profile";

-- Step 6: Remove timezone column from User
ALTER TABLE "User" DROP COLUMN IF EXISTS "timezone";

-- Step 7: Remove role column from User
ALTER TABLE "User" DROP COLUMN IF EXISTS "role";

-- Step 8: Drop Role enum (only if no other tables use it)
-- Note: Check if Role enum is used elsewhere before dropping
-- For now, we'll drop it as it's only used in User table
DROP TYPE IF EXISTS "Role";

-- Step 9: Rename name column to fullName
ALTER TABLE "User" RENAME COLUMN "name" TO "fullName";

-- Step 10: Handle avatar column if it exists (copy to profileImage and drop)
-- If avatar column exists, copy its data to profileImage and drop it
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'User' AND column_name = 'avatar') THEN
    UPDATE "User" SET "profileImage" = "avatar" WHERE "avatar" IS NOT NULL AND "profileImage" IS NULL;
    ALTER TABLE "User" DROP COLUMN "avatar";
  END IF;
END $$;

