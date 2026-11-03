-- ApartmentCare Maintenance Request Database Schema
CREATE TABLE IF NOT EXISTS maintenance_requests (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(150) NOT NULL,
    priority VARCHAR(10) NOT NULL DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_progress', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Index for faster filtering and sorting by creation date
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_created_at
ON maintenance_requests (created_at DESC);
-- Index for searching maintenance requests by status
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_status
ON maintenance_requests (status);
