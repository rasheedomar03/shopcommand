-- Invites table for owner-to-team member invitations
CREATE TABLE IF NOT EXISTS invites (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  shop_id     UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  role        user_role NOT NULL,
  email       TEXT,
  code        TEXT NOT NULL UNIQUE,
  used_by     UUID REFERENCES users(id),
  created_by  UUID NOT NULL REFERENCES users(id),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invites_code ON invites(code);
CREATE INDEX idx_invites_org ON invites(org_id);

-- RLS
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY invites_read ON invites
  FOR SELECT USING (org_id = current_org_id());

CREATE POLICY invites_insert ON invites
  FOR INSERT WITH CHECK (
    org_id = current_org_id()
    AND current_user_role() = 'owner'
  );

CREATE POLICY invites_update ON invites
  FOR UPDATE USING (org_id = current_org_id());
