require 'sinatra'
require 'data_mapper'

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
	@javascripts = ["/js/edit.js"]
	@doc = Document.get(params[:doc].to_i)
	erb :edit	
end
