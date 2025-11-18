FROM registry.cn-hangzhou.aliyuncs.com/go-to-mirror/nginx:1.29.3-alpine
LABEL MAINTAINER="raoyc <raoyc@foxmail.com>"
LABEL Description="web-screen-recorder: A simple nginx image to serve web-screen-recorder static files"

COPY www /usr/share/nginx/html
EXPOSE 80