git pull
bundle
npm install
rake assets:precompile &
thin restart -C thin.yaml
