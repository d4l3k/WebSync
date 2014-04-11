require 'mime/types'
class WSFileResource < DAV4Rack::Resource
    include DAV4Rack::Utils
    ROOT = :root
    attr_accessor :object
    def initialize(public_path, path, request, response, options)
        super(public_path, path, request, response, options)
        @local_path = public_path.gsub(/^#{root[0..-2]}/,"")
        if @local_path.length == 0
            @local_path = "/"
        end
        if options[:object]
            @object = options[:object]
        elsif @local_path.length <= 1
            @object = ROOT
        else
            puts "PUBLIC PATH: #{public_path}, #{@local_path}"
        end
    end
    def reload
        if not @object
            convert_unknown
        end
        if @object and @object != ROOT and @object.respond_to? :id
            @object = @object.model.get(@object.id)
        end
    end
    def convert_unknown
        if @ws_user
            @object = file_by_path @local_path
            puts @object.inspect
        end
    end
    def children
        reload
        if @object == ROOT
            @ws_user.files(parent: nil).map do |file|
                child file
            end
        elsif @object
            @object.children.map do |file|
                child file
            end
        else
            []
        end
    end
    def collection?
        reload
        if @object == ROOT
            true
        elsif @object
            @object.directory
        else
            false
        end
    end
    def exist?
        reload
        @object && @object.respond_to?(:length) && @object.length > 0 || @object != nil
    end
    def get(request, response)
        reload
        puts "GET"
        raise NotFound unless exist?
        if collection?
            response.body = "<html><head><style>* {font-family: monospace;} body{background-image: url(/img/logo-github.png);background-repeat:no-repeat;background-position: center center;}section{background-color: rgba(255,255,255,0.8)}</style><body><section>"
            response.body << "<h2>Index of #{file_path.escape_html}</h2><hr><table><thead><th>Name</th><th>Size</th><th>Last Modified</th></thead><tbody>"
            if @object != ROOT
                response.body << "<tr><td><a href='..'>..</a></td></tr>"
            end
            children.each do |child|
                response.body << "<tr><td>"
                name = child.file_path.split("/").last.escape_html
                path = child.public_path
                if child.collection?
                    name += "/"
                    path += "/"
                end
                response.body << "<a href='" + path + "'>" + name + "</a></td><td>#{child.object.as_size}</td><td>#{child.object.edit_time}</td></tr>"
            end
            response.body << '</tbody></table><hr><p>Copyright (c) 2014 Tristan Rice. WebSync is licensed under the <a href="http://opensource.org/licenses/MIT">MIT License</a>.</p></body></section></html>'
            response['Content-Length'] = response.body.size.to_s
            response['Content-Type'] = 'text/html'
        else
            response.body = @object.data || ""
            response['Content-Type'] = @object.content_type
        end

    end
    def put(request, response)
        reload
        puts "BLAH"
        if not @object || @object == UNKNOWN
            parts = @local_path.split("/")
            file = WSFile.all(parent: nil, name: parts[1])[0]
            endd = parts.last=="" ? -3 : -2
            parts[2..endd].each do |part|
                file = file.children(name: part)
            end
            @object = WSFile.create(name: parts.last, create_time: DateTime.now, directory: false, user: @ws_user)
        end
        io = request.body
        temp = Tempfile.new("websync-dav-upload")
        data = io.read rescue ""
        temp.write data
        temp.close
        @object.content_type = _content_type temp.path
        temp.flush rescue nil
        @object.edit_time = DateTime.now
        @object.save!
        @object.data=data
        Created
    end
    def delete
        reload
        if collection?
            if @object == ROOT
                WSFile.all(parent: nil, user: @ws_user).each do |file|
                    file.destroy_cascade
                end
            else
                @object.destroy_cascade
            end
        elsif @object
            @object.destroy_cascade
        end
        NoContent
    end
    def file_by_path path
        parts = path.split("/")
        _find_child parts[1..-1]
    end
    def _find_child dirs, parent=nil
        kids = []
        if not parent
            kids = @ws_user.files(parent: parent, name: dirs.first)
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
        if request.body.read.to_s == ''
            if exist?
                puts "woof #{@object.inspect}"
                MethodNotAllowed
            else
                if not @object
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
    def _content_type filename
        MIME::Types.type_for(filename).first.to_s || 'text/html'
    end
    def post(request, response)
        raise HTTPStatus::Forbidden
    end
    def content_type
        if collection?
            'text/html'
        elsif @object.respond_to?(:content_type)
            @object.content_type
        end
    end
    def content_length
        if @object.respond_to?(:size)
            @object.size
        end
    end
    def creation_date
        if @object.respond_to?(:create_time)
            @object.create_time
        else
            DateTime.new
        end
    end
    def last_modified
        if @object.respond_to?(:edit_time)
            @object.edit_time
        else
            DateTime.new
        end
    end
    def last_modified= time
        if @object.respond_to? :edit_time
            @object.update :edit_time, time
        end
    end
    def etag
        if @object.respond_to? :id
            "#{@object.id}-#{@object.edit_time}"
        end
    end
    def authenticate user, pass
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
        parent = entry.parent
        public_path = ""
        while parent != nil
            public_path = "#{parent.name}/"+public_path
            parent = parent.parent
        end
        public_path = @options[:root_uri_path]+public_path
        public_path += path
        @options[:object] = entry
        self.class.new(public_path, path, @request, @response, @options)
    end
end
