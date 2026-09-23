FROM docker.io/library/alpine:3.21
RUN apk add --no-cache busybox-extras postgresql16-client \
 && mkdir -p /www/api \
 && echo ok > /www/healthz \
 && echo '{"app":"webhost-repo-test","backend":"ok"}' > /www/api/status \
 && cp /www/api/status /www/status
USER 1000
EXPOSE 8080
CMD ["busybox-extras", "httpd", "-f", "-v", "-p", "8080", "-h", "/www"]
