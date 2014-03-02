require 'rack/rewindable_input'

module Rack
  class RawUpload
    def initialize app, opts = {}
      @app = app
    end

    def call env
      process_upload env if env["HTTP_X_XHR_UPLOAD"]
      @app.call env
    end

    def process_upload env
      tempfile  = make_tempfile env['rack.input']
      fake_file = {
        :filename => env['HTTP_X_FILE_NAME'],
        :type     => env["CONTENT_TYPE"],
        :tempfile => tempfile
      }

      env['rack.request.form_input'] = env['rack.input']
      env['rack.request.form_hash']  ||= {}
      env['rack.request.query_hash'] ||= {}
      env['rack.request.form_hash']['file']  = fake_file
      env['rack.request.query_hash']['file'] = fake_file
    end

    def make_tempfile input
      # Stolen from rack
      tempfile  = Tempfile.new('raw-upload')
      tempfile.set_encoding(Encoding::BINARY) if tempfile.respond_to?(:set_encoding)
      tempfile.binmode

      buffer = ""
      while input.read(1024 * 4, buffer)
        entire_buffer_written_out = false
        while !entire_buffer_written_out
          written = tempfile.write(buffer)
          entire_buffer_written_out = written == Rack::Utils.bytesize(buffer)
          if !entire_buffer_written_out
            buffer.slice!(0 .. written - 1)
          end
        end
      end
      tempfile.rewind
      tempfile
    end
  end
end
