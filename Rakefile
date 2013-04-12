require 'bundler'
ENV['RACK_ENV']='production'
Bundler.require(:default,:development,:production)
require 'rake'
require 'rake/tasklib'
require 'rake/sprocketstask'

module AssetPipeline
    class Task < Rake::TaskLib
      def initialize(app)
        namespace :assets do
          desc "Precompile assets"
          task :precompile do
            environment = app.sprockets
            manifest = Sprockets::Manifest.new(environment.index, app.assets_path)
            manifest.compile(app.assets_precompile)
            # Output non-digested funcs.
            paths = manifest.environment.each_logical_path(app.assets_precompile_no_digest).to_a
            paths.each do |path|
                asset = manifest.environment.find_asset(path)
                target = File.join(manifest.dir, asset.logical_path)
                asset.write_to target
            end
          end

          desc "Clean assets"
          task :clean do
            FileUtils.rm_rf(app.assets_path)
          end
        end
      end

      def self.define!(app)
        self.new app
      end
    end
end
require './main'
AssetPipeline::Task.define! WebSync
