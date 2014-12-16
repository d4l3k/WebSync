module WebSync
  module Routes
    class Documentation < Base
      get '/documentation' do
        cache do
          erb :documentation
        end
      end
    end
  end
end
