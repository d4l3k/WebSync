ENV['RACK_ENV'] = 'test'
require 'minitest/autorun'
require 'rack/test'

require File.expand_path '../../lib/main.rb', __FILE__
require File.expand_path '../../lib/models.rb', __FILE__
