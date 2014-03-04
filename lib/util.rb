class String
    def html_safe
        Rack::Utils.escape_html(self)
    end
end
