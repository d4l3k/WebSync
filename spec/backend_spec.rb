require File.expand_path '../test_helper.rb', __FILE__

include Rack::Test::Methods

class Faye::WebSocket::Client
  def sendJSON json
    self.send(MultiJson.dump(json))
  end
end

describe "WebSync Backend" do
  before(:all) do
    # Get backend path relative to binary.
    path = File.expand_path(File.dirname(__FILE__))
    backend = File.join(path, '../bin/backend.js')
    # Launch the backend daemon
    $backend_daemon = fork do
      exec "node #{backend} -p 1337"
    end
  end
  it "should successfully connect to the backend" do
    testuser
    get '/new/1'
    expect(last_response).to be_redirect
    follow_redirect!
    expect(last_response).to be_ok
    id = last_response.body.match(%r{id: *"\d+"})[0]
      .split(":").last.strip.gsub('"', '').to_i
    key = last_response.body.match(%r{key: *"\S+"})[0]
      .split(":").last.strip.gsub('"', '')
    counts = %w(connected info)
    count = 0
    sleep 0.1
    EM.run {
      ws = Faye::WebSocket::Client.new("ws://localhost:1337#{last_request.path}")
      open = false
      ws.on :open do |event|
        ws.sendJSON({
          type: 'auth',
          id: id,
          key: key
        })
        puts "OPEN"
        open = true
      end
      ws.on :message do |event|
        data = MultiJson.load(event.data)
        #p [:message, data]
        if count < counts.length
          expect(counts[count]).to eq(data["type"])
          count += 1
        end
        if data["type"] == "info"
          # MD5 of email. Used for gravatar
          expect(data["user_id"]).to eq("9c99794b1873845c864617eb2a7986a2")
          ws.sendJSON({type: 'load_scripts'})
        elsif data["type"] == "ping"
          ws.sendJSON({type: 'ping'})
        elsif data["type"] == "scripts"
          expect(data["css"]).to eq([])
          scripts = AssetGroup.get(1).assets
          expect(scripts.length).to eq(data["js"].length)
          scripts.each do |script|
            expect(data["js"].index("/assets/tables.js")).to be >= 0
          end
          # TODO: Finish testing the backend.
          ws.close
        end
      end
      ws.on :close do |event|
        ws = nil
        expect(open).to eql(true)
        EM.stop
      end
    }
  end
  after(:all) do
    Process.kill("TERM", $backend_daemon)
    destroy_testuser
  end
end
