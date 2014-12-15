module WebSync
  class Config < Sinatra::Base
    register Sinatra::Flash

    use Rack::Logger
    use Rack::RawUpload
    use Rack::Locale
    helpers Helpers

    configure :development do
      Bundler.require(:development)
      set :assets_debug, true
      use PryRescue::Rack
    end

    configure :production do
      Bundler.require(:production)
      set :assets_css_compressor, :sass
      set :assets_js_compressor, :closure
      OmniAuth.config.full_host = $config["host_url"]
    end
    configure :test do
      set :raise_errors, true
      set :dump_errors, true
      set :show_exceptions, false
      set :assets_debug, true
      # This is kind of a hack. This allows dynamic files in test mode.
      app = self
      get '/assets/*' do |key|
        if Sprockets::Helpers.digest
          key.gsub!(/(-\w+)(?!.*-\w+)/, "")
        end
        asset = app.sprockets[key]
        content_type asset.content_type
        binding.pry
        if Sprockets::Helpers.expand
          return asset.body
        end
        asset.to_s
      end
    end
    configure do
      set :public_folder, File.dirname(__FILE__) + '/../public'
      set :views, File.dirname(__FILE__)+"/../views"
      use Rack::Session::Cookie, :expire_after => 60*60*24*7, :secret => $config['session_secret']
      enable :sessions
      set :session_secret, $config['session_secret']
      set :server, 'thin'
      disable :show_exceptions
      disable :raise_errors
      set :template_engine, :erb

      I18n::Backend::Simple.send(:include, I18n::Backend::Fallbacks)
      I18n.enforce_available_locales = false
      I18n.load_path = Dir[File.join(settings.root, '..', 'locales', '*.yml')]
      I18n.backend.load_translations
      register Sinatra::AssetPipeline
      #sprockets.append_path File.join(root, 'assets', 'css')
      sprockets.append_path File.join(root, 'assets', 'digest')
      sprockets.append_path File.join(root, 'assets', 'bower_components')
      sprockets.append_path File.join(root, 'assets', 'src')
      sprockets.append_path File.join(root, 'assets', 'templates')
      sprockets.append_path File.join(root, 'assets', 'lib')
      set :assets_precompile, %w(default.css edit.css bundle-norm.js bundle-edit.js theme-*.css) # *.woff *.png *.favico *.jpg *.svg *.eot *.ttf
      path = File.join(root, '../assets', '{src,lib}', "*.js")
      no_digest = Dir.glob(path).map{|f| f.split("/").last}
      set :assets_precompile_no_digest, no_digest

      # OmniAuth configuration
      use OmniAuth::Builder do
        def style provider, color, tag
          $config["omniauth"] ||= {}
          $config["omniauth"][provider.to_sym] = {color: color, tag: tag}
        end
        # This is a huge hack.
        eval(File.read('./config/omniauth-providers.rb'))
      end
    end
  end
end
