variable "aws_access_key" {
  description = "AWS Access Key ID"
  type        = string
  sensitive   = true
}

variable "aws_secret_key" {
  description = "AWS Secret Access Key"
  type        = string
  sensitive   = true
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "bucket_name" {
  description = "S3 bucket name for videos"
  type        = string
  default     = "nooglers-ai4b"
}

variable "videos_source_path" {
  description = "Local path to the final_videos directory"
  type        = string
  default     = "../final_videos"
}

variable "videos" {
  description = "Map of video name (used as S3 key stem) → filename in videos_source_path. To add a new video, append an entry here."
  type        = map(string)
  default     = {}
}
