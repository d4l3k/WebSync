require File.expand_path '../test_helper.rb', __FILE__

include Rack::Test::Methods

def app
    WebSync
end

describe "WebSync Frontend" do
  it "should successfully load the home page" do
    get '/'
    assert last_response.ok?
  end
  it "should successfully load the login page" do
    get '/login'
    assert last_response.ok?
  end
  it "should successfully redirect the upload page to login" do
    get '/upload'
    assert last_response.redirect?
    post '/upload'
    assert last_response.redirect?
  end
  it "should successfully redirect the admin page to login" do
    get '/admin'
    assert last_response.redirect?
  end
  it "should successfully load the public assets page" do
    get '/public'
    assert last_response.ok?
  end
  it "should successfully load the documentation" do
    get '/documentation'
    assert last_response.ok?
  end
end
