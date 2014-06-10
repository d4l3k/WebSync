require './lib/main'
map '/webdav/' do
    run DAV4Rack::Handler.new(resource_class: WSFileResource, root_uri_path: '/webdav/', log_to: ['log/webdav.log', Logger::DEBUG])
  end
map '/w/' do
    run DAV4Rack::Handler.new(resource_class: WSFileResource, root_uri_path: '/w/', log_to: ['log/webdav.log', Logger::DEBUG])
  end
map '/' do
    run WebSync
end
