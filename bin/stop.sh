SOURCE=$(dirname "${BASH_SOURCE[0]}")

cd $SOURCE/..

echo Changed to directory: `pwd`

service nginx stop

pm2 kill backend.js
thin stop -C config/thin.yaml
