
# ============================================================================
# PAY54 ENTERPRISE — PRIVATE STAGING INFRASTRUCTURE
# File: infrastructure/staging/main.tf
# Version: 1.1.0
#
# Provisioning is disabled by default.
# CI performs static validation only.
# No customer data, payment execution or external news provider activation.
# ============================================================================

terraform {
  required_version = ">= 1.14.0, < 2.0.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 7.0"
    }
  }
}

variable "project_id" {
  description = "Existing, separately approved Google Cloud staging project ID."
  type        = string
  default     = null
  nullable    = true
}

variable "project_number" {
  description = "Numeric ID of the approved Google Cloud staging project."
  type        = string
  default     = null
  nullable    = true
}

variable "github_repository_id" {
  description = "Actual immutable GitHub repository ID."
  type        = string
  default     = null
  nullable    = true
}

variable "github_owner_id" {
  description = "Actual immutable GitHub repository owner ID."
  type        = string
  default     = null
  nullable    = true
}

variable "container_image" {
  description = "Approved image in PAY54 Artifact Registry, referenced by SHA-256 digest."
  type        = string
  default     = null
  nullable    = true
}

variable "staging_subnet_cidr" {
  description = "Approved non-overlapping private CIDR for the staging Direct VPC egress subnet. Required only for separately authorised provisioning."
  type        = string
  default     = null
  nullable    = true

  validation {
    condition = var.staging_subnet_cidr == null ? true : (
      can(cidrnetmask(var.staging_subnet_cidr)) &&
      can(regex("^(10[.]|172[.](1[6-9]|2[0-9]|3[01])[.]|192[.]168[.])", var.staging_subnet_cidr)) &&
      can(regex("/2[4-6]$", var.staging_subnet_cidr)) &&
      try(cidrhost(var.staging_subnet_cidr, 0) == split("/", var.staging_subnet_cidr)[0], false)
    )
    error_message = "The staging subnet must be a canonical RFC1918 IPv4 network, sized /24 to /26, with independent IPAM approval."
  }
}

variable "authorized_provisioning" {
  description = "Explicit separate provisioning authorisation. Never enabled by CI."
  type        = bool
  default     = false
}

provider "google" {
  project = var.project_id
  region  = "europe-west2"
}

locals {
  enabled = var.authorized_provisioning

  region     = "europe-west2"
  service    = "pay54-news-staging"
  repository = "pay54-staging-images"

  github_owner = "demiladeolawoye"

  github_repository = "demiladeolawoye/PAY54_v8.0_SmartWallet"

  github_branch = "refs/heads/project-titan"

  github_environment = "pay54-staging"

  github_workflow = "${local.github_repository}/.github/workflows/pay54-staging-deploy.yml@${local.github_branch}"

  required_apis = toset([
    "artifactregistry.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "run.googleapis.com",
    "sts.googleapis.com"
  ])

  identity_condition = join(" && ", [
    "assertion.repository_id == '${var.github_repository_id}'",
    "assertion.repository_owner_id == '${var.github_owner_id}'",
    "assertion.repository == '${local.github_repository}'",
    "assertion.repository_owner == '${local.github_owner}'",
    "assertion.ref == '${local.github_branch}'",
    "assertion.environment == '${local.github_environment}'",
    "assertion.event_name == 'workflow_dispatch'",
    "assertion.workflow_ref == '${local.github_workflow}'"
  ])
}

