# --- SECRET MANAGER ---

# 1. NeTEx Static Timetable Key
resource "google_secret_manager_secret" "trafiklab_netex_key" {
  secret_id = "trafiklab-netex-api-key"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "trafiklab_netex_key_data" {
  secret      = google_secret_manager_secret.trafiklab_netex_key.id
  secret_data = "2fd38a76c8d245568ccaed2282c7efea"
}

# 2. GTFS Realtime Key (Live Telemetry)
resource "google_secret_manager_secret" "trafiklab_realtime_key" {
  secret_id = "trafiklab-realtime-api-key"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "trafiklab_realtime_key_data" {
  secret      = google_secret_manager_secret.trafiklab_realtime_key.id
  secret_data = "f58a957010db4c4b81dd4a235cbdd7b8"
}

# 3. KoDa Historical Realtime API Key (For Backtesting in Simulator)
resource "google_secret_manager_secret" "trafiklab_koda_key" {
  secret_id = "trafiklab-koda-api-key"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "trafiklab_koda_key_data" {
  secret      = google_secret_manager_secret.trafiklab_koda_key.id
  secret_data = "pMEMGtMwEVp-qZRLs5mfDmG7bFDrUvi2Mil2Ne8XIk"
}

# --- IAM FOR SECRETS ---

# Hardcoded service account email based on project number 625737625145
locals {
  service_account_email = "625737625145-compute@developer.gserviceaccount.com"
}

resource "google_secret_manager_secret_iam_member" "adapters_netex_secret_access" {
  secret_id = google_secret_manager_secret.trafiklab_netex_key.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.service_account_email}"
}

resource "google_secret_manager_secret_iam_member" "adapters_realtime_secret_access" {
  secret_id = google_secret_manager_secret.trafiklab_realtime_key.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.service_account_email}"
}

resource "google_secret_manager_secret_iam_member" "simulation_koda_secret_access" {
  secret_id = google_secret_manager_secret.trafiklab_koda_key.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.service_account_email}"
}

# --- CLOUD SCHEDULER (CRON) ---

# Trigger NeTEx Sync every night at 02:00
resource "google_cloud_scheduler_job" "netex_nightly_sync" {
  name             = "netex-nightly-sync"
  description      = "Triggers the Adapters service to fetch NeTEx timetable from Trafiklab"
  schedule         = "0 2 * * *"
  time_zone        = "Europe/Stockholm"
  attempt_deadline = "320s"

  http_target {
    http_method = "POST"
    uri         = "${google_cloud_run_service.adapters.status[0].url}/api/adapters/netex/sync"
  }

  depends_on = [google_cloud_run_service.adapters]
}
