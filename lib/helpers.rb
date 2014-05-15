module Helpers
    def h(text)
        Rack::Utils.escape_html(text)
    end
    def logger
        request.logger
    end
    def current_user
        if logged_in?
            return User.get(session['user'])
        end
        AnonymousUser.new
    end
    def admin_required
        if not admin?
            redirect "/login?#{env["REQUEST_PATH"]}"
        end
    end
    def admin?
        c_user = current_user
        not c_user.nil? and c_user.group=="admin"
    end
    def logged_in?
        (!session['userhash'].nil?)&&$redis.get('userhash:'+session['userhash'])==session['user']
    end
    def login_required
        if !logged_in?
            redirect "/login?#{env["REQUEST_PATH"]}"
        end
    end
    def register email, pass
        email = email.downcase.strip
        if email != "anon@websyn.ca" and User.get(email).nil?
            user = User.create({:email=>email,:password=>pass})
            authenticate email, pass
            return user
        elsif authenticate email, pass
            return current_user
        end
        nil
    end
    def authenticate email, pass, expire=nil
        email.downcase!
        user = User.get(email)
        if user.nil? or not user.origin.split(',').include?('local')
            return false
        end
        if user.password==pass and not pass.empty?
            session_key = SecureRandom.uuid
            $redis.set("userhash:#{session_key}",email)
            session['userhash']=session_key
            session['user']=email
            if !expire.nil?
                $redis.expire("userhash:#{session_key}",expire)
            end
            return true
        end
        false
    end
    def logout
       $redis.del "userhash:#{session['userhash']}"
        session['userhash']=nil
        session['user']=nil
    end
    def render_login_button
        if logged_in?
           return '<a href="/logout" title="Sign Out"><i class="fa fa-sign-out fa-lg"></i><span class="hidden-phone"> Sign Out</span></a>'
        else
           return '<a href="/login" title="Sign In"><i class="fa fa-sign-in fa-lg"></i><span class="hidden-phone"> Sign In</span></a>'
        end
    end
    def cache time: 3600, &block
        if ENV["RACK_ENV"]=="development"
            return yield
        end
        tag = "url:#{request.path}"
        page = $redis.get(tag)
        if page
            etag Digest::SHA1.hexdigest(page)
            ttl = $redis.ttl(tag)
            response.header['redis-ttl'] = ttl.to_s
            response.header['redis'] = 'HIT'
        else
            page = yield
            etag Digest::SHA1.hexdigest(page)
            response.header['redis'] = 'MISS'
            $redis.setex(tag, time, page)
        end
        page
    end
    def document_auth doc_id=nil
        doc_id ||= params[:doc]
        if doc_id.is_a? String
            doc_id = doc_id.decode62
        end
        doc = WSFile.get doc_id
        if doc.nil?
            halt 404
        end
        if doc.visibility=="private"
            perms = doc.permissions(user:current_user)
            if not logged_in?
                redirect "/login?#{env["REQUEST_PATH"]}"
            elsif perms.length==0 # isn't on the permission list
                status 403
                halt 403
            end
        end
        return doc_id, doc
    end
    def editor! doc
        if doc.default_level == "owner" or doc.default_level == "editor"
            return
        else
            perm = doc.permissions(user: current_user)
            if perm.length > 0 && (perm[0].level == "owner" or perm[0].level == "editor")
                return
            end
        end
        halt 403
    end
end
