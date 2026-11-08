CREATE TABLE product_prices (
  id TEXT PRIMARY KEY,
  price INTEGER NOT NULL CHECK (price BETWEEN 1 AND 10000000)
);

CREATE TABLE coupons (
  code TEXT PRIMARY KEY COLLATE NOCASE,
  percent INTEGER NOT NULL CHECK (percent BETWEEN 1 AND 100),
  min_quantity INTEGER NOT NULL CHECK (min_quantity BETWEEN 2 AND 500),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);

CREATE TABLE quotes (
  reference TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL,
  snapshot TEXT NOT NULL
);

CREATE INDEX quotes_expiry ON quotes (expires_at);

CREATE TABLE request_limits (
  key TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL,
  count INTEGER NOT NULL
);

CREATE INDEX request_limits_expiry ON request_limits (expires_at);
