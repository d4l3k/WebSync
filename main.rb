# It was the night before Christmas and all through the house, not a creature was coding: UTF-8, not even with a mouse.
require 'bundler'
require 'sass'
Bundler.require(:default)
require 'tempfile'
require 'digest/md5'
$config = MultiJson.load(File.open('./config.json').read)
# Monkey patched Redis for easy caching.
class Redis
  def cache(key, expire=nil)
    if (value = get(key)).nil?
      value = yield(self)
      set(key, value)
      expire(key, expire) if expire
      value
    else
      value
    end
  end
end
# Ease of use connection to the redis server.
$redis = Redis.new :driver=>:hiredis, :host=>$config['redis']['host'], :port=>$config['redis']["port"]
require './lib/models'
def json_to_html_node obj
    html = "";
    if obj['name']=="#text"
        return obj['textContent']
    end
    html+="<"+obj['name']
    obj.each do |k,v|
        if k!="name"&&k!="textContent"&&k!="childNodes"
            html+=" "+k+"="+MultiJson.dump(v)
        end
    end

    if obj.has_key? 'childNodes'
        html+=">";
        obj['childNodes'].each do |elem|
            html+= json_to_html_node(elem)
        end
        html+="</"+obj['name']+">"
    else
        html+="/>"
    end
    return html
end
def json_to_html obj
    html = ""
    obj.each do |elem|
        html += json_to_html_node(elem)
    end
    return html
end

def node_to_json html
    if html.name=="text"
        return { name: "#text", textContent: html.to_s}
    end
    json = {
        name: html.name.upcase
    }
    if defined? html.attributes
        html.attributes.each do |name, attr|
            json[attr.name]=attr.value
        end
    end
    if html.children.length > 0
        json['childNodes']=[]
        html.children.each do |child|
            json['childNodes'].push( node_to_json(child) )
        end
    end
    return json
end

def html_to_json html
    dom = Nokogiri::HTML(html)
    json = []
    dom.document.children.each do |elem|
        json.push node_to_json(elem)
    end
    return json
end

