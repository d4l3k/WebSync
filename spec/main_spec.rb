require File.expand_path '../test_helper.rb', __FILE__

include Rack::Test::Methods

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
  it "should successfully register" do
    destroy_testuser
    post '/register', {
      email: 'test@websyn.ca',
      password: 'testboop',
    }
    assert last_response.redirect?
    follow_redirect!
    assert last_response.ok?
    assert last_request.path == "/"
  end
  it "should be able to login" do
    testuser
  end
  it "should be able to login and redirect" do
    $helpers.register 'test@websyn.ca', 'testboop'
    post '/login', {
      email: 'test@websyn.ca',
      password: 'testboop',
      redirect: '/public'
    }
    assert last_response.redirect?
    follow_redirect!
    assert last_response.ok?
    assert last_request.path == "/public"
  end
  it "should be able to sort files" do
    testuser
    %w(owner recent size name).each do |sort_by|
      get "/?#{sort_by}"
      assert last_response.ok?
      get "/?#{sort_by}&invert"
      assert last_response.ok?
    end
  end
  it "should be able to load the settings page" do
    testuser
    get '/settings'
    assert last_response.ok?
  end
  it "should be able to use themes" do
    testuser
    post '/settings', {
      theme: "Green"
    }
    assert last_response.ok?
    theme_file = last_response.body.match(%r{/assets/theme-\S*\.css}).to_s
    assert(theme_file.length > 0)
  end
  it "should be able to create all file types" do
    testuser
    AssetGroup.all.each do |type|
      get "/new/#{type.id}"
      assert last_response.redirect?
      follow_redirect!
      assert last_response.ok?
      path = last_request.path.match(%r{^/\S+/edit$})
      assert path.length == 1

      # Delete file
      doc = path[0].split("/")[1]
      get "/#{doc}/delete"
      assert last_response.redirect?

      get "/#{doc}/destroy"
      assert last_response.ok?
      post "/#{doc}/destroy", {
        password: "testboop"
      }
      assert last_response.redirect?
      follow_redirect!
      assert last_request.path == "/"
      assert !last_response.body.index("Document erased.").nil?,
        "Document obliterate flash"
    end
  end
  after do
    destroy_testuser
  end
end
