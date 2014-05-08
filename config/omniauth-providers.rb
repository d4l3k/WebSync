# Provider Facebook
provider :facebook, ENV['FACEBOOK_KEY'], ENV['FACEBOOK_SECRET']
style    :facebook, "#3b5998", "Facebook"

provider :gplus, ENV['GPLUS_KEY'], ENV['GPLUS_SECRET'], scope: 'userinfo.email, userinfo.profile'
style    :gplus, "#dd4b39", "Google"