resource "terraform_data" "provisioning_authorisation" {
  count = local.enabled ? 1 : 0

  input = "PAY54_STAGING_EXPLICIT_PROVISIONING"

  lifecycle {
    precondition {
      condition = (
        var.project_id != null &&
        var.project_number != null &&
        var.github_repository_id != null &&
        var.github_owner_id != null &&
        var.container_image != null &&
        var.staging_subnet_cidr != null
      )
      error_message = "PAY54 staging provisioning requires verified identity, image, project and approved network CIDR inputs."
    }

    precondition {
      condition = (
        can(regex("^[a-z][a-z0-9-]{4,28}[a-z0-9]$", coalesce(var.project_id, "invalid"))) &&
        can(regex("^[1-9][0-9]*$", coalesce(var.project_number, "invalid"))) &&
        can(regex("^[1-9][0-9]*$", coalesce(var.github_repository_id, "invalid"))) &&
        can(regex("^[1-9][0-9]*$", coalesce(var.github_owner_id, "invalid")))
      )
      error_message = "PAY54 staging infrastructure identifiers are missing or malformed."
    }

    precondition {
      condition = can(regex(
        "^europe-west2-docker[.]pkg[.]dev/${coalesce(var.project_id, "invalid")}/pay54-staging-images/[a-z0-9._/-]+@sha256:[a-f0-9]{64}$",
        coalesce(var.container_image, "invalid")
      ))
      error_message = "PAY54 requires an approved regional Artifact Registry image pinned to a SHA-256 digest."
    }
  }
}

resource "google_project_service" "required" {
  for_each = local.enabled ? local.required_apis : toset([])

  project            = var.project_id
  service            = each.key
  disable_on_destroy = false

  depends_on = [
    terraform_data.provisioning_authorisation
  ]
}

resource "google_service_account" "deployer" {
  count = local.enabled ? 1 : 0

  project      = var.project_id
  account_id   = "pay54-staging-deployer"
  display_name = "PAY54 Staging Deployer"

  depends_on = [
    google_project_service.required
  ]
}

resource "google_service_account" "runtime" {
  count = local.enabled ? 1 : 0

  project      = var.project_id
  account_id   = "pay54-staging-runtime"
  display_name = "PAY54 News Staging Runtime"

  depends_on = [
    google_project_service.required
  ]
}

resource "google_artifact_registry_repository" "images" {
  count = local.enabled ? 1 : 0

  project       = var.project_id
  location      = local.region
  repository_id = local.repository
  description   = "Private PAY54 staging container images"
  format        = "DOCKER"

  cleanup_policy_dry_run = true

  depends_on = [
    google_project_service.required
  ]
}

resource "google_iam_workload_identity_pool" "github" {
  count = local.enabled ? 1 : 0

  project                   = var.project_id
  workload_identity_pool_id = "pay54-staging-github"
  display_name              = "PAY54 Staging GitHub"
  description               = "Restricted GitHub Actions staging identity"

  depends_on = [
    google_project_service.required
  ]
}

resource "google_iam_workload_identity_pool_provider" "github" {
  count = local.enabled ? 1 : 0

  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github[0].workload_identity_pool_id
  workload_identity_pool_provider_id = "pay54-staging-provider"
  display_name                       = "PAY54 GitHub Staging"

  # A separate future release must explicitly approve activation.
  disabled = true

  attribute_mapping = {
    "google.subject"                = "assertion.sub"
    "attribute.repository_id"       = "assertion.repository_id"
    "attribute.repository_owner_id" = "assertion.repository_owner_id"
    "attribute.ref"                 = "assertion.ref"
    "attribute.environment"         = "assertion.environment"
  }

  attribute_condition = local.identity_condition

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account_iam_member" "github_impersonation" {
  count = local.enabled ? 1 : 0

  service_account_id = google_service_account.deployer[0].name
  role               = "roles/iam.workloadIdentityUser"

  member = "principalSet://iam.googleapis.com/projects/${var.project_number}/locations/global/workloadIdentityPools/${google_iam_workload_identity_pool.github[0].workload_identity_pool_id}/attribute.repository_id/${var.github_repository_id}"

  depends_on = [
    google_iam_workload_identity_pool_provider.github
  ]
}

