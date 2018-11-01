FROM node:10.10.0-alpine

# Install native dependencies required for installing backend deps and/or
# running webpack build. Those are not needed for running the app
RUN apk add --no-cache libpng-dev autoconf automake libtool file nasm \
  python make g++

ENTRYPOINT ["/bin/bash", "/entrypoint.sh"]

RUN apk add --no-cache --repository http://dl-3.alpinelinux.org/alpine/edge/testing gosu
RUN apk add --no-cache tmux bash docker shadow curl
RUN chsh -s /bin/bash
ENV LANG en_US.UTF-8
COPY ./devel-etc /etc
COPY ./entrypoint.sh /
LABEL version=10
RUN apk add --no-cache 
LABEL packages=
