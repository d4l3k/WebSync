ENV['RACK_ENV'] = 'test'
Bundler.require :test
require 'rack/test'
require_relative '../lib/helpers.rb'
RSpec.configure do |conf|
  conf.include Rack::Test::Methods
end
class TestRequest
    def path
        '/test'
    end
end
class TestResponse
    def header
        {}
    end
end
class TestHelpers
    include WebSync::Helpers
    def initialize
        @session = {}
    end
    def session
        return @session
    end
    def request
        TestRequest.new
    end
    def etag tag
    end
    def response
        TestResponse.new
    end
end
$helpers = TestHelpers.new

def testuser
    destroy_testuser
    user = $helpers.register 'test@websyn.ca', 'testboop'
    post '/login', {
        email: 'test@websyn.ca',
        password: 'testboop'
    }
    assert last_response.redirect?
    follow_redirect!
    assert last_response.ok?
    assert last_request.path == "/"
    user
end
def destroy_testuser
    user = User.get('test@websyn.ca')
    if user
        user.permissions.destroy!
        user.files.each do |f|
            f.destroy_cascade
        end
        user.destroy!
    end
end
def assert condition, reason=""
    expect(condition).to eql(true)
end
require File.expand_path '../../lib/main.rb', __FILE__
require File.expand_path '../../lib/models.rb', __FILE__

require 'capybara/rspec'
require 'capybara/poltergeist'
Capybara.default_wait_time = 15
Capybara.register_driver :poltergeist do |app|
  Capybara::Poltergeist::Driver.new(app, timeout: 15)
end
Capybara.register_driver :poltergeist_debug do |app|
  Capybara::Poltergeist::Driver.new(app, inspector: true, timeout: 15)
end
Capybara.javascript_driver = (ENV["DRIVER"] || :poltergeist).to_sym
$config_ru = eval "Rack::Builder.new {( " + File.read(File.dirname(__FILE__) + '/../config.ru') + "\n )}"

Capybara.app = $config_ru
def app
    $config_ru
end
