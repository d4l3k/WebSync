require 'mime/types'
class WSFileResource < DAV4Rack::Resource
    include DAV4Rack::Utils
    ROOT = :root
    attr_accessor :file, :ws_user
    def initialize(public_path, path, request, response, options)
        super(public_path, path, request, response, options)
        @local_path = public_path.gsub(/^#{root[0..-2]}/,"")
        if @local_path.length == 0
            @local_path = "/"
        end
        @ws_user ||= options[:ws_user]
        if options[:object]
            @file = options[:object]
        elsif @local_path.length <= 1
            @file = ROOT
        else
            #puts "PUBLIC PATH: #{public_path}, #{@local_path}"
        end
    end
    before do |resource, method_name|
        if [:put, :post, :delete, :get].include? method_name
            resource.reload
            # Only allow XHR requests for directory listings.
            if resource.request.xhr? and not ( method_name == :get and resource.collection? )
                raise Forbidden
            end
        end
        if [:put, :post, :delete, :get, :exist?, :collection?].include? method_name
            resource.force_auth
            if not resource.file
                resource.convert_unknown
            end
        end
    end
    def reload
        if @file and @file != ROOT and @file.respond_to? :id
            @file = @file.model.get(@file.id)
        end
    end
    def convert_unknown
        if @ws_user
            @file = file_by_path @local_path
        end
    end
    def children
        if @file == ROOT
            @ws_user.files(parent: nil).map do |file|
                child file
            end
        elsif @file
            @file.children.map do |file|
                child file
            end
        else
            []
        end
    end
    def collection?
        if @file == ROOT
            true
        elsif @file
            @file.directory
        else
            false
        end
    end
    def exist?
        @file && @file.respond_to?(:length) && @file.length > 0 || @file != nil && @file.class != Array || file_path == "/"
    end
    def force_auth
        if not @ws_user
            user, pass = auth_credentials
            if user
                authenticate user, pass
            end
        end
    end
    def get(request, response)
        raise NotFound unless exist?
        if collection?
            response.body = "<html><head><style>* {font-family: monospace;} body{background-image: url(/img/logo-github.png);background-repeat:no-repeat;background-position: center center;}section{background-color: rgba(255,255,255,0.8)}td, th{padding-right: 5px;}th{text-align: left;}</style><body><section>"
            response.body << "<h2>Index of #{file_path.escape_html}</h2><hr><table><thead><th>Name</th><th>Size</th><th>Last Modified</th><th>Content Type</th></thead><tbody>"
            if @file != ROOT
                response.body << "<tr><td><a href='..'>..</a></td></tr>"
            end
            children.each do |child|
                response.body << "<tr><td>"
                name = child.file_path.split("/").last.escape_html
                path = child.public_path
                file = child.file
                content_type = file.content_type
                if child.collection?
                    name += "/"
                    path += "/"
                elsif content_type.to_s.empty? and file.body_size > 0 or file.content_type == "text/websync"
                    path = "/#{file.id.encode62}/edit"
                end
                response.body << "<a href='#{ path }'>#{ name }</a></td><td>#{file.as_size}</td><td>#{file.edit_time}</td><td>#{ content_type }</td></tr>"
            end
            response.body << '</tbody></table><hr><p>Copyright (c) 2014 Tristan Rice. WebSync is licensed under the <a href="http://opensource.org/licenses/MIT">MIT License</a>.</p></body></section></html>'
            response['Content-Length'] = response.body.bytesize.to_s
            response['Content-Type'] = 'text/html'
        else
            response.body = @file.data || ""
            response['Content-Type'] = @file.content_type
        end

    end
    def move dest, overwrite=false
        path = dest.path
        # Enforce a '/' at the front.
        if path[0] != "/"
            path = "/"+path
        end
        # Remove dest if it exists
        file = file_by_path path
        if overwrite && file
            tries = 0
            # TODO: Figure out why this is needed. The file isn't being destroyed on the first pass.
            while !file.destroy_cascade && tries < 3
                file.reload
                tries += 1
            end
        end
        # Only copy if the destination doesn't exist.
        if not file_by_path path
            parts = path.split("/")
            parent = file_by_path parts[0..-2].join("/")
            # If it has a parent, or is moving to root.
            if parent || parts.length == 2
                a = @file
                a.parent = parent
                a.name = parts.last
                a.save
                overwrite ? NoContent : Created
            end
        else
            PreconditionFailed
        end
    end
    def copy dest, overwrite=false
        path = dest.path
        # Enforce a '/' at the front.
        if path[0] != "/"
            path = "/"+path
        end
        # Remove dest if it exists
        file = file_by_path path
        if overwrite && file
            tries = 0
            # TODO: Figure out why this is needed. The file isn't being destroyed on the first pass.
            while !file.destroy_cascade && tries < 3
                file.reload
                tries += 1
            end
        end
        # Only copy if the destination doesn't exist.
        if not file_by_path path
            parts = path.split("/")
            parent = file_by_path parts[0..-2].join("/")
            if parent
                a = @file.copy
                a.parent = parent
                a.name = parts.last
                a.save
                overwrite ? NoContent : Created
            else
                Conflict
            end
        else
            PreconditionFailed
        end
    end
    def put(request, response)
        if not @file
            parts = @local_path.split("/")
            file = WSFile.all(parent: nil, name: parts[1])[0]
            endd = parts.last=="" ? -3 : -2
            parts[2..endd].each do |part|
                file = file.children(name: part)
            end
            parent = file_by_path parts[0..-2].join("/")
            @file = WSFile.create(name: parts.last, create_time: DateTime.now, directory: false, edit_time: DateTime.now, parent: parent)
            perm = Permission.create(user: @ws_user, file: @file, level: "owner")
        end
        io = request.body
        temp = Tempfile.new("websync-dav-upload")
        data = io.read rescue ""
        temp.write data
        temp.close
        @file.content_type = _content_type temp.path
        temp.flush rescue nil
        @file.edit_time = DateTime.now
        @file.save!
        @file.data=data
        Created
    end
    def _content_type filename
        MIME::Types.type_for(filename).first.to_s || 'text/html'
    end
    def delete
        if collection?
            if @file == ROOT
                WSFile.all(parent: nil, user: @ws_user).each do |file|
                    file.destroy_cascade
                end
            else
                @file.destroy_cascade
            end
        elsif @file
            @file.destroy_cascade
        end
        NoContent
    end
    def file_by_path path
        parts = path.split("/")
        parts.delete("")
        _find_child(parts)
    end
    def _find_child dirs, parent=nil
        if not dirs
            return
        end
        kids = []
        if not parent
            kids = @ws_user.files(parent: nil, name: dirs.first)
        else
            kids = parent.children(name: dirs.first)
        end
        kids.each do |kid|
            if dirs[1..-1].length > 0
                resp = _find_child dirs[1..-1], kid
                if resp
                    return resp
                end
            else
                return kids[0]
            end
        end
        nil
    end
    def make_collection
        raise Conflict unless parent.exist?
        if request.body.read.to_s == ''
            if exist?
                MethodNotAllowed
            else
                if not @file
                    parts = @local_path.split("/")
                    parent = file_by_path parts[0..-2].join("/")
                    obj = WSFile.create(name: parts.last, create_time: DateTime.now, edit_time: DateTime.now, directory: true, parent: parent)
                    perm = Permission.create(user: @ws_user, file: obj, level: "owner")
                    Created
                else
                    Conflict
                end
            end
        else
            UnsupportedMediaType
        end
    end
    def post(request, response)
        Forbidden
    end
    # Properties
    def set_property(element, value)
        #puts "SET PROP: #{element} = #{value}"
        f = @file.reload
        f.property_set(element[:name], value)
        f.save
    end
    def get_property(element)
        #puts "GET PROP: #{element}"
        @file.reload.file_properties[element[:name]]
    end
    def content_type
        if @file.respond_to?(:content_type)
            @file.content_type
        else
            'text/html'
        end
    end
    def content_length
        if @file.respond_to?(:size)
            @file.size
        end
    end
    def creation_date
        if @file.respond_to?(:create_time)
            @file.create_time
        else
            DateTime.new
        end
    end
    def last_modified
        if @file.respond_to?(:edit_time)
            @file.edit_time
        else
            DateTime.new
        end
    end
    def last_modified= time
        if @file.respond_to? :edit_time
            @file.update :edit_time, time
        end
    end
    def etag
        if @file.respond_to? :id
            "#{@file.id}-#{@file.edit_time}"
        end
    end
    def authenticate user, pass
        # Try to authenticate based on cookies set by the main app.
        session = Rack::Session::Cookie::Base64::Marshal.new.decode(request.cookies["rack.session"])
        if not (session.nil? or session["userhash"].nil?)
            if $redis.get('userhash:'+session['userhash'])==session['user']
                @ws_user = User.get(session['user'])
                return true
            end
        end
        # No good cookies set. Fallback
        @ws_user = User.get(user)
        @ws_user && @ws_user.password == pass
    end
    def file_path
        @local_path
        #path
    end
    def root
        @options[:root_uri_path]
    end
    def child(entry)
        path = entry.name
        path = "unnamed_#{entry.id.encode62}" if path.length == 0
        parent = entry.parent
        public_path = ""
        while parent != nil
            public_path = "#{parent.name}/"+public_path
            parent = parent.parent
        end
        public_path = @options[:root_uri_path]+public_path
        public_path += path
        @options[:object] = entry
        @options[:ws_user] = @ws_user
        self.class.new(public_path, path, @request, @response, @options)
    end
end
