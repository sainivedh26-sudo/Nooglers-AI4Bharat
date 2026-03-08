terraform {
  required_version = ">= 1.3"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region     = var.aws_region
  access_key = var.aws_access_key
  secret_key = var.aws_secret_key
}

# ─────────────────────────────────────────
# S3 Bucket
# ─────────────────────────────────────────

resource "aws_s3_bucket" "videos" {
  bucket        = var.bucket_name
  force_destroy = true

  tags = {
    Project = "Nooglers-AI4Bharat"
  }
}

resource "aws_s3_bucket_public_access_block" "videos" {
  bucket = aws_s3_bucket.videos.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "videos" {
  bucket = aws_s3_bucket.videos.id

  versioning_configuration {
    status = "Enabled"
  }
}

# ─────────────────────────────────────────
# CloudFront Origin Access Control (OAC)
# ─────────────────────────────────────────

resource "aws_cloudfront_origin_access_control" "videos" {
  name                              = "${var.bucket_name}-oac"
  description                       = "OAC for ${var.bucket_name} S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# ─────────────────────────────────────────
# CloudFront Distribution
# ─────────────────────────────────────────

resource "aws_cloudfront_distribution" "videos" {
  enabled             = true
  comment             = "Nooglers AI4Bharat video CDN"
  default_root_object = ""
  price_class         = "PriceClass_100" # US, Canada, Europe — cheapest

  origin {
    domain_name              = aws_s3_bucket.videos.bucket_regional_domain_name
    origin_id                = "s3-${var.bucket_name}"
    origin_access_control_id = aws_cloudfront_origin_access_control.videos.id
  }

  default_cache_behavior {
    target_origin_id       = "s3-${var.bucket_name}"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    # Cache videos aggressively — 7 days default, 30 days max
    min_ttl     = 0
    default_ttl = 604800
    max_ttl     = 2592000
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Project = "Nooglers-AI4Bharat"
  }
}

# ─────────────────────────────────────────
# S3 Bucket Policy — allow CloudFront OAC
# ─────────────────────────────────────────

data "aws_iam_policy_document" "cloudfront_s3_access" {
  statement {
    sid    = "AllowCloudFrontServicePrincipal"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.videos.arn}/videos/*"]

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.videos.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "videos" {
  bucket = aws_s3_bucket.videos.id
  policy = data.aws_iam_policy_document.cloudfront_s3_access.json

  # Policy must be applied after public access block is in place
  depends_on = [aws_s3_bucket_public_access_block.videos]
}

# ─────────────────────────────────────────
# Upload videos to S3
# Add new videos by appending to the `videos` map in terraform.tfvars
# ─────────────────────────────────────────

resource "aws_s3_object" "videos" {
  for_each = var.videos

  bucket       = aws_s3_bucket.videos.id
  key          = "videos/${each.key}.mp4"
  source       = "${var.videos_source_path}/${each.value}"
  content_type = "video/mp4"
  etag         = filemd5("${var.videos_source_path}/${each.value}")
}

# ─────────────────────────────────────────
# State migration — maps old individual resources
# to the new for_each form so existing uploads
# are NOT deleted and re-uploaded.
# ─────────────────────────────────────────

moved {
  from = aws_s3_object.hi2ma
  to   = aws_s3_object.videos["hi2ma"]
}

moved {
  from = aws_s3_object.hi2tl
  to   = aws_s3_object.videos["hi2tl"]
}

moved {
  from = aws_s3_object.ma2ta
  to   = aws_s3_object.videos["ma2ta"]
}
