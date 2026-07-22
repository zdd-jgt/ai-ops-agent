# IAM Roles — Telemetry API (prepare-only，未创建)

## Execution Role: `aiops-telemetry-execution`

ECS Agent 拉取镜像和写日志所需权限：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:REGION:ACCOUNT_ID:log-group:/aiops/telemetry-api:*"
    }
  ]
}
```

## Task Role: `aiops-telemetry-task`

应用运行时权限（按最小权限原则拆分）：

### 写日志（ingest → stdout → awslogs）
无需额外权限 — awslogs 驱动使用 Execution Role 写入。

### 查询 CloudWatch Logs Insights
```json
{
  "Effect": "Allow",
  "Action": ["logs:StartQuery", "logs:GetQueryResults", "logs:StopQuery"],
  "Resource": "arn:aws:logs:REGION:ACCOUNT_ID:log-group:/aiops/telemetry-api:*"
}
```

### 注意
- 写日志和查日志使用不同 Role（Execution Role → 写入，Task Role → 查询）。
- 生产环境必须将 `ACCOUNT_ID` 和 `REGION` 替换为实际值。
- 不得使用长期 Access Key。
