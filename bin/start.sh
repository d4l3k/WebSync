#!/bin/bash

SOURCE=$(dirname "${BASH_SOURCE[0]}")

cd $SOURCE/..

echo Changed to directory: `pwd`

service nginx start

alias nodejs=node

pm2 start bin/backend.js -i 4
unicorn -c config/unicorn.rb -D
#thin start -C config/thin.yaml
