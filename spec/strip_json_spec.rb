require File.expand_path '../test_helper.rb', __FILE__
require_relative '../lib/strip_json_comments'

describe 'JSONComments' do
  it 'should strip //' do
    data = "123\n123//456\n123\n"
    expect(JSONComments.strip(data)).to eq("123\n123\n123\n")
  end
  it 'should strip /* */' do
    data = "123\n1/*23//456\n12*/3\n"
    expect(JSONComments.strip(data)).to eq("123\n13\n")
  end
end
