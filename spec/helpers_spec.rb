require File.expand_path '../test_helper.rb', __FILE__

include Rack::Test::Methods

def app
    WebSync
end

describe "WebSync Frontend Helpers" do
    before :each do
        $helpers = TestHelpers.new
    end
    it "current_user should be anonymous" do
        $helpers.current_user.class.should eq(AnonymousUser)
    end
    it "should not be logged in" do
        $helpers.logged_in?.should eq(false)
    end
    it "should not be admin" do
        $helpers.admin?.should eq(false)
    end
    it "should be able to register" do
        # Test registration
        $helpers.register('test@websyn.ca', 'testboop').should_not eq(nil)
        $helpers.logged_in?.should eq(true)
    end
    it "should be able to cache and restore" do
        $helpers.cache time: 60 do
            'test'
        end.should eq('test')
        $helpers.cache do
            'nottest'
        end.should eq('test')
        ttl = $redis.ttl("url:/test")
        ttl.should be <= 60
        ttl.should be > 0
    end
    after :each do
        destroy_testuser
    end
end
describe "Front end logged in helpers" do
    before :each do
        $helpers.register 'test@websyn.ca', 'testboop'
    end
    it "should be logged in" do
        $helpers.logged_in?.should eq(true)
    end
    it "should not be anonymous" do
        $helpers.current_user.class.should eq(User)
    end
    it "should be able to logout and back in" do
        $helpers.logout
        $helpers.logged_in?.should eq(false)
        $helpers.authenticate('test@websyn.ca', 'testboop').should eq(true)
        $helpers.logged_in?.should eq(true)
    end
    it "should not be able to login with a bad pass" do
        $helpers.logout
        $helpers.logged_in?.should eq(false)
        $helpers.authenticate('test@websyn.ca', 'badpass').should eq(false)
        $helpers.logged_in?.should eq(false)
    end
    it "should be able to log out" do
        $helpers.logout
        $helpers.logged_in?.should eq(false)
    end
    after :each do
        destroy_testuser
    end
end
