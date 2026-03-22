CREATE TABLE IF NOT EXISTS run_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL DEFAULT 'default-user',
  problem_id INTEGER NOT NULL,
  results TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (problem_id) REFERENCES problems(id)
);

CREATE INDEX idx_run_results_user_problem ON run_results(user_id, problem_id);
