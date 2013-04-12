require 'bundler'
ENV['RACK_ENV']='production'
Bundler.require(:default,:production)
require 'sinatra/asset_pipeline/task.rb'
require './main'
Sinatra::AssetPipeline::Task.define! WebSync
