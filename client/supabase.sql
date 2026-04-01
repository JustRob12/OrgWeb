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
    profile_picture TEXT -- Cloudinary Link
);

-- 2. Create the Accounts Table
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL, -- This will store the email for login
    password TEXT NOT NULL,
    role INTEGER DEFAULT 1 -- 0: Admin, 1: Student
);

-- 3. Create the Memberships Table
CREATE TABLE IF NOT EXISTS memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('Partial', 'Fully Paid', 'Not Paid')) DEFAULT 'Not Paid',
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

