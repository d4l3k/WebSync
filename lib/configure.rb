# First time configuration options

if Asset.count == 0 && $config.has_key?("default_assets")
    puts "[DATABASE] Creating default assets."
    $config["default_assets"].each do |asset|
        a = Javascript.create(name:asset["name"],description:asset["description"],url:asset["url"])
        puts " :: Creating: #{asset["name"]}, Success: #{a.save}"
    end
end
if AssetGroup.count == 0 && $config.has_key?("default_asset_groups")
    puts "[DATABASE] Creating default asset groups."
    $config["default_asset_groups"].each do |group|
        g = AssetGroup.create(name:group["name"],description:group["description"])
        group["assets"].each do |asset|
            a = Asset.first(name:asset)
            if not a.nil?
                g.assets << a
            end
        end
        puts " :: Creating: #{g.name}, Success: #{g.save}"
    end
end
if Theme.count == 0 && $config.has_key?("default_themes")
    puts "[DATABASE] Creating defaut themes."
    $config["default_themes"].each do |theme|
        a = Theme.create(name: theme["name"], location: theme["stylesheet_tag"])
        puts " :: Creating: #{theme["name"]}, Success: #{a.save}"
    end
end

required_dirs = %w(log tmp)
required_dirs.each do |dir|
    if not Dir.exists? dir
        puts "[Creating Directory] #{dir}"
        if Dir.mkdir(dir)
            puts " :: Failed to create directory!"
            exit 1
        end
    end
end
