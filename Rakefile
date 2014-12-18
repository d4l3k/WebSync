require 'bundler'
ENV['RACK_ENV']='production'
require 'sass'
require 'rake/tasklib'
ENV["CONFIGMODE"] = "y"

require './lib/main'
task :spec do
  Bundler.require
  require_relative 'lib/models'
  require_relative 'lib/first_time'
  system("hooks/pre-push.sh")
  Process::exit $?.exitstatus
end

task default: :spec

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
AssetPipeline::Task.define! WebSync::App

task :dependencies do
  system('bundle')
  system('npm install')
  system('bower install')
  system('cd assets/bower_components/openpgp&&npm install&&grunt&&cd ../../..')
end

task :deploy do
  Rake::Task['dependencies'].invoke
  Rake::Task['assets:clean'].invoke
  Rake::Task['assets:precompile'].invoke
  system('kill -HUP `cat tmp/pids/unicorn.pid`')
  Rake::Task['cachebust'].invoke
end

task :cachebust do
  require './lib/models'
  puts "Busted: #{$redis.keys("url:*").each do |url|
    $redis.del url
  end.length} keys"
end

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

# Converts an array of files into the file paths.
def f files
  files.map do |path|
    Dir.glob(path)
  end.flatten.uniq.join(' ')
end

RUBY_FILES = f %w(lib/**/* Gemfile Rakefile config.ru spec/**/* views/**/*)
SASS_FILES = f %w(assets/css/{main,edit-sass}.scss)
JAVASCRIPT_FILES = f %w(bin/**/* assets/src/**/* config/config.json bower.json package.json
  assets/digest/{edit,core,bundle-edit,bundle-norm,crypto}.js)
JAVASCRIPT_TEMPLATE_FILES = f %w(assets/templates/**/*)
MISC_FILES = f %w(Dockerfile config/**/* hooks/**/* locales/**/* .travis.yml .gitignore)
ALL_FILES = [RUBY_FILES, SASS_FILES, JAVASCRIPT_FILES, JAVASCRIPT_TEMPLATE_FILES, MISC_FILES].join(' ')

task :time, :email do |task, args|
  puts '=== Git Time Estimation ==='
  text = `git_time_extractor`
  data = CSV.parse(text)
  time = 0
  commits = 0
  data.each do |line|
      if not args.has_key? :email or args[:email]==line[3] or args[:email]==line[4]
          commits += line[1].to_i
          time += line[3].to_i
      end
  end
  puts "Number of Commits: #{commits}, Hours: #{time/60.0}\n\n"
end

task :loc do
  puts '=== Lines of Code ==='
  system("cloc --force-lang=html,erb --force-lang=ruby,Rakefile #{ALL_FILES}")
  puts ''
end

# Calculates the time taken using the COCOMO basic organic software project model.
task :cocomo do
  puts '=== COCOMO Estimates ==='

  # Average Salary
  average_salary = 56286
  # Management/design overhead. sloccount use 2.4
  overhead = 1.0
  # COCOMO constants for an organic software project
  a_b = 2.4
  b_b = 1.05
  c_b = 2.5
  d_b = 0.38

  csv = `cloc --force-lang=html,erb --force-lang=ruby,Rakefile --csv #{ALL_FILES}`.split("\n\n").last
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
  puts "Total Cost: $#{cost.to_i}\n\n"
end

task :doc_stats do
  puts "=== YARD Documentation ==="
  system('yard stats --list-undoc')
  puts ''
end

task stats: [:loc, :time, :cocomo, :doc_stats]

task :update do
  system("bundle update")
  system("npm-check-updates")
  system("npm-check-updates -u")
end

require 'open3'
def get_python2
  if a = which('python2')
    return a
  else
    stdin, stdout, stderr, wait_thr = Open3.popen3('python', '--version')
    response = stdout.gets(nil).to_s + stderr.gets(nil).to_s
    version = response.strip.split(" ")[1]
    if version[0..2] == "2.7"
      return which('python')
    else
      throw 'ERROR: Python2.7 is required!'
    end
  end
end
task :beautify do
    # Use the version in node_modules
    js_beautify_path = "node_modules/js-beautify/js/bin/js-beautify.js"
    system("#{js_beautify_path} -s 2 -r #{JAVASCRIPT_FILES}")

    # Closure-linter screws up the first line of bin/backend.js
    backend = File.readlines("bin/backend.js")
    # Make sure Python2 exists on the system.
    python = get_python2
    fixjsstyle_path = "node_modules/closure-linter-wrapper/tools/fixjsstyle.py"
    system([python, fixjsstyle_path, JAVASCRIPT_FILES].join(" "))
    fixed_backend = File.readlines("bin/backend.js")
    fixed_backend[0] = backend[0]
    File.write("bin/backend.js", fixed_backend.join(""))
end
task :jsdoc do
  system("node_modules/jsdoc/jsdoc.js -d ./public/documentation/jsdoc/ #{JAVASCRIPT_FILES} README.md")
end
task :docco do
  system("node_modules/docco/bin/docco -o public/documentation/docco/ #{JAVASCRIPT_FILES} #{RUBY_FILES}")
end
task :yard do
  system("yard doc -o public/documentation/yard")
end

task documentation: [:docco, :jsdoc, :yard]

task :hooks do
  %w(pre-commit pre-push).each do |hook|
    unless File.exists? ".git/hooks/#{ hook }"
      system("ln -s ../../hooks/#{ hook }.sh .git/hooks/#{ hook }")
    else
      puts "Warning: #{hook} already exists."
    end
  end
end

# This is probably useless and removed. It was an attempt to automate the front
# page picture list.
task :pics do
  require 'pry'
  require 'capybara/poltergeist'
  require_relative './lib/models'
  require_relative './lib/configure'
  require_relative './lib/helpers.rb'
  class TestHelpers
    include Helpers
    def initialize
      @session = {}
    end
    def session
      return @session
    end
    def request
      TestRequest.new
    end
    def etag tag
    end
    def response
      TestResponse.new
    end
  end
  helpers = TestHelpers.new

  user = helpers.register 'test@websyn.ca', 'testboop'
  driver = Capybara::Poltergeist::Driver.new WebSync
  driver.resize(1189, 640)
  root = "http://localhost:9292"
  driver.visit root+'/login?/settings'
  driver.find_css("input[name='email']")[0].set 'test@websyn.ca'
  driver.find_css("input[name='password']")[0].set 'testboop'
  driver.find_css("button")[1].click
  %w{Document Spreadsheet Notebook Presentation}.each do |type|
    id = AssetGroup.all(name: type).first.id
    driver.visit root+"/new/#{id}"
    while !driver.current_url.match(/\/\S{1,3}\/edit$/) || driver.find_css(".bar").length > 0
      sleep 0.05
    end
    driver.find_css("[contenteditable]").last.click
    puts "Exporting: #{type}"
    driver.save_screenshot("/tmp/websync-#{type}.png")
  end
end
