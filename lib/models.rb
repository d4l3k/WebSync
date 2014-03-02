# This file contains all of the ruby database connections and models.

# Monkey patched Redis for easy caching.
class Redis
  def cache(key, expire=nil)
    if (value = get(key)).nil?
      value = yield(self)
      set(key, value)
      expire(key, expire) if expire
      value
    else
      value
    end
  end
end
# Ease of use connection to the redis server.
$redis = Redis.new :driver=>:hiredis, :host=>$config['redis']['host'], :port=>$config['redis']["port"]
DataMapper.setup(:default, 'postgres://'+$config['postgres'])
bits = URI.parse('postgres://'+$config['postgres'])
$postgres = PG.connect({host: bits.host, dbname: bits.path[1..-1], user: bits.user, password: bits.password})
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
    has n, :blobs
    def config_set key, value
        n_config = config.dup
        n_config[key]=value
        self.config= n_config
    end
    def size
        size = 0
        size += $postgres.exec_prepared('document_size', [self.id])[0]["octet_length"].to_i
        $postgres.exec_prepared('document_blobs_size', [self.id]).each do |doc|
            size += doc["octet_length"].to_i
        end
        size
    end
    UNITS = %W(B KB MB GB TB).freeze
    def as_size
        number = self.size
        if number.to_i < 1000
            exponent = 0
        else
            max_exp  = UNITS.size - 1
            exponent = ( Math.log( number ) / Math.log( 1000 ) ).to_i # convert to base
            exponent = max_exp if exponent > max_exp # we need this to avoid overflow for the highest unit
            number  /= 1000.0 ** exponent
        end
       "#{number.round(1)} #{UNITS[ exponent ]}"
    end
end
module DataMapper
  class Property
    class BetterBlob < Object

      # Returns maximum property length (if applicable).
      # This usually only makes sense when property is of
      # type Range or custom
      #
      # @return [Integer, nil]
      #   the maximum length of this property
      #
      # @api semipublic

        def load(value)
          super.dup.force_encoding("BINARY") unless value.nil?
        end

        def dump(value)
          value.dup.force_encoding("BINARY") unless value.nil?
        rescue
          value
        end
     end
  end # class Property
  module Migrations
    module PostgresAdapter
      module ClassMethods
        # Types for PostgreSQL databases.
        #
        # @return [Hash] types for PostgreSQL databases.
        #
        # @api private
        def type_map
          precision = Property::Numeric.precision
          scale     = Property::Decimal.scale

          super.merge(
            Property::BetterBlob => { :primitive => 'BYTEA'                                                      },
            Property::Binary => { :primitive => 'BYTEA'                                                      },
            BigDecimal       => { :primitive => 'NUMERIC',          :precision => precision, :scale => scale },
            Float            => { :primitive => 'DOUBLE PRECISION'                                           }
          ).freeze
        end
      end
    end
  end
end # module DataMapper
class Blob
    include DataMapper::Resource
    property :name, Text, key: true
    property :data, DataMapper::Property::BetterBlob, lazy: true # Under 10 MB
    property :type, Text
    property :edit_time, DateTime
    property :create_time, DateTime
    belongs_to :document, key: true
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

if Asset.count == 0 && $config.has_key?("default_assets")
    puts "[DATABASE] Creating default assets."
    $config["default_assets"].each do |asset|
        a = Javascript.create(name:asset["name"],description:asset["description"],url:asset["url"])
        puts " :: Creating: #{asset["name"]}, Success: #{a.save}"
    end
end
if AssetGroup.count == 0 && $config.has_key?("default_asset_groups")
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
if Theme.count == 0 && $config.has_key?("default_themes")
    puts "[DATABASE] Creating defaut themes."
    $config["default_themes"].each do |theme|
        a = Theme.create(name: theme["name"], location: theme["stylesheet_tag"])
        puts " :: Creating: #{theme["name"]}, Success: #{a.save}"
    end
end

$postgres.prepare("insert_blob", "INSERT INTO blobs (name, data, type, edit_time, create_time, document_id) VALUES ($1, $2, $3, $4, $5, $6)")
$postgres.prepare("update_blob", "UPDATE blobs SET data = $1, type = $2, edit_time = $3 WHERE name = $4 AND document_id = $5")
$postgres.prepare("get_blob", "SELECT data::bytea, type::text FROM blobs WHERE name::text = $1 AND document_id::int = $2 LIMIT 1")
$postgres.prepare("document_blobs_size", "SELECT octet_length(data) FROM blobs WHERE document_id=$1")
$postgres.prepare("document_size", "SELECT octet_length(body) FROM documents WHERE id=$1 LIMIT 1")
