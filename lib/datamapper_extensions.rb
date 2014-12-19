# WebSync extensions to DataMapper
module DataMapper
  # WebSync extensions to DataMapper properties.
  class Property
    # A stub class representing a postgres BYTEA. This is only used so
    # DataMapper will create it in the schema.
    class BetterBlob < Object
      # A stub load method.
      #
      # @param value [String] the value to load
      # @return [nil]
      def load(value)
          nil
      end

      # A stub dump method.
      #
      # @param value [String] the value to dump
      # @return [nil]
      def dump(value)
          nil
      end
    end
  end # class Property
  module Migrations
    # WebSync extensions to the DataMapper postgres adapter.
    module PostgresAdapter
      # WebSync extensions to the DataMapper postgres adapter class methods.
      # Adds in BetterBlob.
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
