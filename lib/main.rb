# It was the night before Christmas and all through the house, not a creature was coding: UTF-8, not even with a mouse.
require 'bundler'
require 'sass'
Bundler.require(:default)
require 'tempfile'
require 'digest/md5'

# Load the JSON+Comments configuration file.
require_relative 'strip_json_comments'
$config = MultiJson.load(
    "{\n"+
        JSONComments.strip(File.open('./config/config.json').read)+
    "\n}")

require_relative 'models'
# Don't load databases if running rake tasks.
if not ENV["CONFIGMODE"]
    require_relative 'configure'
end
require_relative 'util'
require_relative 'raw_upload'
require_relative 'webdav'

class WebSync < Sinatra::Base
    register Sinatra::Flash
    use Rack::Logger
    use Rack::RawUpload
    helpers do
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
    configure :development do
        Bundler.require(:development)
        set :assets_debug, true
        use PryRescue::Rack
    end

    configure :production do
        Bundler.require(:production)
        set :assets_css_compressor, :sass
        set :assets_js_compressor, :closure
        set :assets_precompile, %w(default.css edit.css bundle-norm.js bundle-edit.js theme-*.css) # *.woff *.png *.favico *.jpg *.svg *.eot *.ttf
        no_digest = Dir.glob(File.join(root, 'assets', 'js', '{src,lib}', "*.js")).map{|f| f.split("/").last}
        set :assets_precompile_no_digest, no_digest
        OmniAuth.config.full_host = $config["host_url"]
    end
    configure do
        set :public_folder, File.dirname(__FILE__) + '/../public'
        set :views, File.dirname(__FILE__)+"/../views"
        use Rack::Session::Cookie, :expire_after => 60*60*24*7, :secret => $config['session_secret']
        enable :sessions
        set :session_secret, $config['session_secret']
        set :server, 'thin'
        disable :show_exceptions
        disable :raise_errors
        set :template_engine, :erb
        register Sinatra::AssetPipeline
        #sprockets.append_path File.join(root, 'assets', 'css')
        sprockets.append_path File.join(root, 'assets', 'digest')
        sprockets.append_path File.join(root, 'assets', 'src')
        sprockets.append_path File.join(root, 'assets', 'lib')

        # OmniAuth configuration
        use OmniAuth::Builder do
            def style provider, color, tag
                $config["omniauth"] ||= {}
                $config["omniauth"][provider.to_sym] = {color: color, tag: tag}
            end
            # This is a huge hack.
            eval(File.read('./config/omniauth-providers.rb'))
        end
    end
    # Block most XHR (originated from javascript). This stops scripts from doing anything malicious to other documents.
    before do
        # Allow static assets.
        if request.xhr? and not request.path_info.match %r{^/assets/}
            referer = URI.parse(request.env["HTTP_REFERER"]).path
            path = request.path_info
            bits = referer.split("/")
            doc = bits[1]
            # Only allow same document and post "upload" and get "assets/#{asset}".
            if bits.length < 2 or not (
                    request.post? and path.match %r{^/#{doc}/upload$} or
                    request.get?  and path.match %r{^/#{doc}/assets/} )
                halt 403
            end
        end
    end
    # OmniAuth: Support both GET and POST for callbacks
    %w(get post).each do |method|
        send(method, "/auth/:provider/callback") do
            env['omniauth.auth'] # => OmniAuth::AuthHash
            if logged_in?
                flash[:danger] = "<strong>Error!</strong> Already logged in!"
                redirect '/'
            else
                hash = env["omniauth.auth"]
                email = hash["info"]["email"].downcase
                provider = hash['provider']
                nice_provider = $config["omniauth"][provider.to_sym][:tag]
                user = User.get(email)
                if user.nil?
                    user = User.create({email: email, password: "", origin: provider})
                elsif not user.origin.split(',').include?(provider)
                    flash[:danger] = "<strong>Error!</strong> #{email} is not enabled for #{nice_provider} login."
                    redirect '/login'
                end
                puts "[OAuth Login] #{email} #{provider}"
                session_key = SecureRandom.uuid
                $redis.set("userhash:#{session_key}",email)
                session['userhash']=session_key
                session['user']=email
                redirect '/'
            end
        end
    end
    get '/public' do
        cache time: 30 do
            erb :public
        end
    end
    get '/login' do
        if !logged_in?
            cache do
                erb :login
            end
        else
            flash[:warning]="Already logged in."
            redirect '/'
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
        if register params[:email],params[:password]
            redirect '/'
        else
            flash[:danger]="<strong>Error!</strong> Failed to register. Account might already exist?"
            redirect '/login'
        end
    end
    get '/logout' do
        if logged_in?
            logout
        end
        redirect '/login'
    end
    not_found do
        erb :error, locals:{error: "404", reason: "Page or document not found."}
    end
    error 403 do
        erb :error, locals:{error: "403", reason: "Access denied."}
    end
    error 400 do
        erb :error, locals:{error: "400", reason: "Invalid request."}
    end
    error 500 do
        erb :error, locals:{error: "500", reason: "The server failed to handle your request."}
    end
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
        if user.origin != provider_string and not provider_list.empty?
            if provider_list.include? "local" and user.password == ""
                flash.now[:danger] = "You have to set a password to use the local login."
            else
                flash.now[:success] = "Updated providers."
                user.origin = provider_string
            end
        else
            flash.now[:danger] = "You have to specify a login method."
        end
        user.save
        erb :settings
    end
    get '/admin' do
        admin_required
        erb :admin
    end
    get '/admin/users' do
        admin_required
        erb :admin_users
    end
    get '/admin/assets' do
        admin_required
        erb :admin_assets
    end
    get '/admin/assets/:asset/edit' do
        admin_required
        erb :admin_assets_edit
    end
    get '/admin/assets/:asset/delete' do
        admin_required
        ass = Asset.get(params[:asset])
        if not ass.nil?
            ass.destroy
        end
        redirect '/admin/assets'
    end
    post '/admin/assets/:asset/edit' do
        admin_required
        ass = Asset.get(params[:asset])
        if not ass.nil?
            ass.name = params[:name]
            ass.description = params[:desc]
            ass.url = params[:url]
            ass.type = params[:type]
            ass.save
        else
            n_ass = Asset.create(:name=>params[:name],:description=>params[:desc],:url=>params[:url], :type=>params[:type])
            n_ass.save
        end
        redirect '/admin/assets'
    end
    get '/admin/asset_groups/:asset/edit' do
        admin_required
        erb :admin_asset_groups_edit
    end
    get '/admin/asset_groups/:asset_group/:asset/add' do
        admin_required
        ass = AssetGroup.get(params[:asset_group])
        ass.assets << Asset.get(params[:asset])
        ass.save
        redirect "/admin/asset_groups/#{params[:asset_group]}/edit"
    end
    get '/admin/asset_groups/:asset_group/:asset/remove' do
        admin_required
        ass = AssetGroup.get(params[:asset_group])
        ass.assets.each do |a|
            if a.id==params[:asset].to_i
                ass.assets.delete a
            end
        end
        ass.save
        redirect "/admin/asset_groups/#{params[:asset_group]}/edit"
    end
    get '/admin/asset_groups/:asset/delete' do
        admin_required
        ass = AssetGroup.get(params[:asset])
        if not ass.nil?
            ass.assets = []
            ass.save
            ass.destroy
        end
        redirect '/admin/assets'
    end
    post '/admin/asset_groups/:asset/edit' do
        admin_required
        ass = AssetGroup.get(params[:asset])
        if not ass.nil?
            ass.name = params[:name]
            ass.description = params[:desc]
            ass.save
        else
            n_ass = AssetGroup.create(:name=>params[:name],:description=>params[:desc])
            n_ass.save
        end
        redirect '/admin/assets'
    end
    get '/new/:group' do
        login_required
        group = AssetGroup.get(params[:group])
        if group.nil?
            halt 400
        end
        doc = WSFile.create(
            name: "Unnamed #{group.name}",
            body: {body:[]},
            create_time: Time.now,
            edit_time: Time.now,
            content_type: 'text/websync'
        )
        doc.assets = group.assets
        doc.save
        perm = Permission.create(user: current_user, file: doc, level: "owner")
        redirect "/#{doc.id.encode62}/edit"
    end
    get '/upload' do
        login_required
        cache do
            erb :upload
        end
    end
    post '/upload' do
        login_required
        if params[:file]==nil
            redirect "/upload"
        end
        tempfile = params[:file][:tempfile]
        filename = params[:file][:filename]
        filetype = params[:file][:type]
        content = nil
        # TODO: Split upload/download into its own external server. Right now Unoconv is blocking. Also issues may arise if multiple copies of LibreOffice are running on the same server. Should probably use a single server instance of LibreOffice
        if params["convert"]
            if filetype=="application/pdf"
                content = PDFToHTMLR::PdfFilePath.new(tempfile.path).convert.force_encoding("UTF-8")
            elsif filetype=='text/html'
                content = File.read(tempfile.path)
            else
                system("unoconv","-f","html",tempfile.path)
                exit_status = $?.to_i
                if exit_status == 0
                    content = File.read(tempfile.path+".html")
                    File.delete(tempfile.path + ".html")
                else
                    logger.info "Unoconv failed and Unrecognized filetype: #{params[:file][:type]}"
                end
            end
            File.delete tempfile.path
            if content!=nil
                dom = Nokogiri::HTML(content)
                upload_list = []
                dom.css("img[src]").each do |img|
                    path = img.attr("src").split("/").last
                    # Security check, make sure it starts with RackMultipart and it exists.
                    if File.exists? "/tmp/#{path}" and /^#{tempfile.path}/.match img.attr("src")
                        upload_list.push path
                        img["src"] = "assets/#{path}"
                    end
                end
                # Basic security check
                dom.css("script").remove();
                doc = WSFile.create(
                    name: filename,
                    body: {html: dom.to_html},
                    create_time: Time.now,
                    edit_time: Time.now,
                    content_type: 'text/websync'
                )
                doc.assets = AssetGroup.get(1).assets
                doc.save
                perm = Permission.create(user: current_user, file: doc, level: "owner")
                # Upload images
                upload_list.each do |file|
                    path = "/tmp/#{file}"
                    type = MIME::Types.type_for(path).first.content_type
                    blob = WSFile.create(parent: doc, name: file, content_type: type, edit_time: DateTime.now, create_time: DateTime.now)
                    blob.data = File.read path
                    perm = Permission.create(user: current_user, file: blob, level: "owner")
                    File.delete path
                end
                if doc.id
                    flash[:success] = "'#{h params[:file][:filename]}' was successfully converted."
                    redirect "/#{doc.id.encode62}/edit"
                else
                    flash[:danger] = "'#{h params[:file][:filename]}' failed to be converted."
                    redirect "/"
                end
            else
                flash[:danger] = "'#{h params[:file][:filename]}' failed to be converted."
                redirect "/"
            end
        else
            file = params["file"]
            type = file[:type]
            # Fingerprint file for mime-type if we aren't provided with it.
            if type=="application/octet-stream"
                type = MIME::Types.type_for(file[:tempfile].path).first.content_type
            end
            blob = WSFile.create(name: file[:filename], content_type: type, edit_time: DateTime.now, create_time: DateTime.now)
            blob.data = file[:tempfile].read
            perm = Permission.create(user: current_user, file: blob, level: "owner")
            flash[:success] = "'#{h file[:filename]}' was successfully uploaded."
            redirect "/"
        end
    end
    # This doesn't need to verify authentication because the token is a 16 byte string.
    get '/:doc/download/:id' do
        doc_id, doc = document_auth
        response = $redis.get "websync:document_export:#{ params[:doc].decode62}:#{params[:id]}"
        if response
            ext = $redis.get "websync:document_export:#{ params[:doc].decode62}:#{params[:id]}:extension"
            attachment(doc.name+'.'+ext)
            content_type 'application/octet_stream'
            response
        else
            halt 404
        end
    end
    get '/:doc/json' do
        doc_id, doc = document_auth
        content_type 'application/json'
        MultiJson.dump(doc.body)
    end
    get '/:doc/delete' do
        doc_id, doc = document_auth
        if doc.permissions(level: "owner").user[0]==current_user
            doc.update(deleted: true)
            flash[:danger] = "Document moved to trash."
        else
            halt 403
        end
        redirect '/'
    end
    get '/:doc/undelete' do
        doc_id, doc = document_auth
        if doc.permissions(level: "owner").user[0]==current_user
            doc.update(deleted: false)
            flash[:success] = "Document restored."
        else
            halt 403
        end
        redirect '/'
    end
    get '/:doc/destroy' do
        doc_id, doc = document_auth
        if doc.permissions(level: "owner").user[0]==current_user
            erb :destroy, locals: {doc: doc}
        else
            halt 403
        end
    end
    post '/:doc/destroy' do
        doc_id, doc = document_auth
        if doc.permissions(level: "owner").user[0]==current_user
            if current_user.password == params[:password]
                doc.changes.destroy!
                doc.asset_documents.destroy!
                doc.blobs.destroy!
                doc.permissions.destroy!
                doc.destroy!
                flash[:danger] = "Document erased."
                redirect '/'
            else
                flash.now[:danger] = "<strong>Error!</strong> Incorrect password."
                erb :destroy, locals: {doc: doc}
            end
        else
            halt 403
        end
    end
    get // do
        parts = request.path_info.split("/")
        pass unless parts.length >=3
        doc = parts[1]
        op = parts[2]
        halt 400 unless ["edit","view", "assets"].include? parts[2]
        if op == "upload"
            redirect "/#{doc}/edit"
        end
        doc_id, doc = document_auth doc
        if parts[2] == "assets"
            if parts.length > 3
                cache do
                    file = URI.unescape(parts[3..-1].join("/"))
                    asset = doc.children(name: file)[0]
                    if asset
                        content_type asset.content_type
                        response.write asset.data
                        return
                    else
                        halt 404
                    end
                end
            else
                halt 404
            end
        end
        @javascripts = [
            #'/assets/bundle-edit.js'
        ]
        client_id = $redis.incr("clientid")
        client_key = SecureRandom.uuid
        user = doc.permissions(user: current_user)[0]
        access = user.level if user
        access ||= doc.default_level
        $redis.set "websocket:id:#{client_id}",current_user.email
        $redis.set "websocket:key:#{client_id}", client_key+":#{doc_id}"
        $redis.expire "websocket:id:#{client_id}", 60*60*24*7
        $redis.expire "websocket:key:#{client_id}", 60*60*24*7
        erb :edit, locals:{no_bundle_norm: true, doc: doc, no_menu: true, edit: true, client_id: client_id, client_key: client_key, op: op, access: access}
    end
    post "/:doc/upload" do
        doc_id, doc = document_auth
        editor! doc
        files = []
        if params.has_key? "files"
            files = params["files"]
        elsif params.has_key? "file"
            files.push params["file"]
        end
        files.each do |file|
            type = file[:type]
            # Fingerprint file for mime-type if we aren't provided with it.
            if type=="application/octet-stream"
                type = MIME::Types.type_for(file[:tempfile].path).first.content_type
            end
            ws_file = doc.children(name: file[:filename])[0]
            if ws_file
                ws_file.update edit_time: DateTime.now
                ws_file.data = file[:tempfile].read
            else
                blob = WSFile.create(parent: doc, name: file[:filename], content_type: type, edit_time: DateTime.now, create_time: DateTime.now)
                blob.data = file[:tempfile].read
            end
            $redis.del "url:/#{doc_id.encode62}/assets/#{URI.encode(file[:filename])}"
            redirect "/#{doc_id.encode62}/edit"
        end
        if request.xhr?
            content_type  "application/json"
            return "{}"
        end
    end
end
