CREATE TABLE IF NOT EXISTS user_solutions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL DEFAULT 'default-user',
  problem_id INTEGER NOT NULL,
  code TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (problem_id) REFERENCES problems(id)
);

CREATE UNIQUE INDEX idx_user_solutions_user_problem ON user_solutions(user_id, problem_id);
