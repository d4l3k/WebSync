require './lib/main'

use Rack::MiniProfiler if ENV.has_key?("PROFILE")

%w{w webdav}.each do |point|
    map "/#{point}/" do
        run DAV4Rack::Handler.new(resource_class: WSFileResource, root_uri_path: "/#{point}/", log_to: ['log/webdav.log', Logger::DEBUG])
    end
end
map '/' do
    run WebSync::App
end
