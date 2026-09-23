FROM docker.io/library/alpine:3.21
RUN apk add --no-cache busybox-extras postgresql16-client
COPY probe.sh /usr/local/bin/probe.sh
RUN mkdir -p /www/api \
 && echo ok > /www/healthz \
 && /usr/local/bin/probe.sh kaniko-run > /www/api/probe.json \
 && cat /www/api/probe.json
USER 1000
EXPOSE 8080
CMD ["busybox-extras", "httpd", "-f", "-v", "-p", "8080", "-h", "/www"]
