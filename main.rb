require 'sinatra'
require 'sinatra-websocket'
require 'data_mapper'
require 'json'

set :server, 'thin'
set :sockets, []

DataMapper.setup(:default, 'sqlite:main.db');

class Document
	include DataMapper::Resource
	property :id, Serial
	property :name, String
	property :body, String
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
		@javascripts = ['/js/edit.js','/js/diff_match_patch.js']
		@doc = Document.get(params[:doc].to_i)
		erb :edit
	else
		doc_id = params[:doc].to_i
		request.websocket do |ws|
			ws.onopen do
				ws.send("hello world!")
			end
			ws.onmessage do |msg|
				data = JSON.parse(msg);
				puts "JSON: #{data.to_s}"
				if data["type"]=="text_update"
					doc = Document.get doc_id
					doc.body = data["text"]
					doc.last_edit_time = Time.now
					puts "Doc: #{doc.to_s}"
					puts "Valid?: #{doc.valid?}"
					puts "Save suceeded: #{doc.save()}"
				end
			end
			ws.onclose do
				warn("websocket closed")
			end
		end
	end
end
