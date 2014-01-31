require './main'
=begin
map '/assets' do
    environment = Sprockets::Environment.new
    environment.append_path 'public/js'
    environment.append_path 'public/css'
    run environment
end
=end

#map '/' do
    run WebSync
#end
