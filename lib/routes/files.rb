module WebSync
  module Routes
    class Files < Base
      get '/' do
        @javascripts = []
        if logged_in?
          erb :file_list
        else
          cache do
            erb :index
          end
        end
      end
      get '/deleted' do
        login_required
        erb :deleted
      end
      get '/public' do
        cache time: 30 do
          erb :public
        end
      end
    end
  end
end
