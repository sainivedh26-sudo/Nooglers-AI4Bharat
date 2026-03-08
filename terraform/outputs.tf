output "s3_bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.videos.id
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = aws_s3_bucket.videos.arn
}

output "cloudfront_distribution_id" {
  description = "CloudFront Distribution ID"
  value       = aws_cloudfront_distribution.videos.id
}

output "cloudfront_domain" {
  description = "CloudFront domain name (use this as your CDN base URL)"
  value       = "https://${aws_cloudfront_distribution.videos.domain_name}"
}

output "video_urls" {
  description = "Public CloudFront URLs for every video in the videos map"
  value = {
    for name, _ in var.videos :
    name => "https://${aws_cloudfront_distribution.videos.domain_name}/videos/${name}.mp4"
  }
}
