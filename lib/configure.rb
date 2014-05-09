# First time configuration options

if $config.has_key?("default_assets")
    puts "[DATABASE] Checking default assets..."
    $config["default_assets"].each do |asset|
        if Javascript.all(name: asset["name"])[0].nil?
            a = Javascript.create(name:asset["name"],description:asset["description"],url:asset["url"])
            puts " :: Created: #{asset["name"]}, Success: #{a.save}"
        end
    end
end
if $config.has_key?("default_asset_groups")
    puts "[DATABASE] Checking default asset groups..."
    $config["default_asset_groups"].each do |group|
        g = AssetGroup.all(name:group["name"])[0]
        if g.nil?
            g = AssetGroup.create(name:group["name"],description:group["description"])
            group["assets"].each do |asset|
                a = Asset.first(name:asset)
                if not a.nil?
                    g.assets << a
                end
            end
            puts " :: Created: #{g.name}, Success: #{g.save}"
        end
    end
end
if $config.has_key?("default_themes")
    puts "[DATABASE] Checking themes..."
    $config["default_themes"].each do |theme|
        db_theme = Theme.all(name: theme["name"])[0]
        if db_theme.nil?
            db_theme = Theme.create(name: theme["name"], location: theme["stylesheet_tag"])
            puts " :: Created #{db_theme.name}."
        elsif db_theme.location != theme["stylesheet_tag"]
            db_theme.update(location: theme["stylesheet_tag"])
            puts " :: Updated #{db_theme.name}."
        end
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
