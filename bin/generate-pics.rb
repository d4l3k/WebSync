#!/usr/bin/env ruby
require 'bundler'
ENV['RACK_ENV'] = 'development'

require './lib/main'


require 'pry'
require 'capybara/poltergeist'
require './lib/models'
require './lib/configure'
driver = Capybara::Poltergeist::Driver.new WebSync
server = Capybara::Server.new(WebSync).boot
root = "http://#{server.host}:#{server.port}"
driver.visit root+'/login?/settings'
binding.pry
driver.first(:fillable_field, 'email').set 'test@websyn.ca'
driver.first(:fillable_field, 'password').set 'testboop'
click_button 'Sign In'
%w{Document Spreadsheet Notebook Presentation}.each do |type|
    id = AssetGroup.all(name: type).first.id
    driver.visit root+"/new/#{id}"
    while !driver.current_url.match(/\/\S{1,3}\/edit$/) || driver.find_css(".bar").length > 0
        sleep 0.05
    end
end
binding.pry
