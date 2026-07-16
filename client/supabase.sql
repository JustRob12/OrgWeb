-- 0. Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create the Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    middle_initial TEXT,
    last_name TEXT NOT NULL,
    student_id TEXT UNIQUE,
    email TEXT UNIQUE,
    course TEXT,
    section TEXT,
    year TEXT,
    profile_picture TEXT, -- Cloudinary Link
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create the Accounts Table
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL, -- This will store the email for login
    password TEXT NOT NULL,
    role INTEGER DEFAULT 1, -- 0: Admin, 1: Student
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create the Memberships Table
CREATE TABLE IF NOT EXISTS memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('Partial', 'Fully Paid', 'Not Paid', 'Half Semester Paid')) DEFAULT 'Not Paid',
    payment NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Register Built-in Admin
-- First, insert the user details
WITH inserted_user AS (
    INSERT INTO users (first_name, middle_initial, last_name, email, course, section, year, profile_picture)
    VALUES ('Roberto Jr.', 'M.', 'Prisoris', 'admin@orgweb.com', 'BSIT', 'C', '4th', NULL)
    ON CONFLICT (email) DO NOTHING
    RETURNING id
)
-- Then, create the admin account linked to that user
INSERT INTO accounts (user_id, username, password, role)
SELECT id, 'admin', 'admin', 0 FROM inserted_user
ON CONFLICT (username) DO NOTHING;

-- 5. Enable Encryption Extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 6. Trigger to auto-hash passwords before save
CREATE OR REPLACE FUNCTION handle_password_hashing()
RETURNS TRIGGER AS $$
BEGIN
    -- Only hash if the password has changed or is new
    IF NEW.password IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.password <> OLD.password) THEN
        NEW.password := crypt(NEW.password, gen_salt('bf', 10));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_hash_passwords
BEFORE INSERT OR UPDATE ON accounts
FOR EACH ROW EXECUTE FUNCTION handle_password_hashing();

-- 7. Secure Login RPC Function
-- This allows the frontend to verify a password without ever seeing the hash.
CREATE OR REPLACE FUNCTION verify_user(u_name text, u_pass text)
RETURNS TABLE (
    user_id uuid,
    username text,
    role integer,
    first_name text,
    last_name text,
    email text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.user_id, a.username, a.role, u.first_name, u.last_name, u.email
    FROM accounts a
    JOIN users u ON a.user_id = u.id
    WHERE (a.username = u_name OR u.email = u_name)
      AND a.password = crypt(u_pass, a.password);
END;
$$ LANGUAGE plpgsql STABLE;

-- 8. Create the Send Credentials Tracking Table
CREATE TABLE IF NOT EXISTS send_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'Sent'
);

-- 9. Create the Events Table
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    active INTEGER DEFAULT 1, -- 1 for active, 0 for inactive
    image_url TEXT, -- Cloudinary link
    location TEXT, -- Event location details
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Create Finance Items Table
CREATE TABLE IF NOT EXISTS finance_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    amount NUMERIC DEFAULT 0,
    deadline DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Create Finance Transactions Table
