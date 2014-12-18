module WebSync
  module Routes
    # Routes responsible for displaying documentation.
    class Documentation < Base
      get '/documentation' do
        cache do
          erb :documentation
        end
      end
    end
  end
end
