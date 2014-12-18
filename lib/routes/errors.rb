module WebSync
  module Routes
    # Routes responsible for handling errors.
    class Errors < Base
      not_found do
        erb :error, locals: {error: "404", reason: "Page or document not found."}
      end
      error 403 do
        erb :error, locals: {error: "403", reason: "Access denied."}
      end
      error 400 do
        erb :error, locals: {error: "400", reason: "Invalid request."}
      end
      error 500 do
        erb :error, locals: {error: "500", reason: "The server failed to handle your request."}
      end
    end
  end
end
