require File.expand_path '../test_helper.rb', __FILE__

include Rack::Test::Methods

def app
  WebSync::App
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
    expect($helpers.cache(time: 60) {'test'}).to eq('test')
    expect($helpers.cache{'nottest'}).to eq('test')
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

describe "File upload helpers" do
  it "should remove script tags" do
    html = "<div><script></script><span><script src='https://google.com'></script></span></div>"
    sanitized = $helpers.sanitize_upload(Nokogiri::HTML(html))
    expect(sanitized.css('script').empty?).to eq(true)
  end

  #check if unoconv is present
  system("unoconv", "thisfileshouldnotexist")
  unoconv_works = $?.to_i == 6
  it "should successfully convert html, pdf, odt and docx to HTML", :if => unoconv_works do
    files = %w(spec/test_files/sample.odt spec/test_files/sample.docx
    spec/test_files/sample.pdf spec/test_files/sample-html.html)
    files.each do |file|
      html = $helpers.convert_file(File.new(file))
      expect(html.length > 0).to eq(true)
    end
  end
  it "should be able to convert PDF to HTML" do
    html = $helpers.convert_pdf_to_html('spec/test_files/sample.pdf')
    expect(html.length > 0).to eq(true)
  end
  it "should be able to replace_extension successfully" do
    expect($helpers.replace_extension('banana.txt', 'html')).to eq('./banana.html')
    expect($helpers.replace_extension('banana.me', 'test')).to eq('./banana.test')
    expect($helpers.replace_extension('/woof/banana.txt', 'html')).to eq('/woof/banana.html')
    expect($helpers.replace_extension('banana', 'html')).to eq('./banana.html')
  end
end
