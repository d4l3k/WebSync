module WebSync
  module Routes
    class XHR < Base
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
    end
  end
end
