# This file contains all of the ruby database connections and models.

# Ease of use connection to the redis server.
$redis = Redis.new :driver=>:hiredis, :host=>$config['redis']['host'], :port=>$config['redis']["port"]
DataMapper.setup(:default, 'postgres://'+$config['postgres'])
class Document
    include DataMapper::Resource
    property :id, Serial
    property :name, Text
    property :body, Json, :default=>{}, :lazy=>true
    property :created, DateTime
    property :last_edit_time, DateTime
    property :public, Boolean, :default=>false
    property :config, Json, :default=>{}
    has n, :assets, :through => Resource
    has n, :changes
    belongs_to :user
    def config_set key, value
        n_config = config.dup
        n_config[key]=value
        self.config= n_config
    end
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
class User
    include DataMapper::Resource
    property :email, String, :key=>true
    property :password, BCryptHash
    property :group, String, :default=>'user'
    property :anonymous, Boolean, :default=> false
    has n, :documents
    has n, :changes
    property :config, Json, :default=>{}
    def config_set key, value
        n_config = config.dup
        n_config[key]=value
        self.config= n_config
    end
end
class AnonymousUser < User; end
DataMapper.finalize
DataMapper.auto_upgrade!
