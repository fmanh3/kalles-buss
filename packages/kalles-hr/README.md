# Kalles Buss: HR Domain (`kalles-hr`)

## Overview
This repository contains the Human Resources and Workforce Management domain for Kalles Buss. In a "Transport-as-Code" architecture, HR is a safety-critical operational engine.

### Subdomains Handled Here:
1. **Core HR:** The system of record for employee compliance (YKB, Driver's Licenses, Medical clearances). Acts as the legal gatekeeper.
2. **Workforce Planning:** The constraint-satisfaction engine that generates driver rosters according to *Bussbranschavtalet* and EU 561/2006.
3. **Driver Operations:** Real-time management of sick calls, shift execution, and integration with the edge devices on the buses.

## Development Guide

### Prerequisites
* Python 3.11+
* `uv` or `poetry` for dependency management
* Google Cloud SDK (for Pub/Sub emulation)

### Local Setup
*(To be populated: Instructions on how to install dependencies, e.g., `uv sync`)*

### Testing
*(To be populated: Instructions on running `pytest` and local GCP emulators)*

### Deployment
*(To be populated: Terraform / Cloud Run CI/CD instructions)*
