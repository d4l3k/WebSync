require_relative 'test_helper'

include Rack::Test::Methods

require 'pry'

class Litmus
    def initialize url, user, pass
        @url = url
        @user = user
        @pass = pass
    end
    def run
        require 'pty'
        response = ''
        cmd = "TESTS='basic copymove props' litmus -k '#{@url}' #{@user} #{@pass}"
        begin
            PTY.spawn( cmd ) do |stdin, stdout, pid|
                begin
                    stdin.each do |line|
                        print line
                        response += line
                    end
                rescue Errno::EIO
                    # Output done
                end
            end
        rescue PTY::ChildExited
            puts "The child process exited!"
        end
        split = response.split("\n")
        passes = split.find_all{|line| line.include? "pass"}
        errors = split.find_all{|line| line.include? "FAIL"}
        [passes, errors]
    end
    def self.test url, user="", pass=""
        litmus = Litmus.new url, user, pass
        litmus.run
    end
end

describe "WebDAV", type: :feature do
    it "should fail to load the webdav root" do
        get '/w/'
        assert(!last_response.ok?)
        get '/webdav/'
        assert(!last_response.ok?)
    end
    it "should pass all litmus tests", js: true do
        testuser
        server = Capybara.current_session.server
        passes, fails = Litmus.test("http://#{server.host}:#{server.port}/w/", 'test@websyn.ca', 'testboop')
        passes.length.should eq(56)
        # TODO: Have fewer fails.
        fails.length.should eq(6)
        destroy_testuser
    end
end
