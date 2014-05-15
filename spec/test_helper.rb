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
    include Helpers
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
        user.files.destroy!
        user.destroy!
    end
end
def assert condition, reason=""
    condition.should eql(true)
end
require File.expand_path '../../lib/main.rb', __FILE__
require File.expand_path '../../lib/models.rb', __FILE__
