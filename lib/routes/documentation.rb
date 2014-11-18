module WebSync
  module Routes
    class Documentation < Base
      get '/documentation' do
        cache do
          erb :documentation
        end
      end
      get '/documentation/:file.:ext' do
        cache do
          file = "docs/#{params[:file]}.html"
          if Dir.glob("docs/*.html").include? file
            File.read file
          else
            halt 404
          end
        end
      end
    end
  end
end
