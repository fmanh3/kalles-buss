#!/bin/bash
set -e

# Unset the restricted service account to force gcloud/terraform to use the logged-in owner account
unset GOOGLE_APPLICATION_CREDENTIALS

PROJECT_ID="joakim-hansson-lab"
TAG=$(date +%Y%m%d%H%M%S)

echo "Building and pushing all Docker images to Artifact Registry..."
gcloud builds submit --config cloudbuild.yaml --substitutions=_IMAGE_TAG=${TAG} --project=$PROJECT_ID

echo "Replacing image tags in Terraform code to use the newly built images..."
sed -i '' "s/image = \".*\"/image = \"europe-west1-docker.pkg.dev\/$PROJECT_ID\/cloud-run-source-deploy\/kalles-finance:${TAG}\"/g" infrastructure/gcp/cloudrun.tf
sed -i '' "0,/image = \".*\"/s//image = \"europe-west1-docker.pkg.dev\/$PROJECT_ID\/cloud-run-source-deploy\/kalles-finance:${TAG}\"/" infrastructure/gcp/cloudrun.tf
# A simpler approach using awk for each specific service block to update the image tag:
awk -v tag="${TAG}" '/resource "google_cloud_run_service" "finance"/ {f=1} f && /image =/ {sub(/image = ".+"/, "image = \"europe-west1-docker.pkg.dev/joakim-hansson-lab/cloud-run-source-deploy/kalles-finance:" tag "\""); f=0} 1' infrastructure/gcp/cloudrun.tf > temp.tf && mv temp.tf infrastructure/gcp/cloudrun.tf
awk -v tag="${TAG}" '/resource "google_cloud_run_service" "hr"/ {f=1} f && /image =/ {sub(/image = ".+"/, "image = \"europe-west1-docker.pkg.dev/joakim-hansson-lab/cloud-run-source-deploy/kalles-hr:" tag "\""); f=0} 1' infrastructure/gcp/cloudrun.tf > temp.tf && mv temp.tf infrastructure/gcp/cloudrun.tf
awk -v tag="${TAG}" '/resource "google_cloud_run_service" "traffic"/ {f=1} f && /image =/ {sub(/image = ".+"/, "image = \"europe-west1-docker.pkg.dev/joakim-hansson-lab/cloud-run-source-deploy/kalles-traffic:" tag "\""); f=0} 1' infrastructure/gcp/cloudrun.tf > temp.tf && mv temp.tf infrastructure/gcp/cloudrun.tf
awk -v tag="${TAG}" '/resource "google_cloud_run_service" "energy"/ {f=1} f && /image =/ {sub(/image = ".+"/, "image = \"europe-west1-docker.pkg.dev/joakim-hansson-lab/cloud-run-source-deploy/kalles-energy-depot:" tag "\""); f=0} 1' infrastructure/gcp/cloudrun.tf > temp.tf && mv temp.tf infrastructure/gcp/cloudrun.tf
awk -v tag="${TAG}" '/resource "google_cloud_run_service" "bff"/ {f=1} f && /image =/ {sub(/image = ".+"/, "image = \"europe-west1-docker.pkg.dev/joakim-hansson-lab/cloud-run-source-deploy/kalles-bff:" tag "\""); f=0} 1' infrastructure/gcp/cloudrun.tf > temp.tf && mv temp.tf infrastructure/gcp/cloudrun.tf
awk -v tag="${TAG}" '/resource "google_cloud_run_service" "portal"/ {f=1} f && /image =/ {sub(/image = ".+"/, "image = \"europe-west1-docker.pkg.dev/joakim-hansson-lab/cloud-run-source-deploy/kalles-portal:" tag "\""); f=0} 1' infrastructure/gcp/cloudrun.tf > temp.tf && mv temp.tf infrastructure/gcp/cloudrun.tf
awk -v tag="${TAG}" '/resource "google_cloud_run_service" "simulation_control"/ {f=1} f && /image =/ {sub(/image = ".+"/, "image = \"europe-west1-docker.pkg.dev/joakim-hansson-lab/cloud-run-source-deploy/kalles-simulation-control:" tag "\""); f=0} 1' infrastructure/gcp/cloudrun.tf > temp.tf && mv temp.tf infrastructure/gcp/cloudrun.tf
awk -v tag="${TAG}" '/resource "google_cloud_run_service" "adapters"/ {f=1} f && /image =/ {sub(/image = ".+"/, "image = \"europe-west1-docker.pkg.dev/joakim-hansson-lab/cloud-run-source-deploy/kalles-adapters:" tag "\""); f=0} 1' infrastructure/gcp/cloudrun.tf > temp.tf && mv temp.tf infrastructure/gcp/cloudrun.tf
awk -v tag="${TAG}" '/resource "google_cloud_run_service" "simulation"/ {f=1} f && /image =/ {sub(/image = ".+"/, "image = \"europe-west1-docker.pkg.dev/joakim-hansson-lab/cloud-run-source-deploy/kalles-simulation-engine:" tag "\""); f=0} 1' infrastructure/gcp/cloudrun.tf > temp.tf && mv temp.tf infrastructure/gcp/cloudrun.tf


echo "Applying Terraform to roll out the new images and missing databases..."
cd infrastructure/gcp
terraform init
unset GOOGLE_APPLICATION_CREDENTIALS
terraform apply -auto-approve
cd ../..

echo "All backend deployments completed successfully!"
