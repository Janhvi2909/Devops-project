terraform {
  backend "s3" {
    bucket       = "taskflow-tf-state-120752462179"
    key          = "ecs-fargate/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}
