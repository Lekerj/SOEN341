-- organizer_requests.sql
-- Tracks organizer requests to join or create organizations, supports history and modification

CREATE TABLE IF NOT EXISTS organizer_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    organization_id INT NULL,
    request_type ENUM('join', 'create') NOT NULL,
    status ENUM('pending', 'refused', 'approved') NOT NULL DEFAULT 'pending',
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_organization_id (organization_id),
    INDEX idx_status (status),
    
    CONSTRAINT fk_organizer_requests_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_organizer_requests_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
