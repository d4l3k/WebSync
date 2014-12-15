module WebSync
  module Routes
    class Document < Base
      get '/new/:group' do
        login_required
        group = AssetGroup.get(params[:group])
        if group.nil?
          halt 400
        end
        doc = WSFile.create(
          name: "Unnamed #{group.name}",
          body: {body:[]},
          create_time: Time.now,
          edit_time: Time.now,
          content_type: 'text/websync'
        )
        doc.assets = group.assets
        doc.save
        # TODO: Handle errors
        Permission.create(user: current_user, file: doc, level: "owner")
        redirect "/#{doc.id.encode62}/edit"
      end
      get '/:doc/json' do
        doc = document_auth
        content_type 'application/json'
        MultiJson.dump(doc.body)
      end
      get '/:doc/delete' do
        doc = document_auth
        if doc.permissions(level: "owner").user[0]==current_user
          doc.update(deleted: true)
          flash[:danger] = "Document moved to trash."
        else
          halt 403
        end
        redirect '/'
      end
      get '/:doc/undelete' do
        doc = document_auth
        if doc.permissions(level: "owner").user[0]==current_user
          doc.update(deleted: false)
          flash[:success] = "Document restored."
        else
          halt 403
        end
        redirect '/'
      end
      get '/:doc/destroy' do
        doc = document_auth
        if doc.permissions(level: "owner").user[0]==current_user
          erb :destroy, locals: {doc: doc}
        else
          halt 403
        end
      end
      post '/:doc/destroy' do
        doc = document_auth
        if doc.permissions(level: "owner").user[0]==current_user
          if current_user.password == params[:password]
            doc.destroy_cascade
            flash[:danger] = "Document erased."
            redirect '/'
          else
            flash.now[:danger] = "<strong>Error!</strong> Incorrect password."
            erb :destroy, locals: {doc: doc}
          end
        else
          halt 403
        end
      end
      get(//) do
        parts = request.path_info.split("/")
        pass unless parts.length >=3
        doc = parts[1]
        op = parts[2]
        halt 400 unless ["edit","view", "assets"].include? parts[2]
        if op == "upload"
          redirect "/#{doc}/edit"
        end
        doc = document_auth doc
        if parts[2] == "assets"
          if parts.length > 3
            cache do
              file = URI.unescape(parts[3..-1].join("/"))
              asset = doc.children(name: file)[0]
              if asset
                content_type asset.content_type
                response.write asset.data
                return
              else
                halt 404
              end
            end
          else
            halt 404
          end
        end
        @javascripts = [
          #'/assets/bundle-edit.js'
        ]
        client_id = $redis.incr("clientid")
        client_key = SecureRandom.uuid
        user = doc.permissions(user: current_user)[0]
        access = user.level if user
        access ||= doc.default_level
        $redis.set "websocket:id:#{client_id}",current_user.email
        $redis.set "websocket:key:#{client_id}", client_key+":#{doc.id}"
        $redis.expire "websocket:id:#{client_id}", 60*60*24*7
        $redis.expire "websocket:key:#{client_id}", 60*60*24*7
        erb :edit, locals: {
          user: user,
          no_bundle_norm: true,
          doc: doc,
          no_menu: true,
          edit: true,
          client_id: client_id,
          client_key: client_key,
          op: op,
          access: access,
          allow_iframe: true
        }
      end
      post "/:doc/upload" do
        doc = document_auth
        editor! doc
        files = []
        if params.has_key? "files"
          files = params["files"]
        elsif params.has_key? "file"
          files.push params["file"]
        end
        files.each do |file|
          type = file[:type]
          # Fingerprint file for mime-type if we aren't provided with it.
          if type=="application/octet-stream"
            type = MIME::Types.type_for(file[:tempfile].path).first.content_type
          end
          ws_file = doc.children(name: file[:filename])[0]
          if ws_file
            ws_file.update edit_time: DateTime.now
            ws_file.data = file[:tempfile].read
          else
            blob = WSFile.create(parent: doc, name: file[:filename], content_type: type, edit_time: DateTime.now, create_time: DateTime.now)
            blob.data = file[:tempfile].read
          end
          $redis.del "url:/#{doc.id.encode62}/assets/#{URI.encode(file[:filename])}"
          redirect "/#{doc.id.encode62}/edit"
        end
        if request.xhr?
          content_type  "application/json"
          return "{}"
        end
      end
    end
  end
end
