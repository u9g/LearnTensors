CREATE TABLE stars (
  user_id TEXT NOT NULL,
  problem_id INTEGER NOT NULL,
  PRIMARY KEY (user_id, problem_id),
  FOREIGN KEY (problem_id) REFERENCES problems(id)
);
