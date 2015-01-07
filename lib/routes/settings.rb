module WebSync
  module Routes
    # Routes responsible for user settings.
    class Settings < Base
      helpers do
        # Checks the params for an updated password and saves it to the user.
        #
        # @param user [User] the user to apply the password to
        def update_password user
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
        end

        # Checks the params for the theme and saves it to the user.
        #
        # @param user [User] the user to apply the theme to
        def update_theme user
          user.theme = Theme.get(params["theme"])
        end

        # Returns the list of selected providers from the params.
        #
        # @return [Array<String>] the list of providers.
        def get_selected_providers
          params.keys.select do |k|
            k.include? "provider"
          end.map do |checkbox|
            checkbox.split(":").last
          end
        end

        # Updates the list of providers from the params and saves it to the user.
        #
        # @param user [User] the user to apply the providers to
        def update_login_methods user
          provider_list = get_selected_providers
          provider_string = provider_list.join(",")
          if provider_list.empty?
            flash.now[:danger] = "You have to specify a login method."
          elsif user.origin != provider_string
            if provider_list.include? "local" and user.password == ""
              flash.now[:danger] = "You have to set a password to use the local login."
            else
              flash.now[:success] = "Updated providers."
              user.origin = provider_string
            end
          end
        end
      end
      get '/settings' do
        login_required
        erb :settings
      end
      post '/settings' do
        login_required
        user = current_user

        update_theme user
        update_password user
        update_login_methods user

        user.save
        erb :settings
      end
    end
  end
end
