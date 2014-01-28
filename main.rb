# It was the night before Christmas and all through the house, not a creature was coding: UTF-8, not even with a mouse.
require 'bundler'
require 'tempfile'
require 'digest/md5'
Bundler.require(:default)
require 'sinatra/sprockets-helpers'
require 'sinatra/asset_pipeline'
require 'sass'

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
DataMapper.setup(:default, 'postgres://'+$config['postgres'])
#$adapter = DataMapper.setup(:default, :adapter=>'riak', :namespace=>'WebSync')
#class DataMapper::Adapters::RiakAdapter
#    attr_accessor :riak
#end
#$riak = $adapter.riak
# Redis has issues with datamapper associations especially Many-to-many.
#$adapter = DataMapper.setup(:default, {:adapter => "redis"});
#$redis = $adapter.redis
#data = "window = {};"+File.read("./assets/javascripts/diff_match_patch.js") + File.read("./assets/javascripts/jsondiffpatch.min.js")
#$jsondiffpatch = ExecJS.compile data

Sinatra::Sprockets = Sprockets
=begin
module BJSONDiffPatch
    def diff object1, object2
        return $jsondiffpatch.eval "jsondiffpatch.diff(#{MultiJson.dump(object1)},#{MultiJson.dump(object2)})"
    end
    def patch object1, delta
        return $jsondiffpatch.eval "jsondiffpatch.patch(#{MultiJson.dump(object1)},#{MultiJson.dump(delta)})"
    end
end
class JsonDiffPatch
    extend BJSONDiffPatch
end
=end
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

class Document
    include DataMapper::Resource
    property :id, Serial
    property :name, Text
    #property :body, Text
    property :body, Json, :default=>{}, :lazy=>true
    property :created, DateTime
    property :last_edit_time, DateTime
    property :public, Boolean, :default=>false
    property :config, Json, :default=>{}
    has n, :assets, :through => Resource
    has n, :changes
    belongs_to :user
    def config_set key, value
        n_config = config.dup
        n_config[key]=value
        self.config= n_config
    end
end
class Change
    include DataMapper::Resource
    property :id, Serial
    property :time, DateTime
    property :patch, Json
    belongs_to :user
    belongs_to :document
end
# Assets could be javascript or css
class AssetGroup
    include DataMapper::Resource
    property :id, Serial
    property :name, String
    property :description, Text
    has n, :assets, :through => Resource
end
class Asset
    include DataMapper::Resource
    property :id, Serial
    property :name, String
    property :description, Text
    property :url, String
    property :type, Discriminator
    has n, :documents, :through => Resource
    has n, :asset_groups, :through => Resource
end
class Javascript < Asset; end
class Stylesheet < Asset; end
class User
    include DataMapper::Resource
    property :email, String, :key=>true
    property :password, BCryptHash
    property :group, String, :default=>'user'
    property :anonymous, Boolean, :default=> false
    has n, :documents
    has n, :changes
    property :config, Json, :default=>{}
    def config_set key, value
        n_config = config.dup
        n_config[key]=value
        self.config= n_config
    end
