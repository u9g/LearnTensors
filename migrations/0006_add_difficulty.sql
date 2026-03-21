ALTER TABLE problems ADD COLUMN difficulty TEXT NOT NULL DEFAULT 'Easy' CHECK(difficulty IN ('Easy', 'Medium', 'Hard'));
