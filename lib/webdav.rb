require 'mime/types'
class WSFileResource < DAV4Rack::Resource
    include DAV4Rack::Utils
    ROOT = :root
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
            puts "PUBLIC PATH: #{public_path}"
            parts = @local_path.split("/")
            file = WSFile.all(parent: nil, name: parts[1])[0]
            parts[2..-1].each do |part|
                file = file.children(name: part)
            end
            @object = file
        end
    end
    def reload
        if @object.respond_to? :model
            @object = @object.model.get(@object.id)
        end
    end
    def children
        reload
        if @object == ROOT
            WSFile.all(parent: nil, user: @user).map do |file|
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
        if @object == ROOT
            true
        elsif @object
            reload
            @object.directory
        else
            false
        end
    end
    def exist?
        @object
    end
    def get(request, response)
        raise NotFound unless exist?
        reload
        if collection?
            response.body = "<html>"
            response.body << "<h2>" + file_path.escape_html + "</h2>"
            children.each do |child|
                name = child.file_path.escape_html
                path = child.public_path
                response.body << "<a href='" + path + "'>" + name + "</a>"
                response.body << "</br>"
            end
            response.body << "</html>"
            response['Content-Length'] = response.body.size.to_s
            response['Content-Type'] = 'text/html'
        else
            response.body = @object.data || ""
            response['Content-Type'] = @object.content_type
        end

    end
    def put(request, response)
        reload
        if not @object
            parts = @local_path.split("/")
            file = WSFile.all(parent: nil, name: parts[1])[0]
            endd = parts.last=="" ? -3 : -2
            parts[2..endd].each do |part|
                file = file.children(name: part)
            end
            @object = WSFile.create(name: parts.last, create_time: DateTime.now, directory: parts.last=="", user: @user)
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
                WSFile.all(parent: nil, user: @user).destroy!
            else
                @object.children.destroy!
                @object.destroy!
            end
        elsif @object
            @object.destroy
        end
        NoContent
    end
    def _content_type filename
        MIME::Types.type_for(filename).first.to_s || 'text/html'
    end
    def post(request, response)
        raise HTTPStatus::Forbidden
    end
    def content_type
        @object.respond_to?(:content_type)&&@object.content_type || "text/html"
    end
    def content_length
        @object.respond_to?(:data)&&@object.data.length || 0
    end
    def creation_date
        @object.respond_to?(:create_time) && @object.create_time || DateTime.new
    end
    def last_modified
        @object.respond_to?(:edit_time) && @object.edit_time || DateTime.new
    end
    def etag
        if @object.respond_to? :id
            "#{@object.id}-#{@object.edit_time}"
        end
    end
    def authenticate user, pass
        @user = User.get(user)
        @user && @user.password == pass
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
        public_path = @options[:root_uri_path] + path
        @options[:object] = entry
        self.class.new(public_path, path, @request, @response, @options)
    end
end
class String
    def escape_html
        Rack::Utils.escape_html(self)
    end
end
