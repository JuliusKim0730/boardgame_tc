# MLOps/운영 파이프라인 가이드 (Boardgame 01)

본 프로젝트는 각 워크플로우(1.00~5.00)를 독립 CI/CD Job으로 실행/검증할 수 있도록 설계되었습니다.

## 공통 환경 (AWS 예시 — 영어 명세)
- Runtime: Node.js 20
- Database: Amazon RDS for PostgreSQL
- Cache: Amazon ElastiCache (Redis)
- Orchestrator: Amazon EKS (Kubernetes)
- Registry: Amazon ECR
- Storage: Amazon S3 (assets/logs)
- Ingress: ALB + NGINX
- Observability: CloudWatch, OpenTelemetry Collector

## Job/Artifact 규칙
- Image: `bg01-webapp:{git_sha}`
- Infra(IaC): `bg01-iac:{version}`
- Workflow Spec: `bg01-wf-{id}-{kebab-name}:{version}`

## 배포 전략
- Blue/Green 또는 Canary(10% → 50% → 100%), 자동 롤백(헬스 체크/에러율 기준).

## 모니터링 지표
- WS 연결 수/에러율, 액션 처리율, p95 지연, 상호작용 타임아웃 건수, Soft Reset 실패율.

## 워크플로우 Job 매핑
- 1.00 → `wf-1.00-room`
- 2.00 → `wf-2.00-setup`
- 3.00 → `wf-3.00-turn`
- 4.00 → `wf-4.00-finalize`
- 5.00 → `wf-5.00-advanced`

각 워크플로우 MD의 “MLOps 적용” 절에 Job 스니펫과 목적이 수록되어 있습니다.





