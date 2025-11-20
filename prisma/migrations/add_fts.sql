-- Add full-text search support for Lessons
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "search" tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(content,''))) STORED;
CREATE INDEX IF NOT EXISTS lesson_search_idx ON "Lesson" USING GIN("search");

-- Add full-text search support for Quizzes
ALTER TABLE "Quiz" ADD COLUMN IF NOT EXISTS "search" tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', coalesce(title,''))) STORED;
CREATE INDEX IF NOT EXISTS quiz_search_idx ON "Quiz" USING GIN("search");

