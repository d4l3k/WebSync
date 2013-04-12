git pull
bundle
rake assets:precompile
thin restart -C thin.yaml
