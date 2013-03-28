#\ -p 4567
require 'bundler'

Bundler.require(:default,:development)
use PryRescue::Rack
require './main'

map '/assets' do
  environment = Sprockets::Environment.new
  environment.append_path 'assets/js'
  environment.append_path 'assets/css'
  environment.js_compressor  = YUI::JavaScriptCompressor.new
  environment.css_compressor = YUI::CssCompressor.new
  run environment
end

map '/' do
    run Sinatra::Application
end
