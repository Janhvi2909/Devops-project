output "alb_dns_url"          { value = "http://${aws_lb.main.dns_name}" }
output "ecr_repository_url"   { value = aws_ecr_repository.app.repository_url }
output "ecs_cluster_name"     { value = aws_ecs_cluster.main.name }
output "ecs_service_name"     { value = aws_ecs_service.app.name }
output "vpc_id"               { value = aws_vpc.main.id }
output "s3_bucket_name"       { value = aws_s3_bucket.app_storage.id }
output "cloudwatch_log_group" { value = aws_cloudwatch_log_group.ecs.name }
output "lab_role_arn"         { value = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/LabRole" }
