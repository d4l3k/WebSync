source 'https://rubygems.org'
ruby '2.0.0'
gem 'rubysl', platform: :rbx
gem 'racc', platform: :rbx
gem 'json'
gem 'data_mapper'
gem 'dm-postgres-adapter'
gem 'dm-types'
gem 'mime-types'
gem 'sass', require: 'sass'
gem 'erubis'
gem 'redis'
gem 'hiredis'
gem 'pdftohtmlr'
gem 'sinatra', :require=>'sinatra/base'
gem 'sinatra-flash', require: 'sinatra/flash'
gem 'nokogiri'
gem 'multi_json'
gem 'radix62'
gem 'pg'
gem 'sinatra-asset-pipeline', :git=>'git://github.com/d4l3k/sinatra-asset-pipeline.git', :require=>'sinatra/asset_pipeline'
gem 'dav4rack', git: 'https://github.com/inferiorhumanorgans/dav4rack.git'
group :development do
    gem 'thin'
	gem 'racksh'
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
end
