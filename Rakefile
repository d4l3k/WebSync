require 'bundler'
ENV['RACK_ENV']='production'
require 'sass'
Bundler.require(:default,:development,:production)
require 'rake'
require 'rake/tasklib'
require 'rake/sprocketstask'
require 'rake/testtask'
Rake::TestTask.new do |t|
    t.pattern = "spec/*_spec.rb"
end
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
ENV["CONFIGMODE"] = "y"
require './lib/main'
AssetPipeline::Task.define! WebSync

namespace :admin do
    task :add, :email do |task, args|
        require './lib/models'
        User.get(args[:email]).update(group:"admin")
    end
    task :remove, :email do |task, args|
        require './lib/models'
        User.get(args[:email]).update(group:"user")
    end
end

task :time, :email do |task, args|
    text = `git_time_extractor`
    data = CSV.parse(text)
    time = 0
    commits = 0
    data.each do |line|
        if not args.has_key? :email or args[:email]==line[3] or args[:email]==line[4]
            commits += 1
            time += line[1].to_i
        end
    end
    puts "Number of Commits: #{commits}, Hours: #{time/60.0}"
end
task :loc do
    system("cloc lib Gemfile Rakefile config.ru views assets/stylesheets/{main,edit}.scss bin --force-lang=html,erb --force-lang=ruby,Rakefile assets/javascripts/{edit,core,bundle-edit,bundle-norm}.js assets/no_digest config.json Dockerfile config spec")
end
task :beautify do
    system("js-beautify -r assets/javascripts/{edit,core}.js assets/no_digest/*.js bin/backend.js")
    system("css-beautify -r assets/stylesheets/*.scss")
end
task :documentation do
    system("docco assets/javascripts/{edit,core}.js assets/no_digest/*.js lib/*.rb bin/backend.js")
end
task :hooks do
    system("ln -s ../../hooks/pre-commit.sh .git/hooks/pre-commit")
end
