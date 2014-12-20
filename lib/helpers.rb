module WebSync
  # Helpers for views and routes
  module Helpers

    # Escapes some HTML. Ex: '<' -> '&lt;'
    #
    # @param text [String] the potentially dangerous HTML
    # @return [String] the sanitized text
    def h(text)
      Rack::Utils.escape_html(text)
    end

    # Returns the corresponding i18n localization.
    #
    # @param token [String, Symbol] the i18n locale token
    # @return [String] the corresponding phrase or sentence.
    def t token
      I18n.t(token)
    end

    # Returns the corresponding i18n time localization.
    #
    # @param time [Date, DateTime] the time
    # @return [String] the localized time
    def l time
      I18n.l(time)
    end

    # Finds a template with a i18n locale.
    def find_template(views, name, engine, &block)
      I18n.fallbacks[I18n.locale].each { |locale|
        super(views, "#{name}.#{locale}", engine, &block) }
      super(views, name, engine, &block)
    end

    # Returns the logger corresponding to the request.
    def logger
      request.logger
    end

    # Returns the current logged in user or an AnonymousUser.
    #
    # @return [User, AnonymousUser] the current user
    def current_user
      if logged_in?
        return User.get(session['user'])
      end
      AnonymousUser.new
    end

    # Redirects the current user to the login page if not an admin.
    def admin_required
      if not admin?
        redirect "/login?#{env["REQUEST_PATH"]}"
      end
    end

    # Checks if the current user is an admin
    #
    # @return [Boolean] whether the user is an admin
    def admin?
      c_user = current_user
      not c_user.nil? and c_user.group=="admin"
    end

    # Checks if the current user is logged in
    #
    # @return [Boolean] whether the user is logged in
    def logged_in?
      !session['userhash'].nil? &&
        $redis.get('userhash:'+session['userhash']) == session['user'] &&
        !User.get(session['user']).nil?
    end

    # Redirects the current user to the login page if not logged in
    def login_required
      if !logged_in?
        redirect "/login?#{env["REQUEST_PATH"]}"
      end
    end

    # Registers a user and return them if possible otherwise return nil.
    #
    # @param email [String] email
    # @param pass [String] password
    # @return [User, nil] the user or nil if registration failed.
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

    # Attempts to log in a user an returns if it was successful
    #
    # @param email [String] email
    # @param pass [String] password
    # @param expire [Number] Time in seconds to expire the users login.
    # @return [Boolean] whether the login was successful
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

    # Logs a user out
    def logout
     $redis.del "userhash:#{session['userhash']}"
      session['userhash']=nil
      session['user']=nil
    end

    # Returns a page from the cache if present otherwise takes the result from
    # the provided block and caches it.
    #
    # @param time [Number] time in seconds to cache
    # @yield Should return the expected page value
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

    # Checks if the user has access to a document, otherwise redirects to a
    # login or 403 page.
    #
    # @param doc_id [Number] the optional document id
    # @return [WSFile] the document
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

    # Checks if the user is an editor of a document, otherwise redirects to a
    # 403 page.
    #
    # @param doc [WSFile] checks if an editor of this document
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

    # Returns the MIME type from a file path provided to it.
    #
    # @param file [String] the file path
    # @return [String] the mime type
    def get_mime_type file
      FileMagic.new(FileMagic::MAGIC_MIME).file(file).split(';').first
    end

    # Converts a file into HTML.
    #
    # @param tempfile [TempFile, File] the file to convert
    # @return [String] the HTML content
    def convert_file tempfile
      path = tempfile.path
      filetype = get_mime_type(path)

      if filetype == 'application/pdf'
        convert_pdf_to_html(path)
      elsif filetype == 'text/html'
        File.read(path)
      else
        convert_document_to_html(path)
      end
    end

    # Returns the HTML content from a pdf file path provided to it.
    #
    # @param file [String] the file path
    # @return [String] the HTML content.
    def convert_pdf_to_html file
      PDFToHTMLR::PdfFilePath.new(file).convert.force_encoding("UTF-8")
    end

    # Returns the HTML content from a file path provided to it.
    # This uses unoconv to convert the file.
    #
    # @param file [String] the file path
    # @return [String] the HTML content.
    def convert_document_to_html path
      system("unoconv","-f","html", path)
      exit_status = $?.to_i
      if exit_status == 0
        base_name = File.basename(path, File.extname(path))
        conv_path = File.join(File.dirname(path), base_name) + '.html'
        content = File.read(conv_path)
        File.delete(conv_path)
        content
      else
        logger.info "Unoconv failed and Unrecognized filetype: #{params[:file][:type]}"
      end
    end

    # Do a basic sanitization on the uploaded file to remove any potentially
    # malicious script tags.
    #
    # @param dom [Nokogiri::HTML::Document] the root dom element
    # @return [Nokogiri::HTML::Document] the sanitized element
    def sanitize_upload dom
      # Basic security check
      dom.css("script").remove();
      dom
    end
  end
end
