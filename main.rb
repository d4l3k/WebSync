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
$redis = Redis.new
DataMapper.setup(:default, "sqlite3://#{File.expand_path(File.dirname(__FILE__))}/main.db")
# Redis has issues with datamapper associations especially Many-to-many.
#$adapter = DataMapper.setup(:default, {:adapter => "redis"});
#$redis = $adapter.redis

class Document
    include DataMapper::Resource
    property :id, Serial
    property :name, String
    property :body, Text
    property :created, DateTime
    property :last_edit_time, DateTime
    property :public, Boolean, :default=>false
    has n, :assets, :through => Resource
    #belongs_to :dm_user
end
# Assets could be javascript or css
class Asset
    include DataMapper::Resource
    property :id, Serial
    property :name, String
    property :description, String
    property :url, String
    property :type, Discriminator
    has n, :documents, :through => Resource
end
class Javascript < Asset; end
class Stylesheet < Asset; end
class DmUser
    #has n, :documents
end
DataMapper.finalize
DataMapper.auto_upgrade!
class WebSync < Sinatra::Base
    use Rack::Logger
    use Rack::Session::Cookie, :secret => 'Web-Sync sdkjfskadfh1h3248c99sj2j4j2343'
    #use Rack::FiberPool
    register Sinatra::Sprockets::Helpers
    set :sprockets, Sprockets::Environment.new(root)
    set :assets_prefix, '/assets'
    set :digest_assets, false

    helpers do
        def logger
            request.logger
        end
    end

    configure do
        set :server, 'thin'
        set :sockets, []
        set :template_engine, :erb
        sprockets.append_path File.join(root, 'assets', 'stylesheets')
        sprockets.append_path File.join(root, 'assets', 'javascripts')
        #sprockets.append_path File.join(root, 'assets', 'images')
        configure_sprockets_helpers do |helpers|
          # This will automatically configure Sprockets::Helpers based on the
          # `sprockets`, `public_folder`, `assets_prefix`, and `digest_assets`
          # settings if they exist. Otherwise you can configure as normal:
          #helpers.asset_host = 'some-bucket.s3.amazon.com'
        end
    end
    configure :development do
        Bundler.require(:development)
        use PryRescue::Rack
        helpers do
            alias :javascript_tag_old :javascript_tag
            def javascript_tag tag
                data = javascript_tag_old(tag, :expand=>true).split('><')
                data[0..data.length-2].join('><')
            end
        end
    end

    configure :production do
        Bundler.require(:production)
        sprockets.js_compressor  = YUI::JavaScriptCompressor.new
        sprockets.css_compressor = YUI::CssCompressor.new
    end
    $dmp = DiffMatchPatch.new

    $table = Javascript.first_or_create(:name=>'Tables',:description=>'Table editing support',:url=>'/assets/tables.js')

    get '/assets/*.css' do
        content_type 'text/css'
        assets_environment[params[:splat][0]+'.css'].to_s
    end
    get '/assets/*.js' do
        content_type 'text/javascript'
        assets_environment[params[:splat][0]+'.js'].to_s
    end

    get '/' do
        #$redis.cache("index",300) do
            @javascripts = []
            erb :index
        #end
    end
    get '/error' do
        error
    end
    get '/new' do
        login_required
        doc = Document.create(
            :name => 'Unnamed Document',
            :body => '',
            :created => Time.now,
            :last_edit_time => Time.now
            #,:dm_user => current_user.db_instance
        )
        doc.assets << Asset.get(1)
        doc.save
        redirect "/#{doc.id.base62_encode}/edit"
    end
    get '/:doc/download' do
        login_required
        doc_id = params[:doc].base62_decode
        doc = Document.get doc_id
        response.headers['content_type'] = "application/octet-stream"
        attachment(doc.name+'.docx')
        response.write(doc.body)
        #send_data doc.body, :filename=>doc.name+".docx"
    end
    get '/:doc/delete' do
        login_required
        doc_id = params[:doc].base62_decode
        doc = Document.get doc_id
        doc.destroy!
        redirect '/'
    end
    get '/:doc/edit' do
        login_required
        doc_id = params[:doc].base62_decode
        doc = Document.get doc_id
        if !request.websocket?
            @javascripts = [
                #'/assets/bundle-edit.js'
            ]
            @doc = doc
            if !@doc.nil?
                erb :edit
            else
                redirect '/'
            end
        # Websocket edit
        else
            redis_sock = EM::Hiredis.connect
            client_id = $redis.incr("clientid")
            redis_sock.subscribe("doc.#{doc_id.base62_encode}")
            puts "Websocket Client ID: #{client_id}"
            request.websocket do |ws|
                websock = ws
                ws.onopen do
                    warn "websocket open"
                end
                ws.onmessage do |msg|
                    data = JSON.parse(msg);
                    puts "JSON: #{data.to_s}"
                    # This replaces all the text w/ the provided content.
                    if data["type"]=="text_update"
                        doc.body = data["text"]
                        doc.last_edit_time = Time.now
                        if !doc.save
                            puts("Save errors: #{doc.errors.inspect}")
                        end
                        $redis.publish "doc.#{doc_id.base62_encode}", JSON.dump({type:"client_bounce",client:client_id,data:data})
                    # Google Diff-Match-Patch algorithm
                    elsif data['type']=='text_patch'
                        doc = Document.get doc_id
                        #I'm pretty sure this works just fine. The main issue seems to be diffing w/ structure content. We'll see with time.
                        #html_optimized_patches = diff_htmlToChars_ doc.body, URI::decode(data['patch'])
                        #puts html_optimized_patches.inspect
                        patches = $dmp.patch_from_text data['patch']
                        doc.body = $dmp.patch_apply(patches,doc.body)[0]
                        doc.last_edit_time = Time.now
                        if !doc.save
                            puts("Save errors: #{doc.errors.inspect}")
                        end
                        $redis.publish "doc.#{doc_id.base62_encode}", JSON.dump({type:"client_bounce",client:client_id,data:data})
                    # Sets the name
                    elsif data['type']=="name_update"
                        doc.name = data["name"]
                        doc.last_edit_time = Time.now
                        if !doc.save
                            puts("Save errors: #{doc.errors.inspect}")
                        end
                        $redis.publish "doc.#{doc_id.base62_encode}", JSON.dump({type:"client_bounce",client:client_id,data:data})
                    # Loads scripts
                    elsif data['type']=="load_scripts"
                        msg = {type:'scripts', js:[]}
                        doc.assets.each do |asset|
                            arr = :js;
                            if asset.type=="javascript"
                                arr = :js
                            elsif asset.type=="stylesheet"
                                arr = :css
                            end
                            msg[arr].push asset.url
                        end
                        ws.send JSON.dump msg
                    elsif data['type']=='connection'
                    end
                end
                ws.onclose do
                    warn("websocket closed")
                    redis_sock.close_connection
                end
                redis_sock.on(:message) do |channel, message|
                    puts "[#{client_id}]#{channel}: #{message}"
                    data = JSON.parse(message)
                    if data['client']!=client_id
                        if data['type']=="client_bounce"
                            ws.send JSON.dump(data['data'])
                        end
                    end
                end
            end
        end
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
