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
             Rake::Task["documentation"].invoke
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
    system("cloc lib/* Gemfile Rakefile config.ru views/* assets/css/{main,edit}.scss bin/* --force-lang=html,erb --force-lang=ruby,Rakefile assets/digest/{edit,core,bundle-edit,bundle-norm}.js assets/src config.json Dockerfile config spec/* hooks/*")
end
# Calculates the time taken using the COCOMO basic organic software project model.
task :cocomo do
    # Average Salary
    average_salary = 56286
    # Management/design overhead. sloccount use 2.4
    overhead = 1.0
    # COCOMO constants for an organic software project
    a_b = 2.4
    b_b = 1.05
    c_b = 2.5
    d_b = 0.38

    csv = `cloc lib/* Gemfile Rakefile config.ru views/* assets/css/{main,edit}.scss bin/* --force-lang=html,erb --force-lang=ruby,Rakefile assets/digest/{edit,core,bundle-edit,bundle-norm}.js assets/src config.json Dockerfile config spec/* hooks/* --csv`.split("\n\n").last
    data = CSV.parse(csv)
    lines = data.map{|a|a[4].to_i}.inject(:+)
    kloc = lines/1000.0
    # Effort Applied (E) person-months
    effort_applied = a_b*kloc**b_b
    puts "Effort Applied (E): #{effort_applied.round(1)} person-months"
    # Development Time (D) months
    development_time = c_b*effort_applied**d_b
    puts "Development Time (D): #{development_time.round(1)} months"
    # People Required (P) count
    people_required = effort_applied/development_time
    puts "People Required (P): #{people_required.round(1)}"
    cost = effort_applied/12 * average_salary * overhead
    puts "Total Cost: $#{cost.to_i}"
end
task :beautify do
    files = %w(
        assets/digest/{edit,core}.js
        assets/src/*.js
        bin/backend.js
        config.json
        package.json
        )
    paths = []
    files.each do |file|
        paths += Dir.glob(file)
    end
    system("js-beautify -r #{paths.join " "}")
    #system("css-beautify -r assets/stylesheets/*.scss")
end
task :documentation do
    files = %w(
        assets/digest/{edit,core}.js
        assets/src/*.js
        lib/*.rb
        bin/backend.js
        )
    paths = []
    files.each do |file|
        paths += Dir.glob(file)
    end
    system("docco #{paths.join " "}")
end
task :hooks do
    %w(pre-commit pre-push).each do |hook|
        unless File.exists? ".git/hooks/#{ hook }"
            system("ln -s ../../hooks/#{ hook }.sh .git/hooks/#{ hook }")
        else
            puts "Warning: #{hook} already exists."
        end
    end
end
