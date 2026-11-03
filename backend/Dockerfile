FROM docker.io/library/alpine:3.24.3@sha256:be2656061b536c1883c4034790e21d0a09c5aaaf51968b89368a3c0371ea2c9a
RUN apk add --no-cache busybox-extras postgresql18-client \
 && mkdir -p /www/api \
 && echo ok > /www/healthz \
 && echo '{"app":"webhost-repo-test","backend":"ok"}' > /www/api/status \
 && cp /www/api/status /www/status
USER 1000
EXPOSE 8080
CMD ["busybox-extras", "httpd", "-f", "-v", "-p", "8080", "-h", "/www"]
