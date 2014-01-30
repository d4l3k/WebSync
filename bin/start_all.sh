cd /src

rake assets:clean
rake assets:precompile

service nginx start

pm2 start /src/bin/backend.js -i 4
thin start -C /src/config/thin.yaml
