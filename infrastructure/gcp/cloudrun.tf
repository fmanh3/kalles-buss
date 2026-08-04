# --- CLOUD RUN SERVICES ---

resource "google_cloud_run_service" "finance" {
  name     = "kalles-finance"
  location = var.region

  template {
    spec {
      containers {
        image = "europe-west1-docker.pkg.dev/joakim-hansson-lab/cloud-run-source-deploy/kalles-finance:20260702103938"
        env {
          name  = "DB_USER"
          value = "postgres"
        }
        env {
          name  = "DB_PASSWORD"
          value = "postgres_prod_password"
        }
        env {
          name  = "DB_NAME"
          value = "kalles-finance"
        }
        env {
          name  = "CLOUD_SQL_CONNECTION_NAME"
          value = google_sql_database_instance.shared_db.connection_name
        }
        env {
          name  = "NODE_ENV"
          value = "production"
        }
      }
    }

    metadata {
      annotations = {
        "run.googleapis.com/cloudsql-instances" = google_sql_database_instance.shared_db.connection_name
        "run.googleapis.com/client-name"        = "terraform"
        "autoscaling.knative.dev/minScale"      = "0"
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}

resource "google_cloud_run_service" "hr" {
  name     = "kalles-hr"
  location = var.region

  template {
    spec {
      containers {
        image = "europe-west1-docker.pkg.dev/joakim-hansson-lab/cloud-run-source-deploy/kalles-hr:20260702103938"
        env {
          name  = "DB_USER"
          value = "postgres"
        }
        env {
          name  = "DB_PASSWORD"
          value = "postgres_prod_password"
        }
        env {
          name  = "DB_NAME"
          value = "kalles-hr"
        }
        env {
          name  = "CLOUD_SQL_CONNECTION_NAME"
          value = google_sql_database_instance.shared_db.connection_name
        }
        env {
          name  = "NODE_ENV"
          value = "production"
        }
      }
    }

    metadata {
      annotations = {
        "run.googleapis.com/cloudsql-instances" = google_sql_database_instance.shared_db.connection_name
        "run.googleapis.com/client-name"        = "terraform"
        "autoscaling.knative.dev/minScale"      = "0"
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}

resource "google_cloud_run_service" "traffic" {
  name     = "kalles-traffic"
  location = var.region

  template {
    spec {
      containers {
        image = "europe-west1-docker.pkg.dev/joakim-hansson-lab/cloud-run-source-deploy/kalles-traffic:20260702103938"
        env {
          name  = "DB_USER"
          value = "postgres"
        }
        env {
          name  = "DB_PASSWORD"
          value = "postgres_prod_password"
        }
        env {
          name  = "DB_NAME"
          value = "kalles-traffic"
        }
        env {
          name  = "CLOUD_SQL_CONNECTION_NAME"
          value = google_sql_database_instance.shared_db.connection_name
        }
        env {
          name  = "NODE_ENV"
          value = "production"
        }
      }
    }

    metadata {
      annotations = {
        "run.googleapis.com/cloudsql-instances" = google_sql_database_instance.shared_db.connection_name
        "run.googleapis.com/client-name"        = "terraform"
        "autoscaling.knative.dev/minScale"      = "0"
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}

resource "google_cloud_run_service" "energy" {
  name     = "kalles-energy-depot"
  location = var.region

  template {
    spec {
      containers {
        image = "europe-west1-docker.pkg.dev/joakim-hansson-lab/cloud-run-source-deploy/kalles-energy-depot:20260702103938"
        env {
          name  = "DB_USER"
          value = "postgres"
        }
        env {
          name  = "DB_PASSWORD"
          value = "postgres_prod_password"
        }
        env {
          name  = "DB_NAME"
          value = "kalles-energy-depot"
        }
        env {
          name  = "CLOUD_SQL_CONNECTION_NAME"
          value = google_sql_database_instance.shared_db.connection_name
        }
        env {
          name  = "NODE_ENV"
          value = "production"
        }
      }
    }

    metadata {
      annotations = {
        "run.googleapis.com/cloudsql-instances" = google_sql_database_instance.shared_db.connection_name
        "run.googleapis.com/client-name"        = "terraform"
        "autoscaling.knative.dev/minScale"      = "0"
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}

resource "google_cloud_run_service" "bff" {
  name     = "kalles-bff"
  location = var.region

  template {
    metadata {
      annotations = {
        "autoscaling.knative.dev/minScale" = "0"
      }
    }
    spec {
      containers {
        image = "europe-west1-docker.pkg.dev/joakim-hansson-lab/cloud-run-source-deploy/kalles-bff:20260702103938"
      }
    }
  }
  traffic {
    percent         = 100
    latest_revision = true
  }
}

resource "google_cloud_run_service" "portal" {
  name     = "kalles-portal"
  location = var.region

  template {
    metadata {
      annotations = {
        "autoscaling.knative.dev/minScale" = "0"
      }
    }
    spec {
      containers {
        image = "europe-west1-docker.pkg.dev/joakim-hansson-lab/cloud-run-source-deploy/kalles-portal:20260702103938"
      }
    }
  }
  traffic {
    percent         = 100
    latest_revision = true
  }
}

resource "google_cloud_run_service" "simulation_control" {
  name     = "kalles-simulation-control"
  location = var.region

  template {
    metadata {
      annotations = {
        "autoscaling.knative.dev/minScale" = "0"
      }
    }
    spec {
      containers {
        image = "europe-west1-docker.pkg.dev/joakim-hansson-lab/cloud-run-source-deploy/kalles-simulation-control:20260702103938"
        env {
          name  = "VITE_PORTAL_URL"
          value = "https://kalles-portal-w7fsmra4yq-ew.a.run.app"
        }
      }
    }
  }
  traffic {
    percent         = 100
    latest_revision = true
  }
}

resource "google_cloud_run_service" "adapters" {
  name     = "kalles-adapters"
  location = var.region

  template {
    metadata {
      annotations = {
        "autoscaling.knative.dev/minScale" = "0"
      }
    }
    spec {
      containers {
        image = "europe-west1-docker.pkg.dev/joakim-hansson-lab/cloud-run-source-deploy/kalles-adapters:20260702103938"
        env {
          name  = "NODE_ENV"
          value = "production"
        }
        env {
          name = "TRAFIKLAB_NETEX_KEY"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.trafiklab_netex_key.secret_id
              key  = "latest"
            }
          }
        }
        env {
          name = "TRAFIKLAB_REALTIME_KEY"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.trafiklab_realtime_key.secret_id
              key  = "latest"
            }
          }
        }
      }
    }
  }
  traffic {
    percent         = 100
    latest_revision = true
  }

  depends_on = [
    google_secret_manager_secret_iam_member.adapters_netex_secret_access,
    google_secret_manager_secret_iam_member.adapters_realtime_secret_access
  ]
}

resource "google_cloud_run_service" "simulation" {
  name     = "kalles-simulation-engine"
  location = var.region

  template {
    metadata {
      annotations = {
        "run.googleapis.com/cloudsql-instances" = google_sql_database_instance.shared_db.connection_name
        "autoscaling.knative.dev/minScale"      = "0"
      }
    }
    spec {
      timeout_seconds = 3600
      containers {
        image = "europe-west1-docker.pkg.dev/joakim-hansson-lab/cloud-run-source-deploy/kalles-simulation-engine:20260702103938"
        resources {
          limits = {
            cpu    = "2000m"
            memory = "4096Mi"
          }
        }
        env {
          name  = "NODE_ENV"
          value = "production"
        }
        env {
          name  = "DATABASE_URL"
          value = "postgresql://postgres:postgres_prod_password@localhost:5432/kalles-simulation?host=/cloudsql/${google_sql_database_instance.shared_db.connection_name}"
        }
        env {
          name  = "HR_API_URL"
          value = "https://kalles-hr-w7fsmra4yq-ew.a.run.app"
        }
        env {
          name = "TRAFIKLAB_KODA_KEY"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.trafiklab_koda_key.secret_id
              key  = "latest"
            }
          }
        }
      }
    }
  }
  traffic {
    percent         = 100
    latest_revision = true
  }

  depends_on = [
    google_secret_manager_secret_iam_member.simulation_koda_secret_access
  ]
}

# --- IAM: ALLOW UNAUTHENTICATED ACCESS ---

resource "google_cloud_run_service_iam_member" "bff_public" {
  location = google_cloud_run_service.bff.location
  service  = google_cloud_run_service.bff.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_service_iam_member" "portal_public" {
  location = google_cloud_run_service.portal.location
  service  = google_cloud_run_service.portal.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_service_iam_member" "simulation_control_public" {
  location = google_cloud_run_service.simulation_control.location
  service  = google_cloud_run_service.simulation_control.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_service_iam_member" "adapters_public" {
  location = google_cloud_run_service.adapters.location
  service  = google_cloud_run_service.adapters.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_service_iam_member" "simulation_public" {
  location = google_cloud_run_service.simulation.location
  service  = google_cloud_run_service.simulation.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_service_iam_member" "finance_public" {
  location = google_cloud_run_service.finance.location
  service  = google_cloud_run_service.finance.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_service_iam_member" "hr_public" {
  location = google_cloud_run_service.hr.location
  service  = google_cloud_run_service.hr.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_service_iam_member" "traffic_public" {
  location = google_cloud_run_service.traffic.location
  service  = google_cloud_run_service.traffic.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_service_iam_member" "energy_public" {
  location = google_cloud_run_service.energy.location
  service  = google_cloud_run_service.energy.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
