require File.expand_path '../test_helper.rb', __FILE__

include Rack::Test::Methods

def app
    WebSync
end
require 'pry'

class Litmus
    def initialize url, user, pass
        @url = url
        @user = user
        @pass = pass
    end
    def run
        response = `litmus -k "#{@url}" #{@user} #{@pass}`
        errors = response.split("\n").find_all{|line| line.include? "FAIL"}
        errors.each do |error|
            puts error
        end
        errors.length == 0
    end
    def self.test url, user="", pass=""
        litmus = Litmus.new url, user, pass
        litmus.run
    end
end

describe "WebDAV" do
    it "should fail to load the root" do
        get '/webdav/'
        assert(!last_response.ok?)
    end
    it "should pass all litmus tests" do
        assert User.all(email: 'test@websyn.ca').files.destroy!
        assert User.all(email: 'test@websyn.ca').destroy!
        password = (rand*10**50).to_i.encode62
        user = User.first_or_create(email: 'test@websyn.ca', password: password)
        assert Litmus.test("http://localhost:9292/webdav/", user.email, password)
    end
end
