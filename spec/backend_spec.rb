require File.expand_path '../test_helper.rb', __FILE__

include Rack::Test::Methods

def app
    WebSync
end

describe "WebSync Backend" do
    before(:all) do
        # Launch the backend daemon
        $backend_daemon = fork do
            exec 'bin/backend.js -p 1337'
        end
        puts "++++++++++++++++++++"
    end
    it "should successfully connect to the backend" do
        testuser
        get '/new/1'
        expect(last_response).to be_redirect
        follow_redirect!
        expect(last_response).to be_ok


    end
    after(:all) do
        Process.kill("TERM", $backend_daemon)
        destroy_testuser
        puts "-------------------SDF"
    end
end
