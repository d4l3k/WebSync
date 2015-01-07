require_relative 'test_helper.rb'

include Rack::Test::Methods

describe 'WebSync Frontend XHR requests' do
  it 'should fail to load the home page' do
    xhr '/'
    expect(last_response).to be_forbidden
  end
end
