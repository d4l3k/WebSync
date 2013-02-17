use Rack::Logger

helpers do
	def logger
		request.logger
	end
end

set :server, 'thin'
set :sockets, []
$dmp = DiffMatchPatch.new
DataMapper.setup(:default, 'sqlite:main.db');

class Document
	include DataMapper::Resource
	property :id, Serial
	property :name, String
	property :body, Text
	property :created, DateTime
	property :last_edit_time, DateTime
	has n, :assets, :through => Resource
end
# Assets could be javascript or css
class Asset
	include DataMapper::Resource
	property :id, Serial
	property :name, String
	property :description, String
	property :url, String
	property :type, String
	has n, :documents, :through => Resource
end
DataMapper.finalize
DataMapper.auto_upgrade!

get '/' do
	@javascripts = []

	erb :index
end
get '/error' do
	error
end
get '/new' do
	doc = Document.create(
		:name => 'Unnamed Document',
		:body => '',
		:created => Time.now,
		:last_edit_time => Time.now
	)
	redirect "/#{doc.id}/edit"
end
get '/:doc/edit' do
	if !request.websocket?
		@javascripts = [
			'/js/edit.js',
			#'/js/diff_match_patch.js',
			'/js/rangy-core.js',
			'/js/rangy-cssclassapplier.js',
			'/js/fontdetect.js',
			'/js/diff_match_patch.js'
		]
		@doc = Document.get(params[:doc].to_i)
		if !@doc.nil?
			erb :edit
		else
			redirect '/'
		end
	# Websocket edit
	else
		doc_id = params[:doc].to_i
		request.websocket do |ws|
			ws.onopen do
				ws.send("hello world!")
			end
			ws.onmessage do |msg|
				data = JSON.parse(msg);
				puts "JSON: #{data.to_s}"
				# This replaces all the text w/ the provided content.
				if data["type"]=="text_update"
					doc = Document.get doc_id
					doc.body = data["text"]
					doc.last_edit_time = Time.now
					if !doc.save
						puts("Save errors: #{doc.errors.inspect}")
					end
				# Google Diff-Match-Patch algorithm
				elsif data['type']=='text_patch'
					doc = Document.get doc_id
					patches = $dmp.patch_from_text data['patch']
					doc.body = $dmp.patch_apply(patches,doc.body)[0]
					doc.last_edit_time = Time.now
					if !doc.save
						puts("Save errors: #{doc.errors.inspect}")
					end
				# Sets the name
				elsif data['type']=="name_update"
					doc = Document.get doc_id
					doc.name = data["name"]
					doc.last_edit_time = Time.now
					if !doc.save
						puts("Save errors: #{doc.errors.inspect}")
					end
				end
			end
			ws.onclose do
				warn("websocket closed")
			end
		end
	end
end