end
class AnonymousUser < User; end
DataMapper.finalize
DataMapper.auto_upgrade!
class WebSync < Sinatra::Base
    register Sinatra::Synchrony
    use Rack::Logger
    helpers do
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
                redirect "/"
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
    end

    configure :production do
        Bundler.require(:production)
        set :assets_css_compressor, :sass
        set :assets_js_compressor, :closure
        set :assets_precompile, %w(*.css *.scss bundle-norm.js bundle-edit.js *.png *.favico *.jpg *.svg *.eot *.ttf *.woff)
        set :assets_precompile_no_digest, %w(*.js)
    end
    configure do
        use Rack::Session::Cookie, :expire_after => 60*60*24*7, :secret => $config['session_secret']
        enable :sessions
        set :session_secret, $config['session_secret']
        set :server, 'thin'
        set :sockets, []
        set :template_engine, :erb
        register Sinatra::AssetPipeline
        sprockets.append_path File.join(root, 'assets', 'stylesheets')
        sprockets.append_path File.join(root, 'assets', 'javascripts')
        sprockets.append_path File.join(root, 'assets', 'images')
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
        erb :not_found
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
        ass = AssetGroup.get(params[:asset_group])
        ass.assets << Asset.get(params[:asset])
        ass.save
        redirect "/admin/asset_groups/#{params[:asset_group]}/edit"
    end
    get '/admin/asset_groups/:asset_group/:asset/remove' do
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
            redirect "/#{doc.id}/edit"
        else
            redirect "/"
        end
    end
    get '/:doc/download/:format' do
        if !%w(bib doc docx doc6 doc95 docbook html odt ott ooxml pdb pdf psw rtf latex sdw sdw4 sdw3 stw sxw text txt vor vor4 vor3 xhtml bmp emf eps gif jpg met odd otg pbm pct pgm png ppm ras std svg svm swf sxd sxd3 sxd5 tiff wmf xpm odg odp pot ppt pwp sda sdd sdd3 sdd4 sti stp sxi vor5 csv dbf dif ods pts pxl sdc sdc4 sdc3 slk stc sxc xls xls5 xls95 xlt xlt5).include?(params[:format])
            redirect '/'
        end
        login_required
        doc_id = params[:doc].decode62
        doc = Document.get doc_id
        if (!doc.public)&&doc.user!=current_user
            redirect '/'
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
            redirect '/'
        end
        file.unlink
    end
    get '/:doc/json' do
        login_required
        doc_id = params[:doc].decode62
        doc = Document.get doc_id
        if (!doc.public)&&doc.user!=current_user
            redirect '/'
        end
        content_type 'application/json'
        MultiJson.dump(doc.body)
    end
    get '/:doc/delete' do
        login_required
        doc_id = params[:doc].decode62
        doc = Document.get doc_id
        if doc.user==current_user
            doc.destroy!
        end
        redirect '/'
    end
    get '/:doc/:op' do
        doc_id = params[:doc].decode62
        doc = Document.get doc_id
        if doc.nil?
            redirect 'notfound'
        end
        #if !request.websocket?
            login_required
            if (!doc.public)&&doc.user!=current_user
                redirect '/'
            end
            @javascripts = [
                #'/assets/bundle-edit.js'
            ]
            @doc = doc
            if !@doc.nil?
                @client_id = $redis.incr("clientid")
                @client_key = SecureRandom.uuid
                $redis.set "websocket:id:#{@client_id}",current_user.email
                $redis.set "websocket:key:#{@client_id}", @client_key
                $redis.expire "websocket:id:#{@client_id}", 60*60*24*7
                $redis.expire "websocket:key:#{@client_id}", 60*60*24*7
                @no_menu = true
                @edit = true
                erb :edit
            else
                redirect '/'
            end
=begin
        # Websocket edit
        else
            #TODO: Authentication for websockets
            redis_sock = EM::Hiredis.connect.pubsub
            redis_sock.subscribe("doc:#{doc_id}")
            authenticated = false
            user = nil
            client_id = nil
            request.websocket do |ws|
                websock = ws
                ws.onopen do
                    warn "websocket open"
                end
                ws.onmessage do |msg|
                    data = MultiJson.load(msg.force_encoding("UTF-8"));
                    puts "JSON: #{msg}"
                    if data['type']=='auth'
                        if $redis.get("websocket:key:#{data['id']}") == data['key']
                            # Extend key expiry time
                            email = $redis.get "websocket:id:#{data['id']}"
                            user = User.get(email)
                            if (!doc.public)&&doc.user!=user
                                redis_sock.close_connection
                                ws.close_connection
                                return
                            end
                            authenticated = true
                            client_id = data['id']
                            $redis.expire "websocket:id:#{client_id}", 60*60*24*7
                            $redis.expire "websocket:key:#{client_id}", 60*60*24*7
                            user_prop = "doc:#{doc_id}:users"
                            user_raw = $redis.get(user_prop)
                            if !user_raw.nil?
                                users = MultiJson.load(user_raw)
                            else
                                users = {}
                            end
                            user_id = Digest::MD5.hexdigest(email.strip.downcase)
                            users[client_id]={id:user_id,email:email.strip}
                            $redis.set user_prop,MultiJson.dump(users)
                            $redis.publish "doc:#{doc_id}", MultiJson.dump({type:"client_bounce",client:client_id,data:MultiJson.dump({type:"new_user",id:client_id,user:{id:user_id,email:email.strip}})})
                            ws.send MultiJson.dump({type:'info',user_id:user_id,users:users})
                            puts "[Websocket Client Authed] ID: #{client_id}, Email: #{email}"
                        else
                            ws.close_connection
                        end
                    end
                    if authenticated
                        # Patch data
                        if data['type']=='data_patch'&&data.has_key?('patch')
                            doc = Document.get doc_id
                            doc.body = JsonDiffPatch.patch(doc.body,data['patch'])
                            doc.last_edit_time = Time.now
                            if !doc.save
                                puts("Save errors: #{doc.errors.inspect}")
                            end
                            $redis.publish "doc:#{doc_id}", MultiJson.dump({type:"client_bounce",client:client_id,data:msg})
                        # Sets the name
                        elsif data['type']=="name_update"
                            doc.name = data["name"]
                            doc.last_edit_time = Time.now
                            if !doc.save
                                puts("Save errors: #{doc.errors.inspect}")
                            end
                            $redis.publish "doc:#{doc_id}", MultiJson.dump({type:"client_bounce",client:client_id,data:msg})
                        # Loads scripts
                        elsif data['type']=="load_scripts"
                            msg = {type:'scripts', js:[],css:[]}
                            doc.assets.each do |asset|
                                arr = :js;
                                if asset.type=="javascript"
                                    arr = :js
                                elsif asset.type=="stylesheet"
                                    arr = :css
                                end
                                msg[arr].push asset.url
                            end
                            ws.send MultiJson.dump msg
                        elsif data['type']=='connection'
                        elsif data['type']=='config'
                            if data['action']=='set'
                                if data['property']=='public'
                                    doc.public = data['value']
                                    doc.save
                                else
                                    if data['space']=='user'
                                            user.config_set data['property'],data['value']
                                            user.save
                                    elsif data['space']=='document'
                                            doc.config_set data['property'],data['value']
                                            doc.save
                                    end
                                end
                            elsif data['action']=='get'
                                if data['property']=='public'
                                    ws.send MultiJson.dump({type: 'config',action: 'get', property:'public', value: doc.public})
                                else
                                    if data['space']=='user'
                                            ws.send MultiJson.dump({type: 'config', action: data['action'], space: data['space'], property: data['property'], value: user.config[data['property']],id:data['id']})
                                    elsif data['space']=='document'
                                            ws.send MultiJson.dump({type: 'config', action: data['action'], space: data['space'], property: data['property'], value: doc.config[data['property']],id:data['id']})
                                    end
                                end
                            end
                        elsif data['type']=='client_event'
                            $redis.publish "doc:#{doc_id}", MultiJson.dump({type:"client_bounce",client:client_id,data:MultiJson.dump({type:"client_event",event:data['event'],from:client_id,data:data['data']})})
                        end
                    end
                end
                ws.onclose do
                    warn("websocket closed")
                    redis_sock.close_connection
                    if authenticated
                        user_prop = "doc:#{doc_id}:users"
                        users = MultiJson.load($redis.get(user_prop))
                        users.delete client_id
                        $redis.set user_prop,MultiJson.dump(users)
                        $redis.publish "doc:#{doc_id}", MultiJson.dump({type:"client_bounce",client:client_id,data:MultiJson.dump({type:"exit_user",id:client_id})})
                    end
                    ws.close_connection
                end
                redis_sock.on(:message) do |channel, message|
                    #puts "[#{client_id}]#{channel}: #{message}"
                    data = MultiJson.load(message)
                    if data['client']!=client_id
                        if data['type']=="client_bounce"
                            ws.send data['data']
                        end
                    end
                end
            end
        end
