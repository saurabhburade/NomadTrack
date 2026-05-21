export const migrations = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS location_points (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        accuracy REAL NOT NULL,
        altitude REAL,
        speed REAL,
        heading REAL,
        timezone TEXT,
        country_code TEXT,
        country_name TEXT,
        region TEXT,
        city TEXT,
        source TEXT NOT NULL,
        reverse_geocode_status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_location_points_timestamp ON location_points(timestamp);
      CREATE INDEX IF NOT EXISTS idx_location_points_geocode_status ON location_points(reverse_geocode_status);

      CREATE TABLE IF NOT EXISTS day_records (
        date TEXT PRIMARY KEY,
        primary_country_code TEXT,
        primary_country_name TEXT,
        countries_visited TEXT NOT NULL DEFAULT '[]',
        is_travel_day INTEGER NOT NULL DEFAULT 0,
        is_pending_validation INTEGER NOT NULL DEFAULT 0,
        is_manual_override INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS day_country_segments (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        country_code TEXT,
        country_name TEXT,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        source TEXT NOT NULL,
        confidence REAL NOT NULL,
        is_pending_validation INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(date) REFERENCES day_records(date) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_day_segments_date ON day_country_segments(date);

      CREATE TABLE IF NOT EXISTS trips (
        id TEXT PRIMARY KEY,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        country_code TEXT NOT NULL,
        country_name TEXT NOT NULL,
        cities TEXT NOT NULL DEFAULT '[]',
        notes TEXT,
        is_ghost INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS pending_geocode_jobs (
        id TEXT PRIMARY KEY,
        location_point_id TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        timestamp TEXT NOT NULL,
        status TEXT NOT NULL,
        retry_count INTEGER NOT NULL DEFAULT 0,
        last_attempt_at TEXT,
        error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(location_point_id) REFERENCES location_points(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_geocode_jobs_status ON pending_geocode_jobs(status, retry_count);

      CREATE TABLE IF NOT EXISTS backup_metadata (
        id TEXT PRIMARY KEY,
        backup_version INTEGER NOT NULL,
        checksum TEXT NOT NULL,
        last_backup_at TEXT NOT NULL,
        drive_file_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `
  }
];
