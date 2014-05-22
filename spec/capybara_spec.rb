require File.expand_path '../test_helper.rb', __FILE__

require 'capybara/rspec'
#require 'capybara/poltergeist'
#Capybara.javascript_driver = :poltergeist

#Capybara.javascript_driver = :webkit

include Rack::Test::Methods

def app
    WebSync
end

describe "WebSync Capybara Interface Tests", type: :feature do
    before(:all) do
        # Get backend path relative to binary.
        path = File.expand_path(File.dirname(__FILE__))
        backend = File.join(path, '../bin/backend.js')
        # Launch the backend daemon
        $backend_daemon = fork do
            exec "node #{backend} -p 1337"
        end
    end
    it "should successfully connect to the backend", :js => true do
        testuser
        visit '/new/1'
        binding.pry
    end
    after(:all) do
        Process.kill("TERM", $backend_daemon)
        destroy_testuser
    end
end
