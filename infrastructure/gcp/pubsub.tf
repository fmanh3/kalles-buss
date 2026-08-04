# --- TOPICS ---

resource "google_pubsub_topic" "hr_events" {
  name = "hr-events"
  message_retention_duration = "86600s" # 24 hours
}

resource "google_pubsub_topic" "traffic_events" {
  name = "traffic-events"
  message_retention_duration = "86600s"
}

resource "google_pubsub_topic" "finance_events" {
  name = "finance-events"
  message_retention_duration = "86600s"
}

resource "google_pubsub_topic" "weather_events" {
  name = "weather-events"
  message_retention_duration = "8660s" # Weather alerts are ephemeral
}

resource "google_pubsub_topic" "telematics_events" {
  name = "telematics-events"
  message_retention_duration = "86600s" 
}

# --- SUBSCRIPTIONS ---

# HR Service listening to its own events (e.g. Guardrails)
resource "google_pubsub_subscription" "hr_guardrails_sub" {
  name  = "hr-guardrails-sub"
  topic = google_pubsub_topic.hr_events.name

  ack_deadline_seconds = 60

  expiration_policy {
    ttl = "" # Never expire
  }
}

# HR Service listening to Traffic (e.g. ShiftCompleted for Payroll)
resource "google_pubsub_subscription" "hr_traffic_listener_sub" {
  name  = "hr-traffic-listener-sub"
  topic = google_pubsub_topic.traffic_events.name

  ack_deadline_seconds = 60

  expiration_policy {
    ttl = "" 
  }
}

# Finance Service listening to HR (e.g. PayrollProvisionOrder)
resource "google_pubsub_subscription" "finance_hr_listener_sub" {
  name  = "finance-hr-listener-sub"
  topic = google_pubsub_topic.hr_events.name

  ack_deadline_seconds = 60

  expiration_policy {
    ttl = "" 
  }
}

# Traffic Service listening to Telematics
resource "google_pubsub_subscription" "traffic_telematics_internal_sub" {
  name  = "traffic-telematics-internal-sub"
  topic = google_pubsub_topic.telematics_events.name

  ack_deadline_seconds = 60

  expiration_policy {
    ttl = "" 
  }
}

# Traffic Service listening to internal traffic-events (NeTEx updates from Adapters)
resource "google_pubsub_subscription" "traffic_scheduler_internal_sub" {
  name  = "traffic-scheduler-internal-sub"
  topic = google_pubsub_topic.traffic_events.name

  ack_deadline_seconds = 60

  expiration_policy {
    ttl = "" 
  }
}

# Traffic Service listening to Weather
resource "google_pubsub_subscription" "traffic_weather_internal_sub" {
  name  = "traffic-weather-internal-sub"
  topic = google_pubsub_topic.weather_events.name

  ack_deadline_seconds = 60

  expiration_policy {
    ttl = "" 
  }
}

# Depot Service listening to Telematics
resource "google_pubsub_subscription" "depot_telematics_sub" {
  name  = "depot-telematics-sub"
  topic = google_pubsub_topic.telematics_events.name

  ack_deadline_seconds = 60

  expiration_policy {
    ttl = "" 
  }
}

# Depot Service listening to Finance optimization strategies
resource "google_pubsub_subscription" "depot_optimization_sub" {
  name  = "depot-optimization-sub"
  topic = google_pubsub_topic.finance_events.name

  ack_deadline_seconds = 60

  expiration_policy {
    ttl = "" 
  }
}

# Finance Service listening to its own events
resource "google_pubsub_subscription" "finance_internal_sub" {
  name  = "finance-internal-sub"
  topic = google_pubsub_topic.finance_events.name

  ack_deadline_seconds = 60

  expiration_policy {
    ttl = "" 
  }
}

# Finance Service listening to Traffic (Billing)
resource "google_pubsub_subscription" "finance_billing_sub" {
  name  = "finance-billing-sub"
  topic = google_pubsub_topic.traffic_events.name

  ack_deadline_seconds = 60

  expiration_policy {
    ttl = "" 
  }
}

# --- TELEMETRY SUBSCRIPTIONS (EVENT HORIZON) ---
# Used by simulation-engine to stream live events to the IDE

resource "google_pubsub_subscription" "telemetry_hr_sub" {
  name  = "telemetry-hr-sub"
  topic = google_pubsub_topic.hr_events.name
  ack_deadline_seconds = 10
  expiration_policy { ttl = "" }
}

resource "google_pubsub_subscription" "telemetry_traffic_sub" {
  name  = "telemetry-traffic-sub"
  topic = google_pubsub_topic.traffic_events.name
  ack_deadline_seconds = 10
  expiration_policy { ttl = "" }
}

resource "google_pubsub_subscription" "telemetry_finance_sub" {
  name  = "telemetry-finance-sub"
  topic = google_pubsub_topic.finance_events.name
  ack_deadline_seconds = 10
  expiration_policy { ttl = "" }
}

resource "google_pubsub_subscription" "telemetry_weather_sub" {
  name  = "telemetry-weather-sub"
  topic = google_pubsub_topic.weather_events.name
  ack_deadline_seconds = 10
  expiration_policy { ttl = "" }
}

resource "google_pubsub_subscription" "telemetry_telematics_sub" {
  name  = "telemetry-telematics-sub"
  topic = google_pubsub_topic.telematics_events.name
  ack_deadline_seconds = 10
  expiration_policy { ttl = "" }
}
