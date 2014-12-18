module WebSync
  module Helpers
    def h(text)
      Rack::Utils.escape_html(text)
    end
    def t token
      I18n.t(token)
    end
    def l time
      I18n.l(time)
    end
    def find_template(views, name, engine, &block)
      I18n.fallbacks[I18n.locale].each { |locale|
        super(views, "#{name}.#{locale}", engine, &block) }
      super(views, name, engine, &block)
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
       return '<a href="/logout" title="'+t('layout.sign_out')+'"><i class="fa fa-sign-out fa-lg"></i><span class="hidden-phone"> '+t('layout.sign_out')+'</span></a>'
      else
       return '<a href="/login" title="'+t('layout.sign_in')+'"><i class="fa fa-sign-in fa-lg"></i><span class="hidden-phone"> '+t('layout.sign_in')+'</span></a>'
      end
    end
    def cache time: 3600, &block
      return yield if 'development' == ENV['RACK_ENV']

      key = "url:#{I18n.locale}:#{request.path}"
      cached = $redis.get(key)
      page = cached || yield
      etag Digest::SHA1.hexdigest(page)

      if cached
        ttl = $redis.ttl(key)
        response.header['redis-ttl'] = ttl.to_s
        response.header['redis'] = 'HIT'
      else
        response.header['redis'] = 'MISS'
        $redis.setex(key, time, page)
      end
      page
    end
    def document_auth doc_id=nil
      doc_id ||= params[:doc]
      doc_id = doc_id.decode62 if doc_id.is_a? String

      doc = WSFile.get doc_id
      halt 404 if doc.nil?
      if doc.visibility == 'private'
        perms = doc.permissions(user:current_user)
        if not logged_in?
          redirect "/login?#{env["REQUEST_PATH"]}"
        elsif perms.empty? # isn't on the permission list
          halt 403
        end
      end
      doc
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
    def get_mime_type file
      FileMagic.new(FileMagic::MAGIC_MIME).file(file).split(';').first
    end
  end
end
