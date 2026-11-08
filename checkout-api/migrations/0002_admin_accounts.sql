CREATE TABLE admin_accounts (
  username TEXT PRIMARY KEY COLLATE NOCASE,
  verifier TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);