=end
    end

=begin
# This might be completely useless since it seems like you only have to structure for diff.
# Create a diff after replacing all HTML tags with unicode characters.
def diff_htmlToChars_ text1, text2
    lineArray = []  # e.g. lineArray[4] == 'Hello\n'
    lineHash = {}   # e.g. lineHash['Hello\n'] == 4

    # '\x00' is a valid character, but various debuggers don't like it.
    # So we'll insert a junk entry to avoid generating a null character.
    lineArray[0] = ''

    #/**
    #* Split a text into an array of strings.  Reduce the texts to a string of
    #* hashes where each Unicode character represents one line.
    #* Modifies linearray and linehash through being a closure.
    #* @param {string} text String to encode.
    #* @return {string} Encoded string.
    #* @private
    #*/
    def diff_linesToCharsMunge_ text, lineArray, lineHash
        chars = ""+text
        #// Walk the text, pulling out a substring for each line.
        #// text.split('\n') would would temporarily double our memory footprint.
        #// Modifying text would create many large strings to garbage collect.
        lineStart = 0
        lineEnd = 0
        #// Keeping our own length variable is faster than looking it up.
        lineArrayLength = lineArray.length;
        while lineEnd <(text.length - 1)
            prevLineEnd = lineEnd
            if prevLineEnd==nil
                prevLineEnd=0
            end
            lineStart = text.index('<',lineEnd)
            if lineStart.nil?
                lineEnd=nil
                break
            else
                lineEnd = text.index('>', lineStart)
            end
            if lineEnd.nil?
                lineEnd = text.length - 1
            end
            line = text[lineStart..lineEnd]
            lineStart = lineEnd + 1

            if lineHash.has_key? line
                chars.gsub!(line,[lineHash[line]].pack("U"))
            else
                chars.gsub!(line,[lineArrayLength].pack("U"))
                lineHash[line] = lineArrayLength
                lineArray[lineArrayLength] = line
                lineArrayLength +=1
            end
        end
        return chars;
    end

    chars1 = diff_linesToCharsMunge_(text1, lineArray,lineHash)
    chars2 = diff_linesToCharsMunge_(text2,lineArray,lineHash)
    return {chars1: chars1, chars2: chars2, lineArray: lineArray}
end
def diff_charsToHTML_ diffs, lineArray
  (0..(diffs.length-1)).each do |x|
    chars = diffs[x][1];
    text = ""+chars
    (0..(lineArray-1)).each do |y|
      text.gsub!([y].pack("U"),lineArray[y])
    end
    diffs[x][1] = text;
  end
end
=end
end
