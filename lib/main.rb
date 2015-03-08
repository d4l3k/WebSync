# It was the night before Christmas and all through the house, not a creature was coding: UTF-8, not even with a mouse.
require 'bundler'
require 'sass'
Bundler.require(:default)
require 'tempfile'
require 'digest/md5'

# Load the JSON+Comments configuration file.
require_relative 'strip_json_comments'
$config = MultiJson.load(
  "{\n"+
    JSONComments.strip(File.open('./config/config.json').read)+
  "\n}")

# Don't load databases if running rake tasks.
if not ENV["CONFIGMODE"]
  require_relative 'models'
  require_relative 'first_time'
end
require_relative 'util'
require_relative 'helpers'
require_relative 'webdav'
require_relative 'configure'

# WebSync wrapper module
module WebSync
  # The main application class.
  class App < Config
    # OmniAuth configuration
    use OmniAuth::Builder do
      def style provider, color, tag
        $config["omniauth"] ||= {}
        $config["omniauth"][provider.to_sym] = {color: color, tag: tag}
      end
      # This is a huge hack.
      eval(File.read('./config/omniauth-providers.rb'))
    end

    require_relative 'routes/base'
    Dir.glob('lib/routes/*.rb').each do |file|
      require_relative '../'+file
    end

    use Routes::Admin
    use Routes::Auth
    use Routes::Document
    use Routes::Documentation
    use Routes::Errors
    use Routes::Files
    use Routes::Settings
    use Routes::UploadDownload
    use Routes::XHR

    use Routes::ApiFileNav
  end
end

