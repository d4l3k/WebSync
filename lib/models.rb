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
            Property::BetterBlob => { :primitive => 'BYTEA' },
            Property::Binary => { :primitive => 'BYTEA'                                                      },
            BigDecimal       => { :primitive => 'NUMERIC',          :precision => precision, :scale => scale },
            Float            => { :primitive => 'DOUBLE PRECISION'                                           }
          ).freeze
        end
      end
    end
  end
end # module DataMapper

# Ease of use connection to the redis server.
$redis = Redis.new :driver=>:hiredis, :host=>$config['redis']['host'], :port=>$config['redis']["port"]
DataMapper.setup(:default, 'postgres://'+$config['postgres'])
=begin
# DEPRECATED: This is used for document resources.
class Blob
    include DataMapper::Resource
    property :name, Text, key: true
    property :data, DataMapper::Property::BetterBlob, lazy: true # Under 10 MB
    property :type, Text
    property :edit_time, DateTime
    property :create_time, DateTime
    belongs_to :document, key: true
end
# DEPRECATED
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
=end
# All file data
class WSFile
    include DataMapper::Resource
    property :id, Serial
    property :name, Text, lazy: false
    property :data, DataMapper::Property::BetterBlob, lazy: true, required: false
    property :content_type, Text, lazy: false
    property :edit_time, DateTime
    property :create_time, DateTime
    property :directory, Boolean, default: false
    property :body,             Json,       :default=>{}, :lazy=>true
    property :visibility,       String,     :default=>"private"
    property :default_level,    String,     :default=>"viewer"
    property :config,           Json,       :default=>{}
    property :deleted,          Boolean,    :default=>false
    has n, :asset_ws_files, 'AssetWSFile', child_key: [ :file_id ]
    has n, :assets, through: :asset_ws_files
    has n, :changes, child_key: [ :file_id ]
    has n, :permissions, child_key: [ :file_id ]
    has n, :users, model: 'User', :through => :permissions
    has n, :children, self, child_key: [ :parent_id ]
    belongs_to :parent, self, required: false
    def data= blob
        $postgres.exec_prepared('wsfile_update', [self.id, {value: blob, format: 1}])
    end
    def data
        response = $postgres.exec_prepared('wsfile_get', [self.id], 1)
        response.to_a.length==1 && response[0]["data"] || ""
    end
    def config_set key, value
        n_config = config.dup
        n_config[key]=value
        self.config= n_config
    end
    def size
        size = 0
        request = $postgres.exec_prepared('wsfile_size', [self.id])
        size += request[0].map{|k,v| v.to_i || 0}.inject(:+)
        $postgres.exec_prepared('wsfile_blobs_size', [self.id]).each do |doc|
            size += doc.map{|k,v| v.to_i || 0}.inject :+
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
class AssetWSFile
    include DataMapper::Resource
    belongs_to  :asset,  key: true
    belongs_to  :file,  model: WSFile,  key: true
end
class User
    include DataMapper::Resource
    property :email, String, :key=>true
    property :password, BCryptHash
    property :group, String, :default=>'user'
    has n, :permissions
    has n, :files, model: WSFile, :through => :permissions
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
    property    :level, Text,           default: 'viewer' # owner, editor
    belongs_to  :user,  key: true
    belongs_to  :file,  model: WSFile,  key: true
end
class Change
    include DataMapper::Resource
    property :id, Serial
    property :time, DateTime
    property :patch, Json
    property :parent, Integer
    belongs_to :user
    belongs_to :file, 'WSFile'
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
    has n, :asset_ws_files, 'AssetWSFile'
    has n, :files, 'WSFile', :through => :asset_ws_files
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

postgres_creds = URI.parse('postgres://'+$config['postgres'])
$postgres = PG.connect({host: postgres_creds.host, dbname: postgres_creds.path[1..-1], user: postgres_creds.user, password: postgres_creds.password})
$postgres.prepare("insert_blob", "INSERT INTO blobs (name, data, type, edit_time, create_time, document_id) VALUES ($1, $2, $3, $4, $5, $6)")
$postgres.prepare("update_blob", "UPDATE blobs SET data = $1, type = $2, edit_time = $3 WHERE name = $4 AND document_id = $5")
$postgres.prepare("get_blob", "SELECT data::bytea, type::text FROM blobs WHERE name::text = $1 AND document_id::int = $2 LIMIT 1")
$postgres.prepare("wsfile_blobs_size", "SELECT octet_length(data), octet_length(body) AS octet_length2 FROM ws_files WHERE parent_id=$1")
$postgres.prepare("wsfile_size", "SELECT octet_length(data), octet_length(body) AS octet_length2 FROM ws_files WHERE id=$1 LIMIT 1")

$postgres.prepare("wsfile_update", "UPDATE ws_files SET data = $2 WHERE id = $1")
$postgres.prepare("wsfile_get", "SELECT data::bytea FROM ws_files WHERE id::int = $1 LIMIT 1")
