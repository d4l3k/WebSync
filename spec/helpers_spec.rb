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
        expect($helpers.current_user.class).to eq(AnonymousUser)
    end
    it "should not be logged in" do
        expect($helpers.logged_in?).to eq(false)
    end
    it "should not be admin" do
        expect($helpers.admin?).to eq(false)
    end
    it "should be able to register" do
        # Test registration
        expect($helpers.register('test@websyn.ca', 'testboop')).not_to eq(nil)
        expect($helpers.logged_in?).to eq(true)
    end
    it "should be able to cache and restore" do
        expect($helpers.cache time: 60 do
            'test'
        end).to eq('test')
        expect($helpers.cache do
            'nottest'
        end).to eq('test')
        ttl = $redis.ttl("url:#{I18n.locale}:/test")
        expect(ttl).to be <= 60
        expect(ttl).to be > 0
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
        expect($helpers.logged_in?).to eq(true)
    end
    it "should not be anonymous" do
        expect($helpers.current_user.class).to eq(User)
    end
    it "should be able to logout and back in" do
        $helpers.logout
        expect($helpers.logged_in?).to eq(false)
        expect($helpers.authenticate('test@websyn.ca', 'testboop')).to eq(true)
        expect($helpers.logged_in?).to eq(true)
    end
    it "should not be able to login with a bad pass" do
        $helpers.logout
        expect($helpers.logged_in?).to eq(false)
        expect($helpers.authenticate('test@websyn.ca', 'badpass')).to eq(false)
        expect($helpers.logged_in?).to eq(false)
    end
    it "should be able to log out" do
        $helpers.logout
        expect($helpers.logged_in?).to eq(false)
    end
    after :each do
        destroy_testuser
    end
end
