module WebSync
  module Routes
    # Block most XHR (originated from javascript). This stops scripts from doing anything malicious to other documents.
    class XHR < Base
      before do
        # Allow static assets.
        if request.xhr? and not request.path_info.match %r{^/assets/}
          referer = URI.parse(request.env["HTTP_REFERER"]).path
          path = request.path_info
          bits = referer.split("/")
          doc = bits[1] || ''

          is_upload = request.post? && path.match(%r{^/#{doc}/upload$})
          is_asset = request.get?  && path.match(%r{^/#{doc}/assets/})
          is_api = request.get? && path.match(%r{^/api})

          # Only allow post "upload" and get "assets/#{asset}".
          if !is_api && (doc.length < 2 || !(is_upload || is_asset))
            halt 403
          end
        end
      end
    end
  end
end
