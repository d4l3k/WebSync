module WebSync
  # This contains all of the Models used by WebSync
  module Models
    # All file data is represented as a WSFile.
    # In a WebSync editable document there will be content in :body,
    # in a binary document there will be the blob in :data.
    class WSFile
      include DataMapper::Resource
      property :id, Serial
      property :name, Text, lazy: false
      property :data, DataMapper::Property::BetterBlob, lazy: true, required: false
      property :content_type, Text, lazy: false
      property :edit_time, DateTime, default: lambda {|r, p| DateTime.now}
      property :create_time, DateTime, default: lambda {|r, p| DateTime.now}
      property :directory, Boolean, default: false
      property :body,             Json,       default: {}, lazy: true
      property :visibility,       String,     default: "private"
      property :default_level,    String,     default: "viewer"
      property :config,           Json,       default: {}
      property :file_properties,  Json,       default: {}
      property :deleted,          Boolean,    default: false
      property :encrypted,        Boolean,    default: false

      has n, :asset_ws_files, 'AssetWSFile', child_key: [ :file_id ]
      has n, :assets, through: :asset_ws_files
      has n, :changes, child_key: [ :file_id ]
      has n, :children, self, child_key: [ :parent_id ]
      has n, :permissions, child_key: [ :file_id ]
      has n, :users, model: 'User', through:  :permissions
      has n, :symmetric_keys
      belongs_to :parent, self, required: false

      # Set the binary data of the file.
      #
      # @param blob [String] the data to set
      def data= blob
        $postgres.exec_prepared('wsfile_update', [self.id, {value: blob, format: 1}])
      end

      # Get the binary data from the file.
      #
      # @return [String] the binary data
      def data
        response = $postgres.exec_prepared('wsfile_get', [self.id], 1)
        response.to_a.length==1 && response[0]["data"] || ""
      end

      # Calculate the size of the body.
      #
      # @return [Number] the number of bytes
      def body_size
        request = $postgres.exec_prepared('wsfile_body_size', [self.id])
        request[0].map{|k,v| v.to_i || 0}.inject(:+)
      end

      # Returns the owner of the document.
      #
      # @return [User] the owner
      def owner
        permission = self.permissions(level: 'owner')[0]
        if permission
          permission.user
        else
          nil
        end
      end

      # Sets a configuration option.
      #
      # @param key [String] the key
      # @param value [String] the value to set
      def config_set key, value
        n_config = config.dup
        n_config[key]=value
        self.config= n_config
      end

      # Sets a file property. Used for WebDAV and file backup.
      #
      # @param key [String] the key
      # @param value [String] the value to set
      def property_set key, value
        n_file_properties = file_properties.dup
        n_file_properties[key]=value
        self.file_properties= n_file_properties
      end

      # Calculate the file size.
      #
      # @param children [Boolean] whether to size recursively or not
      # @return [Integer] number of bytes
      def size(children: true)
        c_size = 0
        request = $postgres.exec_prepared('wsfile_size', [self.id])
        c_size += request[0].map{|k,v| v.to_i }.inject(:+)
        c_size += self.children.map{|child| child.size}.inject(:+) || 0 if children
        c_size
      end

      # Return the IDs of all children recursively.
      #
      # @return [Array<Number>] an array of ids
      def child_ids
        ids = [self.id]
        self.children.each do |child|
          ids += child.child_ids
        end
        ids
      end

      # fast_size is actually slower than size for an element with no children. Otherwise, it's faster. My theory is that looking the child ids up in memory client side is faster than querying the database for them.
      #
      # @return [Integer] number of bytes
      def fast_size
        c_size = 0
        ids = self.child_ids
        q = "SELECT octet_length(data), octet_length(body) AS octet_length2 FROM ws_files WHERE id in (#{ ids.join(", ")})"
        request = $postgres.exec(q)
        request.each do |req|
          c_size += req.map{|k,v| v.to_i }.inject(:+)
        end
        c_size
      end

      # fast_size2 is slightly slower than fast_size
      #
      # @return [Integer] number of bytes
      def fast_size2
        c_size = 0
        $postgres.exec_prepared('wsfile_size_multi', [self.id]).each do |row|
          c_size += row.except('id').map{|k,v| v.to_i}.inject(:+)
        end
        c_size
      end

      # Destroy this file and any children recursively.
      def destroy_cascade
        self.save
        self.children.each do |child|
            child.destroy_cascade
        end
        self.asset_ws_files.destroy
        self.permissions.destroy
        self.changes.destroy
        self.destroy
      end

      # Calls the optimal sizing function depending on whether it has a child or not.
      #
      # @return [Integer] number of bytes
      def optimal_size
        if !children
          self.size children: false
        else
          self.fast_size
        end
      end

      # Standard byte sizes.
      UNITS = %W(B KB MB GB TB).freeze

      # Returns the size of the document in a human readable format.
      #
      # @return [String] human readable number of bytes
      def as_size children: true
        WSFile.human_size(optimal_size)
      end

      # Converts the number of bytes into a human readable format.
      #
      # @param number [Integer] number of bytes
      # @return [String] human readable number of bytes
      def self.human_size number
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

      # Copies the document and all of its children.
      #
      # @return [WSFile] the copy
      def copy
        new_attributes = self.attributes
        new_attributes.delete(:id)
        file = WSFile.create(new_attributes)
        owner = self.permissions(level: 'owner').user.first
        Permission.create(user: owner, file: file, level: "owner")
        self.assets.each do |asset|
            file.assets.push asset
        end
        self.children.each do |child|
            file.children.push child.copy
        end
        file.save
        file.data = self.data
        file
      end
    end

    # The bridge between loadable JavaScript files and a WSFile.
    class AssetWSFile
      include DataMapper::Resource
      belongs_to  :asset,  key: true
      belongs_to  :file,  model: WSFile,  key: true
    end

    # Represents a User on the site.
    class User
      include DataMapper::Resource
      property :email, String, :key=>true
      property :password, BCryptHash
      property :group, String, :default=>'user'
      property :create_time, DateTime, :default=> lambda{|a,b| DateTime.now }
      has n, :permissions
      has n, :files, model: WSFile, :through => :permissions
      has n, :changes
      has n, :keys
      property :config, Json, :default=>{}
      # Used for OmniAuth
      property :origin, String, :default=>'local'
      belongs_to :theme, required: false

      # Sets a configuration option for that user. This isn't used much.
      #
      # @param key [String] the key to set
      # @param value [String] the value to set
      def config_set key, value
        n_config = config.dup
        n_config[key]=value
        self.config= n_config
      end
    end

    # Represents an encryption key, either public or an encrypted private key.
    class Key
        include DataMapper::Resource
        property :id, Serial
        property :type, String
        property :body, Text, unique: true
        property :created, DateTime
        belongs_to :user
    end

    # Represents a symmetric encryption key (usually aes256) that is encrypted for a specific private key.
    class SymmetricKey
      include DataMapper::Resource
      property :id, Serial
      property :body, Text
      property :created, DateTime
      belongs_to :user
    end

    # Represents a theme CSS file.
    class Theme
        include DataMapper::Resource
        property :name, String, key: true
        property :location, String
        has n, :users
    end

    # Represents the connection between a WSFile and a User with permission level. This level can be 'viewer', 'owner' or 'editor'.
    class Permission
        include DataMapper::Resource
        property    :level, Text,           default: 'viewer' # owner, editor
        belongs_to  :user,  key: true
        belongs_to  :file,  model: WSFile,  key: true
    end

    # Represents a change in the JSON of a document.
    class Change
        include DataMapper::Resource
        property :id, Serial
        property :time, DateTime
        property :patch, Json
        property :parent, Integer
        belongs_to :user
        belongs_to :file, 'WSFile'
    end

    # A group of assets that make up a default document type.
    class AssetGroup
        include DataMapper::Resource
        property :id, Serial
        property :name, String
        property :description, Text
        has n, :assets, :through => Resource
    end

    # A dynamically loadable file to the client side in edit mode.
    # Assets could be javascript or css
    class Asset
        include DataMapper::Resource
        property :id, Serial
        property :name, String
        property :description, Text
        property :url, String
        property :type, String, default: 'Javascript'
        has n, :asset_ws_files, 'AssetWSFile'
        has n, :files, 'WSFile', :through => :asset_ws_files
        has n, :asset_groups, :through => Resource
    end

    # A user that isn't logged in.
    class AnonymousUser
        attr_accessor :email, :password, :group, :documents, :changes, :config

        # Initialize the anonymous user
        def initialize
            @email = "anon@websyn.ca"
            @group = "anonymous"
            @documents = []
            @changes = []
            @config = {}
        end

        # Sets a configuration option for that user.
        # This is a stub and doesn't save anything.
        #
        # @param key [String] the key to set
        # @param value [String] the value to set
        def config_set key, value
            self.config
        end
    end
  end
end