class WebSync < Sinatra::Base
    register Sinatra::Synchrony
    use Rack::Logger
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
            nil
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
            email.downcase!
            if User.get(email).nil?
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
            if user.nil?
                return false
            end
            if user.password==pass
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
    end

    configure :development do
        Bundler.require(:development)
        set :assets_debug, true
        use PryRescue::Rack
        # Bypass a bug. Works correctly in production.
    end

    configure :production do
        Bundler.require(:production)
        set :assets_css_compressor, :sass
        set :assets_js_compressor, :closure
        set :assets_precompile, %w(default.css edit.scss bundle-norm.js bundle-edit.js) # *.woff *.png *.favico *.jpg *.svg *.eot *.ttf
        no_digest = Dir.glob(File.join(root, 'assets', 'no_digest', "*.js")).map{|f| f.split("/").last}
        set :assets_precompile_no_digest, no_digest
    end
    configure do
        use Rack::Session::Cookie, :expire_after => 60*60*24*7, :secret => $config['session_secret']
        enable :sessions
        set :session_secret, $config['session_secret']
        set :server, 'thin'
        set :sockets, []
        disable :show_exceptions
        disable :raise_errors
        set :template_engine, :erb
        register Sinatra::AssetPipeline
        sprockets.append_path File.join(root, 'assets', 'stylesheets')
        sprockets.append_path File.join(root, 'assets', 'javascripts')
        sprockets.append_path File.join(root, 'assets', 'no_digest')
    end
    $dmp = DiffMatchPatch.new

    #Javascript.first_or_create(:name=>'Tables',:description=>'Table editing support',:url=>'/assets/tables.js')
    #Javascript.first_or_create(:name=>'Chat',:description=>'Talk with other users!',:url=>'/assets/chat.js')
    if Asset.count == 0
        puts "[DATABASE] Creating default assets."
        $config["default_assets"].each do |asset|
            a = Javascript.create(name:asset["name"],description:asset["description"],url:asset["url"])
            puts " :: Creating: #{asset["name"]}, Success: #{a.save}"
        end
    end
    if AssetGroup.count == 0
        puts "[DATABASE] Creating default asset groups."
        $config["default_asset_groups"].each do |group|
            g = AssetGroup.create(name:group["name"],description:group["description"])
            group["assets"].each do |asset|
                a = Asset.first(name:asset)
                if not a.nil?
                    g.assets << a
                end
            end
            puts " :: Creating: #{g.name}, Success: #{g.save}"
        end
    end
    get '/login' do
        if !logged_in?
            erb :login
        else
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
    #get '/assets/*.css' do
    #    content_type 'text/css'
    #    assets_environment[params[:splat][0]+'.css'].to_s
    #end
    #get '/assets/*.js' do
    #    content_type 'text/javascript'
    #    assets_environment[params[:splat][0]+'.js'].to_s
    #end

    get '/' do
        @javascripts = []
        if logged_in?
            erb :file_list
        else
            erb :index
        end
    end
    get '/documentation' do
        erb :documentation
    end
    get '/admin' do
        admin_required
        erb :admin
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
        doc = Document.create(
            :name => "Unnamed #{group.name}",
            :body => {body:[]},
            :created => Time.now,
            :last_edit_time => Time.now,
            :user => current_user
        )
        doc.assets = group.assets
        doc.save
        redirect "/#{doc.id.encode62}/edit"
    end
    get '/upload' do
        login_required
        erb :upload
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
        system("unoconv","-f","html",tempfile.path)
        exit_status = $?.to_i
        if exit_status == 0
            content = File.read(tempfile.path+".html")
        else
            if filetype=="application/pdf"
                content = PDFToHTMLR::PdfFilePath.new(tempfile.path).convert.force_encoding("UTF-8")
            elsif filetype=='text/html'
                content = File.read(tempfile.path)
            elsif filename.split('.').pop=='docx'
                    # This pretty much just reads plain text...
                    content = Docx::Document.open(tempfile.path).to_html.force_encoding("UTF-8")
            else
                logger.info "Unoconv failed and Unrecognized filetype: #{params[:file][:type]}"
            end
        end
        if content!=nil
            # TODO: Upload into JSON format
            doc = Document.create(
                :name => filename,
                :body => {body:html_to_json(content)},
                :created => Time.now,
                :last_edit_time => Time.now,
                :user => current_user
            )
            doc.assets = AssetGroup.get(1).assets
            doc.save
            redirect "/#{doc.id.encode62}/edit"
        else
            redirect "/"
        end
    end
    get '/:doc/download/:format' do
        if !%w(bib doc docx doc6 doc95 docbook html odt ott ooxml pdb pdf psw rtf latex sdw sdw4 sdw3 stw sxw text txt vor vor4 vor3 xhtml bmp emf eps gif jpg met odd otg pbm pct pgm png ppm ras std svg svm swf sxd sxd3 sxd5 tiff wmf xpm odg odp pot ppt pwp sda sdd sdd3 sdd4 sti stp sxi vor5 csv dbf dif ods pts pxl sdc sdc4 sdc3 slk stc sxc xls xls5 xls95 xlt xlt5).include?(params[:format])
            halt 400
        end
        login_required
        doc_id = params[:doc].decode62
        doc = Document.get doc_id
        if doc.nil?
            halt 404
        end
        if (!doc.public)&&doc.user!=current_user
            status 403
            halt 404
        end
        file = Tempfile.new('websync-export')
        file.write( json_to_html( doc.body['body'] ) )
        file.close
        system("unoconv","-f", params[:format], file.path)
        if $?.to_i==0
            export_file = file.path+"."+params[:format]
            response.headers['content_type'] = `file --mime -b export_file`.split(';')[0]
            attachment(doc.name+'.'+params[:format])
            response.write(File.read(export_file))
        else
            halt 500
        end
        file.unlink
    end
    get '/:doc/json' do
        login_required
        doc_id = params[:doc].decode62
        doc = Document.get doc_id
        if doc.nil?
            halt 404
        end
        if (!doc.public)&&doc.user!=current_user
            halt 403
        end
        content_type 'application/json'
        MultiJson.dump(doc.body)
    end
    get '/:doc/delete' do
        login_required
        doc_id = params[:doc].decode62
        doc = Document.get doc_id
        if doc.nil?
            halt 404
        end
        if doc.user==current_user
            doc.destroy!
        else
            halt 403
        end
        redirect '/'
    end
    get '/:doc/:op' do
        doc_id = params[:doc].decode62
        doc = Document.get doc_id
        if doc.nil?
            halt 404
        end
        login_required
        if (!doc.public)&&doc.user!=current_user
            halt 403
        end
        @javascripts = [
            #'/assets/bundle-edit.js'
        ]
        client_id = $redis.incr("clientid")
        client_key = SecureRandom.uuid
        $redis.set "websocket:id:#{client_id}",current_user.email
        $redis.set "websocket:key:#{client_id}", client_key+":#{doc_id}"
        $redis.expire "websocket:id:#{client_id}", 60*60*24*7
        $redis.expire "websocket:key:#{client_id}", 60*60*24*7
        erb :edit, locals:{doc: doc, no_menu: true, edit: true, client_id: client_id, client_key: client_key}
    end
end