resource "google_artifact_registry_repository_iam_member" "deployer_image_reader" {
  count = local.enabled ? 1 : 0

  project    = var.project_id
  location   = local.region
  repository = google_artifact_registry_repository.images[0].name
  role       = "roles/artifactregistry.reader"
  member     = "serviceAccount:${google_service_account.deployer[0].email}"
}

# STG-05 source-only network foundation.
# All resources remain disabled unless independently authorised provisioning is enabled.
# compute.googleapis.com is intentionally NOT added to the automatic API activation list.
# Before any provisioning: inventory existing networks, approve non-overlapping CIDR,
# cost, effective firewall precedence, required platform routes and Compute API access.
resource "google_compute_network" "staging" {
  count = local.enabled ? 1 : 0

  project                 = var.project_id
  name                    = "pay54-staging-private"
  auto_create_subnetworks = false
  routing_mode            = "REGIONAL"

  depends_on = [
    terraform_data.provisioning_authorisation
  ]
}

resource "google_compute_subnetwork" "staging" {
  count = local.enabled ? 1 : 0

  project       = var.project_id
  name          = "pay54-staging-egress-london"
  region        = local.region
  network       = google_compute_network.staging[0].id
  ip_cidr_range = var.staging_subnet_cidr

  log_config {
    aggregation_interval = "INTERVAL_10_MIN"
    flow_sampling        = 0.5
    metadata             = "EXCLUDE_ALL_METADATA"
  }
}

# Denies internet and private-network IPv4 egress for tagged Cloud Run instances.
# Effective hierarchical firewall policy, special Google platform paths and IPv6
# must still be independently evaluated; this rule is not runtime attestation.
resource "google_compute_firewall" "egress_deny" {
  count = local.enabled ? 1 : 0

  project            = var.project_id
  name               = "pay54-staging-deny-outbound"
  network            = google_compute_network.staging[0].name
  direction          = "EGRESS"
  priority           = 1000
  target_tags        = ["pay54-staging-egress"]
  destination_ranges = ["0.0.0.0/0"]

  deny {
    protocol = "all"
  }

  log_config {
    metadata = "EXCLUDE_ALL_METADATA"
  }
}

resource "google_cloud_run_v2_service" "news_staging" {
  count = local.enabled ? 1 : 0

  project  = var.project_id
  location = local.region
  name     = local.service

  ingress              = "INGRESS_TRAFFIC_INTERNAL_ONLY"
  invoker_iam_disabled = false
  deletion_protection  = true

  scaling {
    min_instance_count = 0
    max_instance_count = 1
  }

  template {
    service_account = google_service_account.runtime[0].email

    vpc_access {
      egress = "ALL_TRAFFIC"

      network_interfaces {
        network    = google_compute_network.staging[0].id
        subnetwork = google_compute_subnetwork.staging[0].id
        tags       = ["pay54-staging-egress"]
      }
    }

    containers {
      image = var.container_image

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
    }
  }

  depends_on = [
    google_project_service.required,
    google_artifact_registry_repository.images,
    google_compute_firewall.egress_deny
  ]
}

resource "google_cloud_run_v2_service_iam_member" "deployer_service" {
  count = local.enabled ? 1 : 0

  project  = var.project_id
  location = local.region
  name     = google_cloud_run_v2_service.news_staging[0].name
  role     = "roles/run.developer"
  member   = "serviceAccount:${google_service_account.deployer[0].email}"
}

resource "google_service_account_iam_member" "deployer_runtime_user" {
  count = local.enabled ? 1 : 0

  service_account_id = google_service_account.runtime[0].name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.deployer[0].email}"
}

output "provisioning_enabled" {
  value = local.enabled
}

output "staging_region" {
  value = local.region
}

output "staging_service" {
  value = local.service
}

output "identity_provider_activation" {
  value = "DISABLED_PENDING_SEPARATE_APPROVAL"
}

output "execution_mode" {
  value = "PLAN_ONLY_NO_CI_DEPLOYMENT"
}
