-- =============================================================
-- TireFlow — Database Schema
-- PostgreSQL 15+
-- =============================================================

-- ============================================================
-- MULTI-TENANCY
-- ============================================================
CREATE TABLE tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  logo_url      TEXT,
  primary_color TEXT DEFAULT '#8b5cf6',
  cnpj          TEXT,
  address       TEXT,
  phone         TEXT,
  email         TEXT,
  plan          TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter','pro','enterprise')),
  plan_status   TEXT NOT NULL DEFAULT 'trial' CHECK (plan_status IN ('active','inactive','trial','suspended')),
  plan_expires_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- USERS & AUTH
-- ============================================================
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'seller' CHECK (role IN ('admin','seller','cashier')),
  avatar_url    TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, email)
);

CREATE INDEX idx_users_tenant ON users(tenant_id);

-- ============================================================
-- PRODUCTS & INVENTORY
-- ============================================================
CREATE TABLE products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sku           TEXT NOT NULL,
  barcode       TEXT,
  name          TEXT NOT NULL,
  brand         TEXT NOT NULL,
  size          TEXT NOT NULL,  -- e.g. '205/55R16'
  category      TEXT NOT NULL CHECK (category IN ('tire','rim','service','accessory')),
  description   TEXT,
  cost_price    NUMERIC(10,2) NOT NULL DEFAULT 0,
  sale_price    NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock         INTEGER NOT NULL DEFAULT 0,
  min_stock     INTEGER NOT NULL DEFAULT 0,
  supplier      TEXT,
  location      TEXT,           -- warehouse position e.g. 'A-01'
  image_url     TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, sku)
);

CREATE INDEX idx_products_tenant ON products(tenant_id);
CREATE INDEX idx_products_barcode ON products(tenant_id, barcode);
CREATE INDEX idx_products_category ON products(tenant_id, category);

-- Stock movements audit
CREATE TABLE stock_movements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id),
  type        TEXT NOT NULL CHECK (type IN ('sale','purchase','adjustment','return','loss')),
  quantity    INTEGER NOT NULL,   -- negative for outgoing
  stock_before INTEGER NOT NULL,
  stock_after  INTEGER NOT NULL,
  reference_id TEXT,             -- sale_id or purchase_order_id
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_movements_product ON stock_movements(product_id);

-- ============================================================
-- CLIENTS
-- ============================================================
CREATE TABLE clients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  document        TEXT,          -- CPF / RUT / DNI
  vehicle_plates  TEXT[] DEFAULT '{}',
  total_spent     NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_visits    INTEGER NOT NULL DEFAULT 0,
  last_visit_at   TIMESTAMPTZ,
  notes           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clients_tenant ON clients(tenant_id);
CREATE INDEX idx_clients_phone ON clients(tenant_id, phone);
CREATE INDEX idx_clients_document ON clients(tenant_id, document);

-- ============================================================
-- SALES
-- ============================================================
CREATE TABLE sales (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id       UUID REFERENCES clients(id),
  operator_id     UUID NOT NULL REFERENCES users(id),
  subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  total           NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method  TEXT NOT NULL CHECK (payment_method IN ('cash','card','transfer','pix','mixed')),
  payment_status  TEXT NOT NULL DEFAULT 'completed' CHECK (payment_status IN ('completed','pending','cancelled','refunded')),
  notes           TEXT,
  nfe_key         TEXT,         -- NF-e chave de acesso
  nfe_status      TEXT,         -- 'pending','authorized','cancelled'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sales_tenant ON sales(tenant_id);
CREATE INDEX idx_sales_client ON sales(client_id);
CREATE INDEX idx_sales_date ON sales(tenant_id, created_at DESC);

CREATE TABLE sale_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id       UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES products(id),
  product_name  TEXT NOT NULL,   -- denormalized snapshot
  product_sku   TEXT NOT NULL,
  qty           INTEGER NOT NULL,
  unit_price    NUMERIC(10,2) NOT NULL,
  discount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  total         NUMERIC(10,2) NOT NULL
);

CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);

-- ============================================================
-- SERVICES
-- ============================================================
CREATE TABLE service_orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id     UUID REFERENCES clients(id),
  operator_id   UUID REFERENCES users(id),
  vehicle_plate TEXT,
  vehicle_desc  TEXT,           -- 'Honda Civic 2020'
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','done','cancelled')),
  notes         TEXT,
  sale_id       UUID REFERENCES sales(id),
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SUBSCRIPTIONS & BILLING
-- ============================================================
CREATE TABLE subscription_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,   -- 'payment_received','plan_activated','plan_expired','plan_upgraded'
  plan        TEXT,
  amount      NUMERIC(10,2),
  payment_method TEXT,         -- 'pix','card'
  pix_txid    TEXT,
  reference   TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sub_events_tenant ON subscription_events(tenant_id, created_at DESC);

-- ============================================================
-- AUDIT LOG
-- ============================================================
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id),
  action      TEXT NOT NULL,   -- 'product.create', 'sale.delete', 'user.login'
  entity_type TEXT,
  entity_id   TEXT,
  old_value   JSONB,
  new_value   JSONB,
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_tenant ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_user ON audit_logs(user_id, created_at DESC);

-- ============================================================
-- ALERTS
-- ============================================================
CREATE TABLE alerts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('low_stock','no_stock','pending_payment','system')),
  severity    TEXT NOT NULL CHECK (severity IN ('critical','warning','info')),
  title       TEXT NOT NULL,
  message     TEXT,
  product_id  UUID REFERENCES products(id),
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_tenant ON alerts(tenant_id, is_read, created_at DESC);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all relevant tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['tenants','users','products','clients','sales','service_orders'] LOOP
    EXECUTE format('
      CREATE TRIGGER trg_%s_updated_at
      BEFORE UPDATE ON %s
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    ', tbl, tbl);
  END LOOP;
END;
$$;

-- After sale, update client totals
CREATE OR REPLACE FUNCTION update_client_after_sale()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.client_id IS NOT NULL AND NEW.payment_status = 'completed' THEN
    UPDATE clients SET
      total_spent = total_spent + NEW.total,
      total_visits = total_visits + 1,
      last_visit_at = NEW.created_at,
      updated_at = NOW()
    WHERE id = NEW.client_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sale_update_client
AFTER INSERT ON sales
FOR EACH ROW EXECUTE FUNCTION update_client_after_sale();

-- Stock alert trigger
CREATE OR REPLACE FUNCTION check_stock_alert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock = 0 THEN
    INSERT INTO alerts (tenant_id, type, severity, title, message, product_id)
    VALUES (NEW.tenant_id, 'no_stock', 'critical',
      'Sem estoque: ' || NEW.name,
      'Estoque zerado. Solicite reposição imediatamente.',
      NEW.id)
    ON CONFLICT DO NOTHING;
  ELSIF NEW.stock <= NEW.min_stock AND NEW.min_stock > 0 THEN
    INSERT INTO alerts (tenant_id, type, severity, title, message, product_id)
    VALUES (NEW.tenant_id, 'low_stock', 'warning',
      'Estoque baixo: ' || NEW.name,
      format('Restam apenas %s unidades (mínimo: %s).', NEW.stock, NEW.min_stock),
      NEW.id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_product_stock_alert
AFTER UPDATE OF stock ON products
FOR EACH ROW EXECUTE FUNCTION check_stock_alert();
