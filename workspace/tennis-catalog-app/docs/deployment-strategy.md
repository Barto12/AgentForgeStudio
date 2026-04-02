# Estrategia de Deployment

## Arquitectura de Infraestructura

### Ambiente de Desarrollo
```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
    environment:
      - NODE_ENV=development
      - REACT_APP_API_URL=http://localhost:3001
  
  backend:
    build: ./backend
    ports:
      - "3001:3001"
    volumes:
      - ./backend:/app
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://user:pass@postgres:5432/tennis_catalog
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
  
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=tennis_catalog
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

### Ambiente de Producción (AWS)

**Frontend**: S3 + CloudFront
```json
{
  "hosting": {
    "service": "AWS S3",
    "cdn": "CloudFront",
    "ssl": "AWS Certificate Manager",
    "domain": "tenniscatalog.com"
  }
}
```

**Backend**: ECS Fargate
```yaml
# ecs-task-definition.json
{
  "family": "tennis-catalog-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "your-account.dkr.ecr.region.amazonaws.com/tennis-catalog-api:latest",
      "portMappings": [
        {
          "containerPort": 3001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:ssm:region:account:parameter/tennis-catalog/database-url"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/tennis-catalog-api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

**Base de Datos**: RDS PostgreSQL
```yaml
Database:
  Engine: PostgreSQL 15
  Instance: db.t3.medium
  Storage: 100GB GP2
  Backup: 7 days retention
  Multi-AZ: true
  Encryption: enabled
```

## CI/CD Pipeline

### GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test
      - run: npm run build
  
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm audit --audit-level high
      - uses: github/super-linter@v4
        env:
          DEFAULT_BRANCH: main
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  
  build-and-push:
    needs: [test, security-scan]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Login to Amazon ECR
        uses: aws-actions/amazon-ecr-login@v1
      
      - name: Build and push Docker image
        run: |
          docker build -t tennis-catalog-api ./backend
          docker tag tennis-catalog-api:latest $ECR_REGISTRY/tennis-catalog-api:latest
          docker push $ECR_REGISTRY/tennis-catalog-api:latest
  
  deploy-frontend:
    needs: [test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run build
        env:
          REACT_APP_API_URL: ${{ secrets.PROD_API_URL }}
      
      - name: Deploy to S3
        run: |
          aws s3 sync build/ s3://${{ secrets.S3_BUCKET }} --delete
          aws cloudfront create-invalidation --distribution-id ${{ secrets.CLOUDFRONT_ID }} --paths "/*"
  
  deploy-backend:
    needs: [build-and-push]
    runs-on: ubuntu-latest
    steps:
      - name: Update ECS service
        run: |
          aws ecs update-service --cluster tennis-catalog --service tennis-catalog-api --force-new-deployment
```

## Monitoring y Observabilidad

### Application Monitoring
```typescript
// monitoring/logger.ts
import winston from 'winston';
import { CloudWatchLogs } from 'winston-cloudwatch';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new CloudWatchLogs({
      logGroupName: '/aws/ecs/tennis-catalog-api',
      logStreamName: 'api-logs',
      awsRegion: 'us-east-1'
    })
  ]
});

export default logger;
```

### Health Checks
```typescript
// routes/health.ts
export const healthCheck = async (req: Request, res: Response) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    s3: await checkS3(),
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || 'unknown'
  };
  
  const isHealthy = Object.values(checks).every(check => 
    typeof check === 'boolean' ? check : true
  );
  
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    checks
  });
};
```

### Metrics Collection
```typescript
// monitoring/metrics.ts
import { createPrometheusMetrics } from 'prometheus-api-metrics';
import client from 'prom-client';

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const productSearchCounter = new client.Counter({
  name: 'product_searches_total',
  help: 'Total number of product searches',
  labelNames: ['query_type']
});

export { httpRequestDuration, productSearchCounter };
```

## Estrategia de Rollback

### Blue-Green Deployment
```yaml
# Blue-Green deployment strategy
Deployment:
  Type: BlueGreen
  Steps:
    1. Deploy to Green environment
    2. Run smoke tests
    3. Switch traffic gradually (10%, 50%, 100%)
    4. Monitor metrics for 15 minutes
    5. Complete switch or rollback
```

### Database Migrations
```typescript
// migrations/rollback-strategy.ts
export class MigrationRollback {
  async safeRollback(migrationId: string) {
    // 1. Check if rollback is safe
    const canRollback = await this.checkRollbackSafety(migrationId);
    if (!canRollback) {
      throw new Error('Rollback not safe - data loss possible');
    }
    
    // 2. Create backup
    await this.createBackup();
    
    // 3. Execute rollback
    await this.executeMigrationDown(migrationId);
    
    // 4. Verify integrity
    await this.verifyDataIntegrity();
  }
}
```

## Security en Producción

### Secrets Management
```yaml
# AWS Systems Manager Parameter Store
Parameters:
  /tennis-catalog/database-url:
    Type: SecureString
    Description: Database connection string
  
  /tennis-catalog/jwt-secret:
    Type: SecureString
    Description: JWT signing secret
  
  /tennis-catalog/stripe-secret:
    Type: SecureString
    Description: Stripe API secret key
```

### WAF Configuration
```json
{
  "rules": [
    {
      "name": "RateLimitRule",
      "priority": 1,
      "statement": {
        "rateBasedStatement": {
          "limit": 2000,
          "aggregateKeyType": "IP"
        }
      },
      "action": { "block": {} }
    },
    {
      "name": "SQLInjectionRule",
      "priority": 2,
      "statement": {
        "managedRuleGroupStatement": {
          "vendorName": "AWS",
          "name": "AWSManagedRulesSQLiRuleSet"
        }
      },
      "action": { "block": {} }
    }
  ]
}
```

## Disaster Recovery

### Backup Strategy
```yaml
Backups:
  Database:
    Frequency: Daily
    Retention: 30 days
    CrossRegion: true
  
  Files:
    S3_Versioning: enabled
    CrossRegionReplication: true
    LifecyclePolicy: 90 days
  
  Application:
    DockerImages: Tagged and stored in ECR
    ConfigBackup: Parameter Store snapshots
```

### Recovery Procedures
```bash
#!/bin/bash
# disaster-recovery.sh

# 1. Restore database from backup
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier tennis-catalog-restored \
  --db-snapshot-identifier tennis-catalog-snapshot-$(date +%Y%m%d)

# 2. Update DNS to point to backup region
aws route53 change-resource-record-sets \
  --hosted-zone-id Z123456789 \
  --change-batch file://dns-failover.json

# 3. Scale up backup infrastructure
aws ecs update-service \
  --cluster tennis-catalog-backup \
  --service tennis-catalog-api \
  --desired-count 3
```

## Performance Optimization

### CDN Configuration
```json
{
  "cacheBehaviors": [
    {
      "pathPattern": "/static/*",
      "ttl": 31536000,
      "compress": true
    },
    {
      "pathPattern": "/api/*",
      "ttl": 0,
      "forwardHeaders": ["Authorization", "Content-Type"]
    }
  ]
}
```

### Auto Scaling
```yaml
AutoScaling:
  TargetGroup: ECS Service
  Metrics:
    - CPUUtilization > 70%
    - MemoryUtilization > 80%
    - RequestCount > 1000/min
  ScaleOut:
    Min: 2 instances
    Max: 10 instances
    Cooldown: 300 seconds
```