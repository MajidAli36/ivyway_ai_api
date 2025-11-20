-- Add full-text search support for Lessons
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Lesson' AND column_name = 'search'
    ) THEN
        ALTER TABLE "Lesson" ADD COLUMN "search" tsvector
          GENERATED ALWAYS AS (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(content,''))) STORED;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'lesson_search_idx'
    ) THEN
        CREATE INDEX lesson_search_idx ON "Lesson" USING GIN("search");
    END IF;
END $$;

-- Add full-text search support for Quizzes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Quiz' AND column_name = 'search'
    ) THEN
        ALTER TABLE "Quiz" ADD COLUMN "search" tsvector
          GENERATED ALWAYS AS (to_tsvector('simple', coalesce(title,''))) STORED;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'quiz_search_idx'
    ) THEN
        CREATE INDEX quiz_search_idx ON "Quiz" USING GIN("search");
    END IF;
END $$;

