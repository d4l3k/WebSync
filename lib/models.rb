# This file contains all of the ruby database connections and models.

require_relative 'redis_extensions'
require_relative 'datamapper_extensions'

# The current database version
DATABASE_FORMAT_VERSION = 1

$redis = Redis.new :driver=>:hiredis, :host=>$config['redis']['host'], :port=>$config['redis']["port"]
postgres_creds = URI.parse('postgres://'+$config['postgres'])
$postgres = PG.connect({host: postgres_creds.host, dbname: postgres_creds.path[1..-1], user: postgres_creds.user, password: postgres_creds.password})

$db_version = $redis.get("websync:db:version").to_i
if $db_version != DATABASE_FORMAT_VERSION
  # Registers a schema migration between database formats.
  #
  # @param range [Range] versions to convert between
  def migrate range
    if $db_version == range.first
      puts "[MIGRATION] Attempting to migrate database from version #{range.first} to #{range.last}."
      yield
      $db_version = range.last
    end
  end
  require_relative 'migrate'
  if $db_version != DATABASE_FORMAT_VERSION
    puts " :: WARNING: Can not migrate to latest database format!"
  end
  $redis.set "websync:db:version", $db_version
end


# Ease of use connection to the redis server.
DataMapper.setup(:default, 'postgres://'+$config['postgres'])

DataMapper.repository(:default).adapter.resource_naming_convention =
  DataMapper::NamingConventions::Resource::UnderscoredAndPluralizedWithoutModule

require_relative 'models/datamapper'

DataMapper.finalize
DataMapper.auto_upgrade!

require_relative 'models/postgres'
