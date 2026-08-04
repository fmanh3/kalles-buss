resource "random_id" "db_suffix" {
  byte_length = 4
}

# --- SHARED CLOUD SQL INSTANCE (Cost Optimization) ---

resource "google_sql_database_instance" "shared_db" {
  name             = "kalles-shared-db-${random_id.db_suffix.hex}"
  database_version = "POSTGRES_15"
  region           = var.region
  deletion_protection = false

  settings {
    tier = "db-f1-micro"
    ip_configuration {
      authorized_networks {
        name  = "Joakim Home"
        value = "81.233.240.78/32"
      }
    }
  }
}

# --- LOGICAL DATABASES ---

resource "google_sql_database" "finance_db_name" {
  name     = "kalles-finance"
  instance = google_sql_database_instance.shared_db.name
}

resource "google_sql_database" "hr_db_name" {
  name     = "kalles-hr"
  instance = google_sql_database_instance.shared_db.name
}

resource "google_sql_database" "traffic_db_name" {
  name     = "kalles-traffic"
  instance = google_sql_database_instance.shared_db.name
}

resource "google_sql_database" "energy_db_name" {
  name     = "kalles-energy-depot"
  instance = google_sql_database_instance.shared_db.name
}

resource "google_sql_database" "simulation_db_name" {
  name     = "kalles-simulation"
  instance = google_sql_database_instance.shared_db.name
}

# --- SHARED USER ---
# Using a single shared user for simplicity in test environment
resource "google_sql_user" "postgres_user" {
  name     = "postgres"
  instance = google_sql_database_instance.shared_db.name
  password = "postgres_prod_password"
}
