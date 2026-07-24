"use client";

import { useState, useCallback, useEffect, useRef, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { projectsApi } from "@/lib/api/projects";
import { configurationApi } from "@/lib/api/configuration";
import { Skeleton } from "@/components/ui/skeleton";
import { ServiceNodeDrawer, type NodeDrawerData } from "@/components/service-node-drawer";
import type { GraphNode, GraphEdge } from "@/types/graph";
import { useStore } from "@/store";
import dynamic from "next/dynamic";
import {
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  Handle,
  Position,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Trash2, Settings, Cpu, Server, Database } from "lucide-react";

const ReactFlow = dynamic(() => import("@xyflow/react").then((m) => m.ReactFlow), { ssr: false });
const Background = dynamic(() => import("@xyflow/react").then((m) => m.Background), { ssr: false });
const Controls = dynamic(() => import("@xyflow/react").then((m) => m.Controls), { ssr: false });
const MiniMap = dynamic(() => import("@xyflow/react").then((m) => m.MiniMap), { ssr: false });

// ─── DevOps Knowledge Base Builder ─────────────────────────────────────────────
function buildDrawerData(nodeId: string, label: string): NodeDrawerData {
  const name = label.toUpperCase();

  // ── ALB ──────────────────────────────────────────────────────────────────────
  if (name.includes("ALB") || name.includes("LOAD BALANCER") || name.includes("LB")) {
    return {
      serviceId: nodeId,
      name: "Application Load Balancer (ALB)",
      category: "Layer-7 Ingress Proxy",
      purpose: "High-availability Layer-7 ingress proxy distributing incoming public HTTP/HTTPS traffic across ECS container tasks with SSL termination, health-check evaluation, and WAF security inspection.",
      requirementEvidence: "High-availability public web application ingress with SSL termination and health checks",
      monthlyCost: "~$22",
      sla: "99.99%",
      rpo: "N/A",
      rto: "< 10 sec",
      scalingModel: "Auto-scales LCU capacity based on connections and throughput",
      operationalComplexity: "Medium",
      terraformResource: "aws_lb",
      complianceTags: ["SOC2", "PCI-DSS", "HIPAA"],
      chosenBecause: [
        "Native Layer-7 path and host-based routing across multiple target groups.",
        "ACM SSL Certificate integration providing zero-downtime automated certificate renewal.",
        "Multi-AZ automatic failover distributing traffic across public subnets.",
        "AWS WAF integration protecting against OWASP Top 10 web vulnerabilities at edge.",
      ],
      alternatives: [
        {
          name: "Network Load Balancer (NLB)",
          pros: ["Ultra-low latency (sub-ms)", "Handles millions RPS", "Static IP support"],
          cons: ["Layer-4 only — no HTTP path routing", "No SSL header injection or WAF"],
          whyNotChosen: "Lacks Layer-7 routing and WAF inspection required for web application ingress.",
          costDelta: "-$2/mo",
        },
        {
          name: "API Gateway",
          pros: ["Fully serverless", "Built-in rate limiting and API key management"],
          cons: ["Higher per-request cost for sustained high-volume traffic"],
          whyNotChosen: "ALB provides lower unit cost for sustained container web traffic.",
          costDelta: "+$45/mo",
        },
      ],
      tradeoffs: [
        "Requires minimum 2 public subnets across distinct Availability Zones.",
        "Base hourly cost (~$20/mo) plus LCU usage charges.",
      ],
      iamPermissions: [
        "elasticloadbalancing:DescribeLoadBalancers",
        "elasticloadbalancing:CreateLoadBalancer",
        "elasticloadbalancing:CreateTargetGroup",
        "elasticloadbalancing:CreateListener",
        "acm:ListCertificates",
        "wafv2:AssociateWebACL",
      ],
      keyMetrics: [
        "ActiveConnectionCount",
        "TargetResponseTime < 200ms",
        "HTTPCode_Target_5XX_Count = 0",
        "RequestCount per second",
        "HealthyHostCount >= 2",
      ],
      securityScore: 91,
      securityFindings: [
        { id: "alb-001", rule: "HTTPS Listener Enforced", description: "ALB configured with HTTPS listener on port 443 with ACM certificate.", status: "PASS", severity: "HIGH", framework: "CIS AWS 2.0" },
        { id: "alb-002", rule: "HTTP Redirect to HTTPS", description: "Port 80 HTTP traffic redirected to HTTPS 301 to prevent plaintext transmission.", status: "PASS", severity: "HIGH", framework: "PCI-DSS 4.2.1" },
        { id: "alb-003", rule: "WAF Web ACL Association", description: "AWS WAF Web ACL attached for OWASP Top 10 protection at edge.", status: "PASS", severity: "HIGH", framework: "OWASP Top 10" },
        { id: "alb-004", rule: "Access Logging Enabled", description: "ALB access logs not yet configured. Logs required for audit and forensics.", status: "WARN", severity: "MEDIUM", framework: "CIS AWS 2.0", remediation: "Enable ALB access logging to an S3 bucket with 90-day retention lifecycle." },
        { id: "alb-005", rule: "Deletion Protection", description: "Deletion protection not enabled — ALB can be accidentally deleted.", status: "WARN", severity: "LOW", framework: "Internal", remediation: "Set enable_deletion_protection = true in Terraform configuration." },
        { id: "alb-006", rule: "TLS 1.2+ Security Policy", description: "SSL security policy enforces TLS 1.2 minimum (ELBSecurityPolicy-TLS13-1-2-2021-06).", status: "PASS", severity: "HIGH", framework: "NIST 800-52r2" },
      ],
      costData: {
        monthlyTotal: "~$22/mo",
        annualTotal: "~$264/yr",
        pricingModel: "AWS On-Demand · us-east-1 · ALB hourly + LCU",
        breakdown: [
          { label: "ALB Hourly Charge", amount: "$16.20", unit: "730 hrs × $0.0225/hr", note: "Base infrastructure" },
          { label: "Load Balancer Capacity Units (LCU)", amount: "$5.00", unit: "~0.5 LCU avg × $0.008/LCU-hr", note: "Scales with traffic" },
          { label: "Data Transfer", amount: "$0.80", unit: "~8 GB/mo in-region", note: "First 1 GB free" },
        ],
        optimizationTips: [
          "Enable HTTP/2 to reduce LCU consumption by up to 30%.",
          "Use target group stickiness only where required — reduces rebalancing overhead.",
          "Consider WAF managed rule groups over custom rules to reduce WAF ACU costs.",
        ],
      },
      validationChecks: [
        { id: "v-alb-01", label: "Name Configured", description: "ALB resource name must be set and <= 32 chars.", status: "PASS", category: "Required" },
        { id: "v-alb-02", label: "Subnets Specified", description: "At least 2 subnets in distinct AZs must be assigned.", status: "PASS", category: "Required" },
        { id: "v-alb-03", label: "Security Groups Assigned", description: "One or more security groups must be attached to the ALB.", status: "WARN", category: "Required", fix: "Assign a security group with ingress rules for 80/443 in the Config tab." },
        { id: "v-alb-04", label: "HTTPS Listener Configured", description: "An HTTPS listener on port 443 with an ACM certificate must exist.", status: "WARN", category: "Security", fix: "Provide an ACM Certificate ARN in the SSL Configuration section." },
        { id: "v-alb-05", label: "Environment Tag Present", description: "Resource must be tagged with Environment for cost allocation.", status: "PASS", category: "Tagging" },
        { id: "v-alb-06", label: "Access Logs Bucket Configured", description: "S3 bucket for ALB access logs should be specified.", status: "FAIL", category: "Observability", fix: "Set access_logs.bucket in the Advanced configuration visibility tier." },
      ],
      terraformPreview: `resource "aws_lb" "main" {
  name               = "dopa-app-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = true
  enable_http2               = true

  access_logs {
    bucket  = aws_s3_bucket.alb_logs.bucket
    prefix  = "alb"
    enabled = true
  }

  tags = {
    Name        = "dopa-app-alb"
    Environment = "production"
    ManagedBy   = "DOPA-Terraform"
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.acm_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}`,
    };
  }

  // ── S3 ────────────────────────────────────────────────────────────────────────
  if (name.includes("S3") || name.includes("BUCKET") || name.includes("STORAGE")) {
    return {
      serviceId: nodeId,
      name: "Amazon S3 Bucket",
      category: "Object Storage",
      purpose: "Highly durable 11-9s object storage for static website assets, user upload media, and database backups with KMS encryption and lifecycle rules.",
      requirementEvidence: "Secure, encrypted object storage for web assets and automated database backups",
      monthlyCost: "~$5",
      sla: "99.99%",
      rpo: "0 min",
      rto: "< 1 sec",
      scalingModel: "Virtually unlimited storage, scales automatically with request volume",
      operationalComplexity: "Low",
      terraformResource: "aws_s3_bucket",
      complianceTags: ["SOC2", "PCI-DSS", "HIPAA", "GDPR"],
      chosenBecause: [
        "11 9s (99.999999999%) data durability across multiple physical data centers.",
        "Server-Side Encryption with KMS (SSE-KMS) enforcing zero unencrypted object uploads.",
        "S3 Block Public Access shield preventing accidental public data leaks.",
        "Lifecycle rules automatically transitioning older backups to Glacier for 80% cost savings.",
      ],
      alternatives: [
        {
          name: "EFS (Elastic File System)",
          pros: ["Shared POSIX filesystem mounted across EC2/ECS tasks"],
          cons: ["10x higher storage cost ($0.30/GB vs $0.023/GB for S3)"],
          whyNotChosen: "S3 object storage is significantly cheaper and better suited for static media assets.",
          costDelta: "+$40/mo",
        },
      ],
      tradeoffs: [
        "Eventual consistency for bucket deletion operations.",
        "KMS API request charges apply for high-frequency object access.",
      ],
      iamPermissions: ["s3:PutObject", "s3:GetObject", "s3:ListBucket", "s3:DeleteObject", "kms:GenerateDataKey"],
      keyMetrics: ["BucketSizeBytes", "NumberOfObjects", "4xxErrorsCount = 0", "AllRequests/sec"],
      securityScore: 96,
      securityFindings: [
        { id: "s3-001", rule: "Block Public Access Enabled", description: "All four S3 Block Public Access settings enabled — prevents public ACLs and bucket policies.", status: "PASS", severity: "CRITICAL", framework: "CIS AWS 2.0 §2.1.2" },
        { id: "s3-002", rule: "SSE-KMS Encryption", description: "Server-side encryption with customer-managed KMS key enforced for all objects.", status: "PASS", severity: "HIGH", framework: "PCI-DSS 3.4" },
        { id: "s3-003", rule: "Versioning Enabled", description: "S3 versioning enabled to protect against accidental object deletion.", status: "PASS", severity: "MEDIUM", framework: "CIS AWS 2.0 §2.1.3" },
        { id: "s3-004", rule: "MFA Delete Enabled", description: "MFA Delete not enabled. Versioned bucket objects can be permanently deleted without MFA.", status: "WARN", severity: "MEDIUM", framework: "CIS AWS 2.0", remediation: "Enable MFA Delete: aws s3api put-bucket-versioning --mfa-delete Enabled" },
        { id: "s3-005", rule: "Access Logging Configured", description: "S3 server access logging enabled to audit all bucket requests.", status: "PASS", severity: "MEDIUM", framework: "SOC2 CC6.1" },
      ],
      costData: {
        monthlyTotal: "~$5/mo",
        annualTotal: "~$60/yr",
        pricingModel: "AWS S3 Standard + Glacier IR · us-east-1",
        breakdown: [
          { label: "S3 Standard Storage", amount: "$2.30", unit: "~100 GB × $0.023/GB", note: "Active media assets" },
          { label: "S3 Glacier Instant Retrieval", amount: "$0.40", unit: "~100 GB × $0.004/GB", note: "Archived DB backups" },
          { label: "PUT/GET Requests", amount: "$0.50", unit: "~5,000 PUTs × $0.005/1000", note: "" },
          { label: "Data Transfer Out", amount: "$0.90", unit: "~9 GB × $0.09/GB", note: "After 1 GB free" },
          { label: "KMS API Requests", amount: "$0.30", unit: "~3,000 GenerateDataKey calls", note: "Per-object encryption" },
        ],
        optimizationTips: [
          "Use S3 Intelligent-Tiering for mixed-access objects to automatically reduce costs by up to 40%.",
          "Implement lifecycle rules to transition objects older than 90 days to Glacier — saves ~$1.90/GB/mo.",
          "Enable S3 Transfer Acceleration only for cross-region uploads from remote offices.",
        ],
      },
      validationChecks: [
        { id: "v-s3-01", label: "Bucket Name Unique", description: "Bucket name must be globally unique and DNS-compliant.", status: "PASS", category: "Required" },
        { id: "v-s3-02", label: "Block Public Access", description: "All Block Public Access settings must be enabled.", status: "PASS", category: "Security" },
        { id: "v-s3-03", label: "KMS Encryption", description: "Default SSE-KMS encryption rule must be configured.", status: "PASS", category: "Security" },
        { id: "v-s3-04", label: "Lifecycle Rules", description: "At least one lifecycle rule transitioning to Glacier should be configured.", status: "WARN", category: "Cost", fix: "Add lifecycle rule in Advanced config to transition objects after 90 days to Glacier IR." },
        { id: "v-s3-05", label: "Versioning Enabled", description: "Bucket versioning must be enabled for backup protection.", status: "PASS", category: "Resilience" },
      ],
      terraformPreview: `resource "aws_s3_bucket" "main" {
  bucket = "dopa-app-assets-\${var.environment}"

  tags = {
    Name        = "dopa-app-assets"
    Environment = var.environment
    ManagedBy   = "DOPA-Terraform"
  }
}

resource "aws_s3_bucket_versioning" "main" {
  bucket = aws_s3_bucket.main.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "main" {
  bucket = aws_s3_bucket.main.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.s3.arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "main" {
  bucket                  = aws_s3_bucket.main.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "main" {
  bucket = aws_s3_bucket.main.id
  rule {
    id     = "archive-backups"
    status = "Enabled"
    transition {
      days          = 90
      storage_class = "GLACIER_IR"
    }
  }
}`,
    };
  }

  // ── VPC ────────────────────────────────────────────────────────────────────────
  if (name.includes("VPC") || name.includes("NETWORK")) {
    return {
      serviceId: nodeId,
      name: "Virtual Private Cloud (VPC)",
      category: "Cloud Networking",
      purpose: "Logically isolated virtual network defining private IPv4 CIDR block, public/private subnet topology, Internet Gateway, and NAT Gateway routing rules.",
      requirementEvidence: "Isolated multi-tier cloud network topology with private backend subnets",
      monthlyCost: "~$32",
      sla: "99.99%",
      rpo: "N/A",
      rto: "Instant",
      scalingModel: "Elastic IP and CIDR address space allocation",
      operationalComplexity: "Low",
      terraformResource: "aws_vpc",
      complianceTags: ["SOC2", "PCI-DSS", "HIPAA", "NIST"],
      chosenBecause: [
        "Enforces strict network isolation between public ingress and private database/compute tiers.",
        "Multi-AZ subnet distribution ensures high availability across Availability Zones.",
        "VPC Flow Logs provide complete audit telemetry of network connection attempts.",
      ],
      alternatives: [
        {
          name: "Single Public Subnet VPC",
          pros: ["Saves $32/mo NAT Gateway cost"],
          cons: ["Exposes database directly to public internet IPs"],
          whyNotChosen: "Violates fundamental cloud security guidelines.",
          costDelta: "-$32/mo",
        },
      ],
      tradeoffs: ["NAT Gateway running hourly charge (~$32/mo per AZ)."],
      iamPermissions: ["ec2:CreateVpc", "ec2:DescribeVpcs", "ec2:CreateSubnet", "ec2:CreateNatGateway", "ec2:CreateInternetGateway"],
      keyMetrics: ["VPC FlowLog Packet Drop Rate", "NAT Gateway BytesOut", "NAT Gateway ErrorPortAllocation"],
      securityScore: 88,
      securityFindings: [
        { id: "vpc-001", rule: "Flow Logs Enabled", description: "VPC Flow Logs capturing all network traffic metadata to CloudWatch Logs.", status: "PASS", severity: "HIGH", framework: "CIS AWS 2.0 §3.9" },
        { id: "vpc-002", rule: "Private Subnets for Databases", description: "RDS and ElastiCache instances deployed in private subnets with no public route.", status: "PASS", severity: "CRITICAL", framework: "PCI-DSS 1.3" },
        { id: "vpc-003", rule: "Default VPC Not Used", description: "Custom VPC used instead of AWS default VPC — default VPC has permissive NACLs.", status: "PASS", severity: "MEDIUM", framework: "CIS AWS 2.0 §5.3" },
        { id: "vpc-004", rule: "Network ACL Configuration", description: "Default NACLs allow all traffic. Restrictive rules should be applied.", status: "WARN", severity: "MEDIUM", framework: "CIS AWS 2.0", remediation: "Apply restrictive NACLs to private subnets allowing only required port ranges." },
      ],
      costData: {
        monthlyTotal: "~$32/mo",
        annualTotal: "~$384/yr",
        pricingModel: "AWS VPC · NAT Gateway per-hour + data processing · us-east-1",
        breakdown: [
          { label: "NAT Gateway Hourly", amount: "$32.85", unit: "1 NAT GW × 730 hrs × $0.045/hr", note: "Per AZ" },
          { label: "NAT Data Processing", amount: "$4.00", unit: "~40 GB × $0.045/GB", note: "Outbound traffic" },
          { label: "VPC Endpoint", amount: "$7.30", unit: "1 endpoint × 730 hrs × $0.01/hr", note: "S3 Gateway free" },
        ],
        optimizationTips: [
          "Use S3 and DynamoDB VPC Gateway Endpoints (free) to eliminate NAT data processing fees.",
          "Deploy a single NAT Gateway in dev/staging — use Multi-AZ NAT only in production.",
        ],
      },
      validationChecks: [
        { id: "v-vpc-01", label: "CIDR Block Defined", description: "VPC CIDR must be set and non-overlapping with peered networks.", status: "PASS", category: "Required" },
        { id: "v-vpc-02", label: "Public Subnets >= 2 AZs", description: "At least 2 public subnets in distinct Availability Zones.", status: "PASS", category: "Resilience" },
        { id: "v-vpc-03", label: "Private Subnets Configured", description: "Private subnets required for database and cache tiers.", status: "PASS", category: "Security" },
        { id: "v-vpc-04", label: "NAT Gateway Configured", description: "NAT Gateway required for private subnet internet egress.", status: "PASS", category: "Connectivity" },
        { id: "v-vpc-05", label: "Flow Logs Enabled", description: "VPC Flow Logs should be enabled for audit trail.", status: "WARN", category: "Observability", fix: "Enable VPC Flow Logs to CloudWatch Logs with 30-day retention in the Advanced tier." },
      ],
      terraformPreview: `resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = { Name = "dopa-vpc", ManagedBy = "DOPA-Terraform" }
}

resource "aws_subnet" "public" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  tags = { Name = "dopa-public-\${count.index}" }
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index + 10)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  tags = { Name = "dopa-private-\${count.index}" }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id
  depends_on    = [aws_internet_gateway.main]
}

resource "aws_flow_log" "main" {
  vpc_id          = aws_vpc.main.id
  traffic_type    = "ALL"
  iam_role_arn    = aws_iam_role.flow_log.arn
  log_destination = aws_cloudwatch_log_group.flow_log.arn
}`,
    };
  }

  // ── Redis ─────────────────────────────────────────────────────────────────────
  if (name.includes("REDIS") || name.includes("ELASTICACHE") || name.includes("CACHE")) {
    return {
      serviceId: nodeId,
      name: "ElastiCache Redis",
      category: "In-Memory Caching",
      purpose: "Sub-millisecond key-value store for product catalog, session tokens, and rate-limiting counters. Eliminates redundant DB reads under high-concurrency load.",
      requirementEvidence: "Prefer Redis for fast product page caching and session management",
      monthlyCost: "~$35",
      sla: "99.99%",
      rpo: "0 min",
      rto: "< 1 min",
      scalingModel: "Horizontal cluster mode with up to 500 shards, auto-scaling read replicas",
      operationalComplexity: "Medium",
      terraformResource: "aws_elasticache_replication_group",
      complianceTags: ["SOC2", "PCI-DSS", "HIPAA"],
      chosenBecause: [
        "Native data structures (sorted sets, streams) perfectly model shopping-cart and leaderboard workloads.",
        "Multi-AZ replication with automatic failover within 60 seconds.",
        "Offloads ~70% of catalog read queries from RDS, preventing connection saturation.",
        "Pub/Sub channels allow real-time inventory invalidation without polling.",
      ],
      alternatives: [
        {
          name: "Memcached",
          pros: ["Simpler architecture", "Lower memory overhead", "Multi-threaded CPU usage"],
          cons: ["No persistence — data lost on restart", "No replication or failover", "No pub/sub or sorted sets"],
          whyNotChosen: "Lacks Multi-AZ failover and persistence needed for session consistency.",
          costDelta: "-$8/mo",
        },
      ],
      tradeoffs: [
        "Cache invalidation logic adds development complexity; stale reads possible during TTL window.",
        "Multi-AZ doubles instance cost vs single-AZ deployment.",
      ],
      iamPermissions: ["elasticache:DescribeReplicationGroups", "elasticache:CreateReplicationGroup", "elasticache:ModifyReplicationGroup"],
      keyMetrics: ["CacheHitRate > 90%", "ReplicationLag < 5ms", "FreeableMemory > 20%", "CurrConnections"],
      securityScore: 87,
      securityFindings: [
        { id: "ec-001", rule: "Encryption In-Transit (TLS)", description: "TLS 1.2+ encryption enabled for all Redis client connections.", status: "PASS", severity: "HIGH", framework: "PCI-DSS 4.2.1" },
        { id: "ec-002", rule: "Encryption At-Rest", description: "Data encrypted at rest using KMS-managed keys.", status: "PASS", severity: "HIGH", framework: "SOC2 CC6.7" },
        { id: "ec-003", rule: "AUTH Token / RBAC", description: "Redis AUTH token not configured. All clients on VPC can connect without authentication.", status: "WARN", severity: "HIGH", framework: "CIS", remediation: "Enable Redis AUTH token or RBAC user groups in Security section of Config tab." },
        { id: "ec-004", rule: "Private Subnet Deployment", description: "Redis cluster deployed in private subnets — not publicly accessible.", status: "PASS", severity: "CRITICAL", framework: "PCI-DSS 1.3" },
        { id: "ec-005", rule: "Automatic Failover", description: "Multi-AZ automatic failover enabled for primary node failure recovery.", status: "PASS", severity: "MEDIUM", framework: "Internal" },
      ],
      costData: {
        monthlyTotal: "~$35/mo",
        annualTotal: "~$420/yr",
        pricingModel: "ElastiCache On-Demand · cache.t3.medium · us-east-1",
        breakdown: [
          { label: "Primary Node", amount: "$24.82", unit: "cache.t3.medium × 730 hrs × $0.034/hr", note: "Primary shard" },
          { label: "Read Replica (1)", amount: "$24.82", unit: "Same instance type", note: "Multi-AZ replica" },
          { label: "Backup Storage", amount: "$0.085", unit: "1 GB × $0.085/GB", note: "Snapshot storage" },
        ],
        optimizationTips: [
          "Switch to 1-year Reserved Cache Nodes for ~40% savings ($21/mo vs $35/mo).",
          "Use cache.t4g.medium (Graviton2) for same performance at 10% lower cost.",
          "Set appropriate TTL values to prevent memory saturation and reduce evictions.",
        ],
      },
      validationChecks: [
        { id: "v-ec-01", label: "Cluster ID Configured", description: "Replication group ID must be set and unique.", status: "PASS", category: "Required" },
        { id: "v-ec-02", label: "Node Type Selected", description: "Cache node instance type must be configured.", status: "PASS", category: "Required" },
        { id: "v-ec-03", label: "Multi-AZ Enabled", description: "Multi-AZ automatic failover should be enabled for production.", status: "PASS", category: "Resilience" },
        { id: "v-ec-04", label: "Subnet Group Configured", description: "A cache subnet group spanning multiple AZs must be specified.", status: "WARN", category: "Networking", fix: "Create an ElastiCache Subnet Group from the private subnets in Config." },
        { id: "v-ec-05", label: "AUTH Token Set", description: "Redis AUTH token required for access control.", status: "FAIL", category: "Security", fix: "Set auth_token to a Secrets Manager ARN in the Security section of Config tab." },
      ],
      terraformPreview: `resource "aws_elasticache_replication_group" "main" {
  replication_group_id       = "dopa-redis"
  description                = "DOPA Redis cache - session & catalog"

  node_type            = "cache.t3.medium"
  num_cache_clusters   = 2
  automatic_failover_enabled = true
  multi_az_enabled     = true

  engine               = "redis"
  engine_version       = "7.1"
  port                 = 6379

  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis_sg.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token             = var.redis_auth_token

  snapshot_retention_limit = 7
  snapshot_window          = "05:00-06:00"

  tags = {
    Name      = "dopa-redis"
    ManagedBy = "DOPA-Terraform"
  }
}`,
    };
  }

  // ── RDS ────────────────────────────────────────────────────────────────────────
  if (name.includes("RDS") || name.includes("POSTGRES") || name.includes("AURORA") || name.includes("DATABASE")) {
    return {
      serviceId: nodeId,
      name: "RDS PostgreSQL (Multi-AZ)",
      category: "Relational Database",
      purpose: "ACID-compliant primary database for transactional data — orders, user accounts, inventory. Multi-AZ standby provides automatic DNS failover.",
      requirementEvidence: "Prefer PostgreSQL for relational data with strong consistency guarantees",
      monthlyCost: "~$180",
      sla: "99.95%",
      rpo: "5 min",
      rto: "< 2 min",
      scalingModel: "Vertical scaling (instance class) + up to 5 read replicas",
      operationalComplexity: "Medium",
      terraformResource: "aws_db_instance",
      complianceTags: ["SOC2", "PCI-DSS", "GDPR", "HIPAA"],
      chosenBecause: [
        "ACID transactions required for financial order processing.",
        "Multi-AZ standby provides automatic 60-second DNS failover during primary failure.",
        "Storage Auto-scaling prevents database outages due to disk volume saturation.",
      ],
      alternatives: [
        {
          name: "Aurora PostgreSQL Serverless v2",
          pros: ["Auto-scales to 0 ACUs when idle", "Instant scaling without restarts"],
          cons: ["50% higher baseline cost"],
          whyNotChosen: "Standard RDS meets current SLA requirements within budget.",
          costDelta: "+$280/mo",
        },
      ],
      tradeoffs: ["Multi-AZ doubles instance cost vs Single-AZ."],
      iamPermissions: ["rds:CreateDBInstance", "rds:DescribeDBInstances", "rds:ModifyDBInstance", "secretsmanager:GetSecretValue"],
      keyMetrics: ["CPUUtilization < 70%", "DatabaseConnections < 80%", "FreeStorageSpace > 20%", "ReadLatency < 5ms"],
      securityScore: 93,
      securityFindings: [
        { id: "rds-001", rule: "Storage Encryption (KMS)", description: "RDS storage encrypted at rest with KMS customer-managed key.", status: "PASS", severity: "HIGH", framework: "PCI-DSS 3.4" },
        { id: "rds-002", rule: "Multi-AZ Deployment", description: "Multi-AZ standby instance enabled for automatic failover.", status: "PASS", severity: "HIGH", framework: "CIS AWS §2.3.1" },
        { id: "rds-003", rule: "Automated Backups Enabled", description: "7-day automated backup retention window configured.", status: "PASS", severity: "HIGH", framework: "SOC2 CC9.1" },
        { id: "rds-004", rule: "Deletion Protection", description: "Deletion protection enabled — prevents accidental instance termination.", status: "PASS", severity: "MEDIUM", framework: "Internal" },
        { id: "rds-005", rule: "Not Publicly Accessible", description: "RDS instance not publicly accessible — deployed in private subnets only.", status: "PASS", severity: "CRITICAL", framework: "CIS AWS §2.3.2" },
        { id: "rds-006", rule: "Password in Secrets Manager", description: "Master database password should be rotated via AWS Secrets Manager.", status: "WARN", severity: "HIGH", framework: "CIS AWS", remediation: "Set manage_master_user_password = true to delegate credential rotation to Secrets Manager." },
      ],
      costData: {
        monthlyTotal: "~$180/mo",
        annualTotal: "~$2,160/yr",
        pricingModel: "RDS On-Demand · db.t3.medium · Multi-AZ · us-east-1",
        breakdown: [
          { label: "Primary Instance", amount: "$76.65", unit: "db.t3.medium × 730 hrs × $0.105/hr", note: "Multi-AZ primary" },
          { label: "Standby Instance", amount: "$76.65", unit: "Same instance (Multi-AZ)", note: "Auto failover" },
          { label: "Provisioned Storage", amount: "$23.00", unit: "100 GB gp3 × $0.23/GB/mo", note: "" },
          { label: "Automated Backup", amount: "$2.30", unit: "Backup storage > DB size", note: "" },
          { label: "Data Transfer", amount: "$2.00", unit: "~20 GB/mo inter-AZ", note: "Multi-AZ sync" },
        ],
        optimizationTips: [
          "1-year Reserved DB Instance reduces cost from $180/mo to ~$108/mo (40% savings).",
          "Scale down to db.t3.small in dev/staging — save ~$90/mo per non-prod environment.",
          "Enable Performance Insights to identify slow queries before scaling vertically.",
        ],
      },
      validationChecks: [
        { id: "v-rds-01", label: "DB Identifier Set", description: "Database instance identifier must be configured.", status: "PASS", category: "Required" },
        { id: "v-rds-02", label: "Engine Version Specified", description: "PostgreSQL engine version must be explicitly pinned.", status: "PASS", category: "Required" },
        { id: "v-rds-03", label: "Instance Class Configured", description: "DB instance class (e.g. db.t3.medium) must be set.", status: "PASS", category: "Required" },
        { id: "v-rds-04", label: "Multi-AZ Enabled", description: "Multi-AZ must be true for production workloads.", status: "PASS", category: "Resilience" },
        { id: "v-rds-05", label: "Backup Retention >= 7 days", description: "Backup retention period should be at least 7 days.", status: "PASS", category: "Recovery" },
        { id: "v-rds-06", label: "Password in Secrets Manager", description: "Master password should be managed by Secrets Manager.", status: "WARN", category: "Security", fix: "Enable manage_master_user_password = true in the Security section." },
        { id: "v-rds-07", label: "DB Subnet Group Specified", description: "Subnet group must span >= 2 private AZs.", status: "PASS", category: "Networking" },
      ],
      terraformPreview: `resource "aws_db_instance" "main" {
  identifier     = "dopa-postgres-prod"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.t3.medium"

  allocated_storage     = 100
  max_allocated_storage = 500
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = aws_kms_key.rds.arn

  db_name  = "dopadb"
  username = "dopa_admin"
  manage_master_user_password = true

  multi_az               = true
  publicly_accessible    = false
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds_sg.id]

  backup_retention_period   = 7
  backup_window             = "03:00-04:00"
  maintenance_window        = "Mon:04:00-Mon:05:00"

  deletion_protection       = true
  skip_final_snapshot       = false
  final_snapshot_identifier = "dopa-postgres-final"

  performance_insights_enabled = true

  tags = {
    Name      = "dopa-postgres-prod"
    ManagedBy = "DOPA-Terraform"
  }
}`,
    };
  }

  // ── ECS ────────────────────────────────────────────────────────────────────────
  if (name.includes("ECS") || name.includes("FARGATE")) {
    return {
      serviceId: nodeId,
      name: "ECS Fargate",
      category: "Serverless Containers",
      purpose: "Orchestrates containerized application services without managing EC2 infrastructure. Scales seamlessly from 2 to 100 tasks based on traffic demand.",
      requirementEvidence: "Peak traffic surges requiring rapid horizontal scaling",
      monthlyCost: "~$120",
      sla: "99.99%",
      rpo: "N/A",
      rto: "< 30 sec",
      scalingModel: "Target-tracking auto-scaling based on CPU% or ALB RequestCount",
      operationalComplexity: "Medium",
      terraformResource: "aws_ecs_service",
      complianceTags: ["SOC2", "PCI-DSS"],
      chosenBecause: [
        "Serverless compute eliminates EC2 patch management and AMI updates.",
        "Task-level IAM roles enforce least-privilege access per microservice.",
        "Rolling deployment strategy ensures zero-downtime application updates.",
      ],
      alternatives: [
        {
          name: "EKS (Kubernetes)",
          pros: ["Industry-standard orchestration", "Advanced scheduling capabilities"],
          cons: ["$73/mo control plane cost", "High operational overhead", "Long learning curve"],
          whyNotChosen: "EKS complexity not justified at current scale.",
          costDelta: "+$90/mo",
        },
        {
          name: "EC2 Auto Scaling Group",
          pros: ["Lower per-vCPU cost on Reserved Instances"],
          cons: ["OS patching overhead", "Instance provisioning lag (3-5 min)"],
          whyNotChosen: "Fargate eliminates AMI management overhead for containerized workloads.",
          costDelta: "-$30/mo",
        },
      ],
      tradeoffs: [
        "Fargate per-vCPU pricing is ~20% higher than EC2 Reserved at steady state.",
        "Cold start latency 15-30 sec for new task launches during scale-out events.",
      ],
      iamPermissions: ["ecs:CreateService", "ecs:RegisterTaskDefinition", "ecs:DescribeServices", "ecr:GetAuthorizationToken", "logs:CreateLogGroup"],
      keyMetrics: ["CPUUtilization < 70%", "MemoryUtilization < 80%", "RunningTaskCount >= 2", "DesiredTaskCount", "PendingTaskCount"],
      securityScore: 85,
      securityFindings: [
        { id: "ecs-001", rule: "Task IAM Role with Least Privilege", description: "ECS task execution role configured with scoped IAM permissions only.", status: "PASS", severity: "HIGH", framework: "CIS AWS" },
        { id: "ecs-002", rule: "No Privileged Container Mode", description: "Containers not running in privileged mode — prevents host system escape.", status: "PASS", severity: "CRITICAL", framework: "CIS Docker" },
        { id: "ecs-003", rule: "Secrets from Secrets Manager", description: "Sensitive environment variables injected from Secrets Manager, not plaintext env vars.", status: "PASS", severity: "HIGH", framework: "SOC2 CC6.1" },
        { id: "ecs-004", rule: "Container Insights Enabled", description: "ECS Container Insights not enabled — limits visibility into per-task metrics.", status: "WARN", severity: "MEDIUM", framework: "Internal", remediation: "Enable containerInsights on the ECS cluster resource." },
        { id: "ecs-005", rule: "Image Scan on Push (ECR)", description: "ECR image scanning on push should be enabled to catch known CVEs.", status: "WARN", severity: "HIGH", framework: "NIST 800-190", remediation: "Enable scan_on_push = true on the aws_ecr_repository Terraform resource." },
      ],
      costData: {
        monthlyTotal: "~$120/mo",
        annualTotal: "~$1,440/yr",
        pricingModel: "Fargate On-Demand · 1 vCPU + 2 GB RAM × 2 tasks · us-east-1",
        breakdown: [
          { label: "vCPU Hours (2 tasks)", amount: "$72.99", unit: "2 vCPU × 730 hrs × $0.04048/vCPU-hr", note: "Running tasks" },
          { label: "Memory Hours (2 tasks)", amount: "$16.00", unit: "4 GB × 730 hrs × $0.004445/GB-hr", note: "" },
          { label: "ECR Storage", amount: "$1.00", unit: "~10 GB images × $0.10/GB", note: "Container images" },
          { label: "CloudWatch Logs", amount: "$5.00", unit: "~50 GB ingestion", note: "Application logs" },
          { label: "Data Transfer", amount: "$5.00", unit: "~50 GB outbound", note: "ALB to Internet" },
        ],
        optimizationTips: [
          "Use Fargate Spot for non-critical background workers — 70% cost reduction ($0.012/vCPU-hr vs $0.04).",
          "Right-size task definitions with Container Insights data before committing to instance type.",
          "Use ECR lifecycle policies to delete untagged images and reduce ECR storage costs.",
        ],
      },
      validationChecks: [
        { id: "v-ecs-01", label: "Cluster Name Set", description: "ECS cluster name must be configured.", status: "PASS", category: "Required" },
        { id: "v-ecs-02", label: "Task Definition CPU/Memory", description: "Task definition must specify vCPU and memory values.", status: "PASS", category: "Required" },
        { id: "v-ecs-03", label: "Desired Count >= 2", description: "Minimum 2 running tasks required for high availability.", status: "PASS", category: "Resilience" },
        { id: "v-ecs-04", label: "ALB Target Group Attached", description: "Service must be attached to an ALB target group for traffic distribution.", status: "WARN", category: "Networking", fix: "Configure load_balancer block with ALB target group ARN in Config tab." },
        { id: "v-ecs-05", label: "Auto-Scaling Policy Configured", description: "Auto-scaling target tracking policy should be configured.", status: "FAIL", category: "Scaling", fix: "Add aws_appautoscaling_policy with CPU target tracking in Advanced tier." },
        { id: "v-ecs-06", label: "Container Image Tag Pinned", description: "Container image must use a specific version tag, not 'latest'.", status: "WARN", category: "Deployment", fix: "Pin image tag to a specific git SHA or semver in the Config tab." },
      ],
      terraformPreview: `resource "aws_ecs_cluster" "main" {
  name = "dopa-cluster"
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_ecs_task_definition" "app" {
  family                   = "dopa-app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "1024"
  memory                   = "2048"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = "app"
    image = "\${aws_ecr_repository.app.repository_url}:v1.0.0"
    portMappings = [{ containerPort = 8080, protocol = "tcp" }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = "/ecs/dopa-app"
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "ecs"
      }
    }
    secrets = [{
      name      = "DB_PASSWORD"
      valueFrom = aws_secretsmanager_secret.db.arn
    }]
  }])
}

resource "aws_ecs_service" "app" {
  name            = "dopa-app-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs_sg.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "app"
    container_port   = 8080
  }

  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200
}`,
    };
  }

  // ── Generic Fallback ─────────────────────────────────────────────────────────
  const displayName = label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
  return {
    serviceId: nodeId,
    name: displayName,
    category: "AWS Infrastructure Component",
    purpose: `Production cloud component: ${displayName}. Configured according to AWS Well-Architected Framework best practices.`,
    requirementEvidence: "Extracted from system requirements engine",
    monthlyCost: "~$20",
    sla: "99.9%",
    rpo: "15 min",
    rto: "< 5 min",
    operationalComplexity: "Medium",
    scalingModel: "Auto-scaling based on load metrics",
    terraformResource: `aws_${label.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
    complianceTags: ["SOC2"],
    chosenBecause: [
      "Validated against AWS Security Hub CIS Level 2 benchmark.",
      "High availability deployment across multiple Availability Zones.",
      "KMS encryption enabled at-rest and TLS in-transit.",
    ],
    alternatives: [
      {
        name: "Legacy Server Setup",
        pros: ["Simpler single-node architecture"],
        cons: ["Lacks automated scaling and cloud resilience"],
        whyNotChosen: "Lacks automated scaling, Multi-AZ failover, and managed cloud resilience.",
        costDelta: "-$5/mo",
      },
    ],
    tradeoffs: [
      "Standard AWS cloud resource hourly usage billing.",
      "Requires active monitoring of operational telemetry metrics.",
    ],
    iamPermissions: [`${label.toLowerCase()}:Describe*`, `${label.toLowerCase()}:List*`],
    keyMetrics: ["Availability > 99.9%", "Latency p95 < 500ms", "Error Rate < 0.1%"],
    securityScore: 82,
    securityFindings: [
      { id: "gen-001", rule: "Encryption At-Rest", description: "Resource storage encrypted with KMS customer-managed key.", status: "PASS", severity: "HIGH", framework: "CIS AWS" },
      { id: "gen-002", rule: "Access Logging", description: "Access logging should be enabled for audit trail and forensics.", status: "WARN", severity: "MEDIUM", framework: "SOC2 CC6.1", remediation: "Enable access logging in the Observability section of the Config tab." },
      { id: "gen-003", rule: "Multi-AZ Deployment", description: "Resource deployed across multiple Availability Zones for resilience.", status: "PASS", severity: "HIGH", framework: "AWS Well-Architected" },
    ],
    costData: {
      monthlyTotal: "~$20/mo",
      annualTotal: "~$240/yr",
      pricingModel: "AWS On-Demand · us-east-1",
      breakdown: [
        { label: "Resource Hourly Charge", amount: "$16.00", unit: "730 hrs × base rate", note: "Infrastructure" },
        { label: "Data Transfer", amount: "$2.00", unit: "~20 GB × $0.09/GB", note: "Outbound" },
        { label: "Monitoring & Logging", amount: "$2.00", unit: "CloudWatch metrics & logs", note: "" },
      ],
      optimizationTips: [
        "Consider Reserved capacity for 1 or 3-year terms — up to 40% cost reduction.",
        "Review CloudWatch metric data to right-size the resource tier.",
      ],
    },
    validationChecks: [
      { id: "v-gen-01", label: "Resource Name Set", description: "Resource name/identifier must be configured.", status: "WARN", category: "Required", fix: "Set the resource name in the Configuration tab." },
      { id: "v-gen-02", label: "Environment Tag Present", description: "Resource must have an Environment tag for cost allocation.", status: "PASS", category: "Tagging" },
      { id: "v-gen-03", label: "Encryption Enabled", description: "Resource must have encryption at-rest enabled.", status: "PASS", category: "Security" },
    ],
  };
}

// ─── Custom Service Node ───────────────────────────────────────────────────────
function CustomServiceNode({ id, data, selected }: NodeProps) {
  const label = String(data.label || id);
  const { graphNodes, graphEdges, commitGraph, currentProject } = useStore();
  const projectId = currentProject?.id || "";

  const { data: configArtifact } = useQuery({
    queryKey: ["project-config", projectId],
    queryFn: () => configurationApi.getConfiguration(projectId),
    enabled: !!projectId,
    staleTime: 5000,
  });

  const resourceData = configArtifact?.resources[id];
  const completionPct = resourceData?.completion_percentage ?? 100;
  const isComplete = completionPct >= 100 && (resourceData?.validation_errors?.length ?? 0) === 0;
  const hasErrors = (resourceData?.validation_errors?.length ?? 0) > 0;

  let borderStyle = "border-slate-700 hover:border-slate-500 shadow-md";
  let badgeStyle = "bg-slate-800 text-slate-400";
  let statusText = `${completionPct}%`;

  if (hasErrors) {
    borderStyle = "border-red-500/90 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse";
    badgeStyle = "bg-red-500/20 text-red-400 border border-red-500/40";
    statusText = "⚠ Error";
  } else if (isComplete) {
    borderStyle = "border-emerald-500/80 shadow-[0_0_15px_rgba(16,185,129,0.2)]";
    badgeStyle = "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40";
    statusText = "✓ Ready";
  } else if (completionPct > 0) {
    borderStyle = "border-amber-500/80 shadow-[0_0_12px_rgba(245,158,11,0.2)]";
    badgeStyle = "bg-amber-500/20 text-amber-400 border border-amber-500/40";
    statusText = `${completionPct}%`;
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newNodes = graphNodes.filter((n) => n.id !== id);
    const newEdges = graphEdges.filter((e) => e.source !== id && e.target !== id);
    const deletedLabel = graphNodes.find((n) => n.id === id)?.data?.label ?? id;
    commitGraph(newNodes, newEdges, `Deleted ${deletedLabel}`);
  };

  return (
    <div className={`group relative bg-slate-900/95 text-slate-50 border rounded-2xl px-4 py-3 text-xs font-semibold backdrop-blur-xl transition-all cursor-pointer min-w-[150px] text-center ${borderStyle} ${selected ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-950 scale-105" : ""}`}>
      <Handle type="target" position={Position.Top} className="!bg-blue-500 !w-2.5 !h-2.5 !border-2 !border-slate-900" />

      <div className="flex items-center justify-between mb-1.5 gap-2">
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 truncate max-w-[80px]">
          {label.includes("s3") ? "Storage" : label.includes("rds") ? "Database" : label.includes("ecs") ? "Compute" : "Service"}
        </span>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${badgeStyle}`}>{statusText}</span>
      </div>

      <div className="flex items-center justify-center gap-1.5 py-0.5">
        {label.includes("s3") ? <Database size={13} className="text-blue-400" /> : label.includes("rds") ? <Server size={13} className="text-emerald-400" /> : <Cpu size={13} className="text-purple-400" />}
        <span className="capitalize font-bold text-slate-100">{label}</span>
      </div>

      <div className="absolute -top-3.5 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20">
        <button
          onClick={(e) => {
            e.stopPropagation();
            const nodeEl = e.currentTarget.closest(".react-flow__node");
            if (nodeEl) (nodeEl as HTMLElement).click();
          }}
          className="w-6 h-6 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-xl transition-all hover:scale-110 border border-blue-400/40"
          title="Configure Resource"
        >
          <Settings size={11} />
        </button>
        <button
          onClick={handleDelete}
          className="w-6 h-6 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-xl transition-all hover:scale-110 border border-red-400/40"
          title="Delete Resource"
        >
          <Trash2 size={11} />
        </button>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-blue-500 !w-2.5 !h-2.5 !border-2 !border-slate-900" />
    </div>
  );
}

const nodeTypes = { customService: CustomServiceNode };

// ─── Main Graph Component ─────────────────────────────────────────────────────
function GraphCanvasInner({ projectId }: { projectId: string }) {
  const { graphNodes, graphEdges, graphInitialized, initGraph, commitGraph, setGraphNodes, setGraphEdges } = useStore();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["graph", projectId],
    queryFn: () => projectsApi.getGraph(projectId),
    refetchInterval: 5000,
  });

  const [isReady, setIsReady] = useState(false);
  const [selectedNodeData, setSelectedNodeData] = useState<NodeDrawerData | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const handleDeleteNode = useCallback((serviceId: string) => {
    const currentNodes = useStore.getState().graphNodes;
    const currentEdges = useStore.getState().graphEdges;
    const newNodes = currentNodes.filter((n) => n.id !== serviceId);
    const newEdges = currentEdges.filter((e) => e.source !== serviceId && e.target !== serviceId);
    const deletedLabel = currentNodes.find((n) => n.id === serviceId)?.data?.label ?? serviceId;
    commitGraph(newNodes, newEdges, `Deleted ${deletedLabel}`);
    setSelectedNodeData(null);
  }, [commitGraph]);

  const handleReplaceNode = useCallback((serviceId: string, newName: string) => {
    const currentNodes = useStore.getState().graphNodes;
    const currentEdges = useStore.getState().graphEdges;
    const newNodes = currentNodes.map((n) =>
      n.id === serviceId ? { ...n, type: "customService", data: { ...n.data, label: newName.toLowerCase() } } : n
    );
    commitGraph(newNodes, currentEdges, `Replaced with ${newName}`);
    setSelectedNodeData(null);
  }, [commitGraph]);

  useEffect(() => {
    if (data?.nodes && data.nodes.length > 0 && !graphInitialized) {
      const formattedNodes: Node[] = data.nodes.map((n: GraphNode, index: number) => ({
        id: n.id,
        type: "customService",
        position: n.position || { x: 200 + (index % 3) * 280, y: 80 + Math.floor(index / 3) * 170 },
        data: { label: n.data?.label || n.data?.service || n.id },
      }));
      const formattedEdges: Edge[] = data.edges.map((e: GraphEdge) => ({
        id: e.id, source: e.source, target: e.target,
        animated: e.animated !== false, style: edgeStyle, type: "smoothstep",
      }));
      initGraph(formattedNodes, formattedEdges);
      setIsReady(true);
    } else if (graphInitialized) {
      setIsReady(true);
    }
  }, [data, graphInitialized, initGraph]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setGraphNodes(applyNodeChanges(changes, useStore.getState().graphNodes));
  }, [setGraphNodes]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setGraphEdges(applyEdgeChanges(changes, useStore.getState().graphEdges));
  }, [setGraphEdges]);

  const handleNodeClick = useCallback((_: unknown, node: Node) => {
    setSelectedNodeData(buildDrawerData(node.id, String(node.data?.label || node.id)));
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const serviceName = event.dataTransfer.getData("application/dopa-service");
    if (!serviceName || !reactFlowWrapper.current) return;
    const bounds = reactFlowWrapper.current.getBoundingClientRect();
    const newId = `manual-${Date.now()}`;
    const newNode: Node = {
      id: newId, type: "customService",
      position: { x: event.clientX - bounds.left, y: event.clientY - bounds.top },
      data: { label: serviceName.toLowerCase() },
    };
    const currentNodes = useStore.getState().graphNodes;
    const currentEdges = useStore.getState().graphEdges;
    commitGraph([...currentNodes, newNode], currentEdges, `Added ${serviceName}`);
    setIsReady(true);
  }, [commitGraph]);

  if (isError) {
    return <div className="absolute inset-0 flex items-center justify-center"><p className="text-red-400 text-sm">Failed to load architecture graph</p></div>;
  }
  if (isLoading && !isReady) {
    return <div className="absolute inset-0 flex items-center justify-center"><Skeleton className="w-48 h-10 rounded-lg bg-slate-800/60" /></div>;
  }
  if (!isReady || graphNodes.length === 0) {
    return (
      <div ref={reactFlowWrapper} className="absolute inset-0 flex flex-col items-center justify-center" onDragOver={onDragOver} onDrop={onDrop}>
        <p className="text-slate-500 text-sm font-medium">Awaiting architecture selection</p>
        <p className="text-slate-600 text-xs mt-1">Select an architecture option or drag services here</p>
      </div>
    );
  }

  return (
    <div ref={reactFlowWrapper} style={{ width: "100%", height: "100%", position: "relative" }} onDragOver={onDragOver} onDrop={onDrop}>
      <ReactFlow
        nodes={graphNodes} edges={graphEdges} nodeTypes={nodeTypes}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick} fitView colorMode="dark" proOptions={{ hideAttribution: true }}
      >
        <Background color="#1e293b" gap={20} size={1} />
        <Controls showInteractive={false} />
        <MiniMap style={{ width: 100, height: 65 }} className="!bg-slate-900/90 !border-slate-800/80 !rounded-lg shadow-xl" nodeColor="rgba(59, 130, 246, 0.4)" maskColor="rgba(15, 23, 42, 0.7)" />
      </ReactFlow>
      <ServiceNodeDrawer
        isOpen={!!selectedNodeData} onClose={() => setSelectedNodeData(null)}
        data={selectedNodeData} projectId={projectId}
        onDeleteNode={handleDeleteNode} onReplaceNode={handleReplaceNode}
      />
    </div>
  );
}

const edgeStyle: React.CSSProperties = { stroke: "#3b82f6", strokeWidth: 2 };
export const GraphCanvas = memo(GraphCanvasInner);
