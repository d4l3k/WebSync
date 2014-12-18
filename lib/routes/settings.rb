module WebSync
  module Routes
    # Routes responsible for user settings.
    class Settings < Base
      get '/settings' do
        login_required
        erb :settings
      end
      post '/settings' do
        login_required
        user = current_user
        user.theme = Theme.get(params["theme"])
        if params["new_password"]!=""
          if user.password == params["cur_password"]
            if params["new_password"] == params["rep_new_password"]
              user.password = params["new_password"]
            else
              flash.now[:danger] = "Passwords don't match."
            end
          else
            flash.now[:danger] = "Incorrect password."
          end
        end
        provider_list = params.keys.select{|k| k.include? "provider"}
          .map{|checkbox| checkbox.split(":").last}
        provider_string = provider_list.join(",")
        if not provider_list.empty?
          if user.origin != provider_string
            if provider_list.include? "local" and user.password == ""
              flash.now[:danger] = "You have to set a password to use the local login."
            else
              flash.now[:success] = "Updated providers."
              user.origin = provider_string
            end
          end
        else
          flash.now[:danger] = "You have to specify a login method."
        end
        user.save
        erb :settings
      end
    end
  end
end
