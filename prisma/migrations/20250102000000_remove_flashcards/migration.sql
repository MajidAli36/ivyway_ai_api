-- Migration: Remove FlashCard and FlashDeck tables

-- Step 1: Drop the index on FlashCard table first
DROP INDEX IF EXISTS "FlashCard_deckId_due_idx";

-- Step 2: Drop foreign key constraint on FlashCard table
ALTER TABLE "FlashCard" DROP CONSTRAINT IF EXISTS "FlashCard_deckId_fkey";

-- Step 3: Drop FlashCard table
DROP TABLE IF EXISTS "FlashCard";

-- Step 4: Drop foreign key constraint on FlashDeck table
ALTER TABLE "FlashDeck" DROP CONSTRAINT IF EXISTS "FlashDeck_ownerId_fkey";

-- Step 5: Drop FlashDeck table
DROP TABLE IF EXISTS "FlashDeck";

