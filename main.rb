use Rack::Logger
use Rack::Session::Cookie, :secret => 'Web-Sync sdkjfskadfh1h3248c99sj2j4j2343'


helpers do
	def logger
		request.logger
	end
end

configure do
	set :server, 'thin'
	set :sockets, []
	set :template_engine, :erb
end 
$dmp = DiffMatchPatch.new
DataMapper.setup(:default, 'sqlite:main.db');

class Document
	include DataMapper::Resource
	property :id, Serial
	property :name, String
	property :body, Text
	property :created, DateTime
	property :last_edit_time, DateTime
	property :public, Boolean, :default=>false
	has n, :assets, :through => Resource
end
# Assets could be javascript or css
class Asset
	include DataMapper::Resource
	property :id, Serial, :key=> true
	property :name, String, :key=> true
	property :description, String
	property :url, String
	property :type, String
	has n, :documents, :through => Resource
end
DataMapper.finalize
DataMapper.auto_upgrade!

Asset.first_or_create(:name=>'Tables',:description=>'Table editing support',:url=>'/js/tables.js',:type=>'javascript')

get '/' do
	@javascripts = []

	erb :index
end
get '/error' do
	error
end
get '/new' do
	login_required
	doc = Document.create(
		:name => 'Unnamed Document',
		:body => '',
		:created => Time.now,
		:last_edit_time => Time.now
	)
	doc.assets << Asset.first(name:'Tables')
	doc.save
	redirect "/#{doc.id}/edit"
end
get '/:doc/download' do
	login_required
	doc = Document.get params[:doc].to_i
  	response.headers['content_type'] = "application/octet-stream"
  	attachment(doc.name+'.docx')
  	response.write(doc.body)	
	#send_data doc.body, :filename=>doc.name+".docx"
end
get '/:doc/edit' do
	login_required
	if !request.websocket?
		@javascripts = [
			'/js/jquery.computedstyles.js',
			#'/js/diff_match_patch.js',
			'/js/rangy-core.js',
			'/js/rangy-cssclassapplier.js',
			'/js/fontdetect.js',
			'/js/diff_match_patch.js',
			'/js/edit.js'
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
				# Loads scripts
				elsif data['type']=="load_scripts"
					doc = Document.get doc_id
					msg = {type:'scripts', js:[]}
					doc.assets.each do |asset|
						arr = :js;
						if asset.type=="javascript"
							arr = :js
						elsif asset.type=="stylesheet"
							arr = :css
						end
						msg[arr].push asset.url
					end
					ws.send JSON.dump msg
				end
			end
			ws.onclose do
				warn("websocket closed")
			end
		end
	end
end
