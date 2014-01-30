#!/bin/bash

SOURCE=$(dirname "${BASH_SOURCE[0]}")

cd $SOURCE/..

echo Changed to directory: `pwd`

service nginx start

pm2 start bin/backend.js -i 4
thin start -C config/thin.yaml
