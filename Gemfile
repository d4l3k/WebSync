source 'https://rubygems.org'
gem 'rubysl', platform: :rbx
gem 'racc', platform: :rbx
gem 'json'
gem 'data_mapper'
gem 'dm-postgres-adapter'
gem 'dm-types'
gem 'mime-types'
gem 'sass', require: 'sass'
gem 'erubis'
gem 'ejs'
gem 'redis'
gem 'hiredis'
gem 'pdftohtmlr'
gem 'sinatra', :require=>'sinatra/base'
gem 'sinatra-flash', require: 'sinatra/flash'
gem 'nokogiri'
gem 'multi_json'
gem 'i18n', require: ['i18n', 'i18n/backend', 'i18n/backend/simple', 'i18n/backend/fallbacks', 'i18n/config']
gem "i18n-js", require: ['i18n/js']
gem 'rack-contrib'
gem 'radix62'
gem 'pg'
gem 'font-awesome-sass'
gem 'compass'
gem 'sinatra-asset-pipeline', require: ['sinatra/asset_pipeline', 'sprockets/environment', 'sprockets/manifest']
gem 'dav4rack', git: 'https://github.com/inferiorhumanorgans/dav4rack.git'

group :development, :test do
    gem 'thin'
    gem 'racksh'
    gem 'pry'
    gem 'pry-rescue'
    gem 'pry-stack_explorer'
end
group :production do
    gem 'unicorn'
    gem 'yui-compressor'
    gem 'closure-compiler'
end
group :test do
    gem 'git_time_extractor'
    gem 'selenium-webdriver'
    gem 'faye-websocket'
    gem 'rspec'
    gem 'rake'
    gem 'capybara'
    gem 'poltergeist'
end
group :development do
    gem 'rack-mini-profiler'
    gem 'flamegraph'
end

gem 'omniauth', require: ['omniauth/builder']
gem 'omniauth-facebook'
gem 'omniauth-gplus'
