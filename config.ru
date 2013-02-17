#\ -p 4567
require 'bundler'
Bundler.require(:default,:development)
use PryRescue::Rack
require './main'
run Sinatra::Application
