#!/bin/bash

set -x
set -e

tar -cf docker/packages.tar \
  backend/package.json backend/package-lock.json backend/scripts/prepare.js \
  frontend/package.json frontend/package-lock.json
  
touch -a -m -t 201512180130 docker/packages.tar # docker cache uses timestamp as well

tar --owner=1000 --group=1000 --exclude-from=.gitignore -cf docker/app.tar frontend backend

touch -a -m -t 201512180130 docker/app.tar

if [ "$1" != "prepare" ]; then
  if [ "$1" != "build" ]; then
    echo "First argument must be either build or prepare"
    exit 1
  fi
  shift
  docker build --rm docker $@
fi
