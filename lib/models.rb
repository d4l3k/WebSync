# This file contains all of the ruby database connections and models.

# Ease of use connection to the redis server.
$redis = Redis.new :driver=>:hiredis, :host=>$config['redis']['host'], :port=>$config['redis']["port"]
DataMapper.setup(:default, 'postgres://'+$config['postgres'])
class Document
    include DataMapper::Resource
    property :id,               Serial
    property :name,             Text
    property :body,             Json,       :default=>{}, :lazy=>true
    property :created,          DateTime
    property :last_edit_time,   DateTime
    property :visibility,       String,     :default=>"private"
    property :default_level,    String,     :default=>"viewer"
    property :config,           Json,       :default=>{}
    property :deleted,          Boolean,    :default=>false
    has n, :assets, :through => Resource
    has n, :changes
    has n, :permissions
    has n, :users, 'User', :through => :permissions
    def config_set key, value
        n_config = config.dup
        n_config[key]=value
        self.config= n_config
    end
end
class User
    include DataMapper::Resource
    property :email, String, :key=>true
    property :password, BCryptHash
    property :group, String, :default=>'user'
    has n, :permissions
    has n, :documents, 'Document', :through => :permissions
    has n, :changes
    property :config, Json, :default=>{}
    belongs_to :theme, required: false
    def config_set key, value
        n_config = config.dup
        n_config[key]=value
        self.config= n_config
    end
end
class Theme
    include DataMapper::Resource
    property :name, String, key: true
    property :location, String
    has n, :users
end
class Permission
    include DataMapper::Resource
    property    :level,     Text,       default: "viewer" # owner, editor
    belongs_to  :user,      :key => true
    belongs_to  :document,  :key => true
end
class Change
    include DataMapper::Resource
    property :id, Serial
    property :time, DateTime
    property :patch, Json
    property :parent, Integer
    belongs_to :user
    belongs_to :document
end
# Assets could be javascript or css
class AssetGroup
    include DataMapper::Resource
    property :id, Serial
    property :name, String
    property :description, Text
    has n, :assets, :through => Resource
end
class Asset
    include DataMapper::Resource
    property :id, Serial
    property :name, String
    property :description, Text
    property :url, String
    property :type, Discriminator
    has n, :documents, :through => Resource
    has n, :asset_groups, :through => Resource
end
class Javascript < Asset; end
class Stylesheet < Asset; end
class AnonymousUser 
    attr_accessor :email, :password, :group, :documents, :changes, :config
    def initialize
        @email = "anon@websyn.ca"
        @group = "anonymous"
        @documents = []
        @changes = []
        @config = {}
    end
    def config_set key, value
        self.config
    end
end
DataMapper.finalize
DataMapper.auto_upgrade!

if Asset.count == 0
    puts "[DATABASE] Creating default assets."
    $config["default_assets"].each do |asset|
        a = Javascript.create(name:asset["name"],description:asset["description"],url:asset["url"])
        puts " :: Creating: #{asset["name"]}, Success: #{a.save}"
    end
end
if AssetGroup.count == 0
    puts "[DATABASE] Creating default asset groups."
    $config["default_asset_groups"].each do |group|
        g = AssetGroup.create(name:group["name"],description:group["description"])
        group["assets"].each do |asset|
            a = Asset.first(name:asset)
            if not a.nil?
                g.assets << a
            end
        end
        puts " :: Creating: #{g.name}, Success: #{g.save}"
    end
end
if Theme.count == 0
    puts "[DATABASE] Creating defaut themes."
    $config["default_themes"].each do |theme|
        a = Theme.create(name: theme["name"], location: theme["stylesheet_tag"])
        puts " :: Creating: #{theme["name"]}, Success: #{a.save}"
    end
end
