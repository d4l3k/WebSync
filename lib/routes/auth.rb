module WebSync
  module Routes
    # The routes responsible for authentication (login, register, oauth).
    class Auth < Base
      helpers do
        def already_logged_in
          flash[:warning] = "<strong>Error!</strong> Already logged in!"
          redirect '/'
        end
      end
      # OmniAuth: Support both GET and POST for callbacks
      %w(get post).each do |method|
        send(method, "/auth/:provider/callback") do
          if logged_in?
            already_logged_in
          else
            hash = env["omniauth.auth"]
            email = hash["info"]["email"].downcase
            provider = hash['provider']
            nice_provider = $config["omniauth"][provider.to_sym][:tag]
            user = User.get(email)
            if user.nil?
              User.create({
                email: email,
                password: "",
                origin: provider
              })
            elsif !user.origin.split(',').include?(provider)
              flash[:danger] = "<strong>Error!</strong> #{email} is not enabled for #{nice_provider} login."
              redirect '/login'
            end
            puts "[OAuth Login] #{email} #{provider}"
            generate_and_set_session_key(email)
            redirect '/'
          end
        end
      end
      get '/login' do
        if !logged_in?
          cache do
            erb :login
          end
        else
          already_logged_in
        end
      end
      post '/login' do
        redirect_loc = '/'
        if params[:redirect]!=''
          redirect_loc = params[:redirect]
        end
        if authenticate params[:email],params[:password]
          redirect redirect_loc
        else
          flash[:danger]="<strong>Error!</strong> Incorrect username or password."
          redirect "/login?#{redirect_loc}"
        end
      end
      get '/register' do
        redirect '/login'
      end
      post '/register' do
        if register(params[:email], params[:password])
          redirect '/'
        else
          flash[:danger]="<strong>Error!</strong> Failed to register. Account might already exist."
          redirect '/login'
        end
      end
      get '/logout' do
        if logged_in?
          logout
        end
        redirect '/login'
      end
    end
  end
end
