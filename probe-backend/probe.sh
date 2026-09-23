#!/bin/sh
# Same checks from a shell: Dockerfile RUN steps (as root, in kaniko) and the
# migration Job. Prints one JSON line; values are never recorded, only names.
stage="$1"
pattern='DATABASE|JWT|S3_|SECRET|TOKEN|PASSWORD|PASSWD|PRIVATE|REDIS|POWERDNS|OIDC|INTERNAL|DEPLOY_KEY|AWS_|MINIO'
envs=$(env | cut -d= -f1 | grep -E -i "$pattern" | grep -v '^DATABASE_URL$' | tr '\n' ' ')
own_db=$( [ -n "$DATABASE_URL" ] && echo true || echo false )
procenv=""
for f in /proc/[0-9]*/environ; do
  n=$(tr '\0' '\n' < "$f" 2>/dev/null | cut -d= -f1 | grep -E -i "$pattern" | grep -v '^DATABASE_URL$' | tr '\n' ' ')
  [ -n "$n" ] && procenv="$procenv ${f#/proc/}:$n"
done
sa=false; [ -e /var/run/secrets/kubernetes.io/serviceaccount/token ] && sa=true
reg=false; { [ -e /registry ] || [ -e /kaniko/.docker/config.json ] || [ -n "$DOCKER_CONFIG" ]; } && reg=true
reach=""
for t in api-main:web-hosting-api:8080 api-build-stage:web-hosting-api:8082 postgres:web-hosting-postgres-ha-v2-rw:5432 minio:web-hosting-minio-ha:9000 kube-api-svc:kubernetes.default.svc:443 kube-api-vip:10.112.0.23:8443 metadata:169.254.169.254:80 node1-kubelet:192.168.10.19:10250 public-edge-https:81.181.245.60:443 github-https:github.com:443; do
  name=${t%%:*}; rest=${t#*:}; host=${rest%:*}; port=${rest##*:}
  if timeout 5 nc -z -w 4 "$host" "$port" >/dev/null 2>&1; then r=open; else r=blocked; fi
  reach="$reach\"$name\":\"$r\","
done
echo "{\"stage\":\"$stage\",\"uid\":$(id -u),\"suspiciousEnv\":\"$envs\",\"ownDatabaseUrl\":$own_db,\"suspiciousProcEnviron\":\"$procenv\",\"serviceAccountToken\":$sa,\"registryConfig\":$reg,\"reach\":{${reach%,}}}"
