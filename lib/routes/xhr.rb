module WebSync
  module Routes
    # Block most XHR (originated from javascript). This stops scripts from doing anything malicious to other documents.
    class XHR < Base
      helpers do
        # Returns the current request path
        #
        # @return [String] the current path
        def path
          request.path_info
        end

        # Is the route an asset?
        #
        # @return [Boolean]
        def route_assets?
          request.path_info.match %r{^/assets/}
        end

        # Is the route a doc upload?
        #
        # @return [Boolean]
        def route_upload?
          request.post? && path.match(%r{^/#{doc}/upload$})
        end

        # Is the route a doc asset?
        #
        # @return [Boolean]
        def route_doc_assets?
          request.get?  && path.match(%r{^/#{doc}/assets/})
        end

        # Is the route an acceptable API request?
        #
        # @return [Boolean]
        def route_api?
          request.get? && path.match(%r{^/api})
        end
      end
      before do
        # Allow static assets.
        if request.xhr? && !route_assets? && !route_api?
          referer = URI.parse(request.env["HTTP_REFERER"]).path
          bits = referer.split("/")
          doc = bits[1] || ''

          # Only allow post "upload" and get "assets/#{asset}".
          if doc.length < 2 || !(route_upload? || route_assets?)
            halt 403
          end
        end
      end
    end
  end
end