CREATE TABLE IF NOT EXISTS finance_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    finance_id UUID REFERENCES finance_items(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    receipt_number TEXT,
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS (Public access for this development phase)
ALTER TABLE finance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public items access" ON finance_items FOR ALL USING (true) WITH CHECK (true);
GRANT SELECT ON finance_items TO anon, authenticated;
GRANT SELECT ON finance_transactions TO anon, authenticated;

-- 13. Create Finance Audit View (for flat searching)
CREATE OR REPLACE VIEW finance_audit_view AS
SELECT 
    ft.id,
    ft.amount,
    ft.receipt_number,
    ft.transaction_date,
    ft.finance_id,
    u.student_id,
    u.first_name,
    u.last_name,
    fi.title AS item_title
FROM finance_transactions ft
JOIN users u ON ft.user_id = u.id
JOIN finance_items fi ON ft.finance_id = fi.id;

GRANT SELECT ON finance_audit_view TO anon, authenticated, service_role;

-- 14. Create Document Folders Table
CREATE TABLE IF NOT EXISTS document_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    parent_folder_id UUID REFERENCES document_folders(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. Create Documents Table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id UUID REFERENCES document_folders(id) ON DELETE CASCADE,
    drive_file_id TEXT NOT NULL,
    name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    web_view_link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. Create the Polls Table
CREATE TABLE IF NOT EXISTS polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    is_anonymous BOOLEAN DEFAULT TRUE,
    status TEXT CHECK (status IN ('draft', 'active', 'completed')) DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 17. Create the Poll Questions Table (Positions)
CREATE TABLE IF NOT EXISTS poll_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    max_selections INTEGER DEFAULT 1,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 18. Create the Poll Options Table (Candidates)
CREATE TABLE IF NOT EXISTS poll_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES poll_questions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    details TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 19. Create the Ballots Table (Voter Tracking)
CREATE TABLE IF NOT EXISTS ballots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_poll UNIQUE (user_id, poll_id)
);

-- 20. Create the Votes Table (Anonymous Tallying)
CREATE TABLE IF NOT EXISTS votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
    question_id UUID REFERENCES poll_questions(id) ON DELETE CASCADE,
    option_id UUID REFERENCES poll_options(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS (Public access for this development phase)
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE ballots ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public polls access" ON polls FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public poll_questions access" ON poll_questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public poll_options access" ON poll_options FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public ballots access" ON ballots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public votes access" ON votes FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON polls TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON poll_questions TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON poll_options TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ballots TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON votes TO anon, authenticated, service_role;

-- 21. Create cast_ballot Stored Procedure
CREATE OR REPLACE FUNCTION cast_ballot(
    p_poll_id UUID,
    p_user_id UUID,
    p_selections JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
    v_has_voted BOOLEAN;
    v_selection RECORD;
    v_poll_status TEXT;
    v_start_time TIMESTAMP WITH TIME ZONE;
    v_end_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- 1. Fetch poll status and times
    SELECT status, start_time, end_time INTO v_poll_status, v_start_time, v_end_time
    FROM polls
    WHERE id = p_poll_id;

    -- 2. Validate that the poll is currently active and within schedule
    IF v_poll_status IS NULL OR v_poll_status != 'active' THEN
        RAISE EXCEPTION 'This poll is not currently active.';
    END IF;

    IF NOW() < v_start_time THEN
        RAISE EXCEPTION 'This poll has not started yet.';
    END IF;

    IF NOW() > v_end_time THEN
        RAISE EXCEPTION 'This poll has ended (deadline reached).';
    END IF;

    -- 3. Check if user already voted
    SELECT EXISTS (
        SELECT 1 FROM ballots 
        WHERE user_id = p_user_id AND poll_id = p_poll_id
    ) INTO v_has_voted;

    IF v_has_voted THEN
        -- Allow changing vote: delete previous vote records for this user & poll
        DELETE FROM votes 
        WHERE user_id = p_user_id AND poll_id = p_poll_id;
        
        -- Update the ballot timestamp
        UPDATE ballots 
        SET created_at = CURRENT_TIMESTAMP 
        WHERE user_id = p_user_id AND poll_id = p_poll_id;
    ELSE
        -- First time voting: insert a ballot record
        INSERT INTO ballots (user_id, poll_id)
        VALUES (p_user_id, p_poll_id);
    END IF;

    -- 4. Insert selections (we store user_id to allow vote changes)
    FOR v_selection IN 
        SELECT * FROM jsonb_to_recordset(p_selections) 
        AS x(question_id UUID, option_id UUID)
    LOOP
        INSERT INTO votes (poll_id, question_id, option_id, user_id)
        VALUES (p_poll_id, v_selection.question_id, v_selection.option_id, p_user_id);
    END LOOP;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 22. Add category column to polls table
ALTER TABLE polls ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('standard', 'visual', 'pageant')) DEFAULT 'standard';


