class WebSync < Sinatra::Base
  get '/admin' do
    admin_required
    erb :admin
  end
  get '/admin/users' do
    admin_required
    erb :admin_users
  end
  get '/admin/assets' do
    admin_required
    erb :admin_assets
  end
  get '/admin/assets/:asset/edit' do
    admin_required
    erb :admin_assets_edit
  end
  get '/admin/assets/:asset/delete' do
    admin_required
    ass = Asset.get(params[:asset])
    if not ass.nil?
      ass.destroy
    end
    redirect '/admin/assets'
  end
  post '/admin/assets/:asset/edit' do
    admin_required
    ass = Asset.get(params[:asset])
    if not ass.nil?
      ass.name = params[:name]
      ass.description = params[:desc]
      ass.url = params[:url]
      ass.type = params[:type]
      ass.save
    else
      n_ass = Asset.create(:name=>params[:name],:description=>params[:desc],:url=>params[:url], :type=>params[:type])
      n_ass.save
    end
    redirect '/admin/assets'
  end
  get '/admin/asset_groups/:asset/edit' do
    admin_required
    erb :admin_asset_groups_edit
  end
  get '/admin/asset_groups/:asset_group/:asset/add' do
    admin_required
    ass = AssetGroup.get(params[:asset_group])
    ass.assets << Asset.get(params[:asset])
    ass.save
    redirect "/admin/asset_groups/#{params[:asset_group]}/edit"
  end
  get '/admin/asset_groups/:asset_group/:asset/remove' do
    admin_required
    ass = AssetGroup.get(params[:asset_group])
    ass.assets.each do |a|
      if a.id==params[:asset].to_i
        ass.assets.delete a
      end
    end
    ass.save
    redirect "/admin/asset_groups/#{params[:asset_group]}/edit"
  end
  get '/admin/asset_groups/:asset/delete' do
    admin_required
    ass = AssetGroup.get(params[:asset])
    if not ass.nil?
      ass.assets = []
      ass.save
      ass.destroy
    end
    redirect '/admin/assets'
  end
  post '/admin/asset_groups/:asset/edit' do
    admin_required
    ass = AssetGroup.get(params[:asset])
    if not ass.nil?
      ass.name = params[:name]
      ass.description = params[:desc]
      ass.save
    else
      n_ass = AssetGroup.create(:name=>params[:name],:description=>params[:desc])
      n_ass.save
    end
    redirect '/admin/assets'
  end
end
