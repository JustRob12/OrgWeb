-- 1. Create the Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    middle_initial TEXT,
    last_name TEXT NOT NULL,
    course TEXT,
    section TEXT,
    year TEXT,
    profile_picture TEXT -- Cloudinary Link
);

-- 2. Create the Accounts Table
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, -- NOTE: Should be hashed in production
    role INTEGER DEFAULT 1 -- 0: Admin, 1: Student
);

-- 3. Register Built-in Admin
-- First, insert the user details
WITH inserted_user AS (
    INSERT INTO users (first_name, middle_initial, last_name, course, section, year, profile_picture)
    VALUES ('Roberto Jr.', 'M.', 'Prisoris', 'BSIT', 'C', '4th', NULL)
    RETURNING id
)
-- Then, create the admin account linked to that user
INSERT INTO accounts (user_id, username, password, role)
SELECT id, 'admin', 'admin', 0 FROM inserted_user;


