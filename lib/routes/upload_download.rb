module WebSync
  module Routes
    # The routes for uploading, downloading and converting files.
    class UploadDownload < Base
      helpers do
        # Converts a file into HTML.
        #
        # @param tempfile [TempFile, File] the file to convert
        # @return [String] the HTML content
        def convert_file tempfile
          filetype = get_mime_type(tempfile.path)
          if filetype == 'application/pdf'
            PDFToHTMLR::PdfFilePath.new(tempfile.path).convert.force_encoding("UTF-8")
          elsif filetype == 'text/html'
            File.read(tempfile.path)
          else
            system("unoconv","-f","html",tempfile.path)
            exit_status = $?.to_i
            if exit_status == 0
              content = File.read(tempfile.path+".html")
              File.delete(tempfile.path + ".html")
              content
            else
              logger.info "Unoconv failed and Unrecognized filetype: #{params[:file][:type]}"
            end
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
        end

        # Fail the conversion by displaying a message and redirecting to /.
        def conversion_fail
          flash[:danger] = "'#{h params[:file][:filename]}' failed to be converted."
          redirect "/"
        end

        # Upload a file
        #
        # @param file [Hash] A file hash with options :tempfile, :filename, and :type.
        # @param type [String] The file type
        # @param parent [WSFile] The parent file.
        # @return [WSFile] the new file
        def upload_file file: params['file'], type: file[:type], parent: nil
          # Fingerprint file for mime-type if we aren't provided with it.
          if type == 'application/octet-stream'
            type = get_mime_type(file[:tempfile].path)
          end
          blob = WSFile.create(name: file[:filename], content_type: type, parent: parent)
          blob.data = file[:tempfile].read
          Permission.create(user: current_user, file: blob, level: "owner")
          blob
        end

        # Convert some HTML into a new file.
        #
        # @param html [String] the HTML content to convert
        def upload_html html
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
          sanitize_upload dom
          doc = WSFile.create(
            name: filename,
            body: {
              html: dom.to_html
            },
            content_type: 'text/websync'
          )
          doc.assets = AssetGroup.get(1).assets
          doc.save
          perm = Permission.create(user: current_user, file: doc, level: "owner")

          # Upload images
          upload_list.each do |file|
            path = "/tmp/#{file}"
            upload_file(parent: doc, file: {
              type: get_mime_type(path),
              tempfile: File.new(path),
              filename: file
            })
            File.delete path
          end
          if doc.id
            flash[:success] = "'#{h params[:file][:filename]}' was successfully converted."
            redirect "/#{doc.id.encode62}/edit"
          else
            conversion_fail
          end
        end
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
        content = nil
        # TODO: Split upload/download into its own external server. Right now Unoconv is blocking. Also issues may arise if multiple copies of LibreOffice are running on the same server. Should probably use a single server instance of LibreOffice
        if params["convert"]
          content = convert_file tempfile
          File.delete tempfile.path
          if content!=nil
            upload_html content
          else
            conversion_fail
          end
        else
          upload_file
          flash[:success] = "'#{h file[:filename]}' was successfully uploaded."
          redirect "/"
        end
      end

      # This doesn't need to verify authentication because the token is a 16 byte string.
      get '/:doc/download/:id' do
        doc = document_auth
        key = "websync:document_export:#{params[:doc].decode62}:#{params[:id]}"
        response = $redis.get key
        if response
          ext = $redis.get "#{key}:extension"
          attachment("#{doc.name}.#{ext}")
          content_type 'application/octet_stream'
          response
        else
          halt 404
        end
      end
    end
  end
end
