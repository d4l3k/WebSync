# Monkey patched Redis for easy caching.
class Redis
  # Return a value if cached otherwise save the result from a block.
  def cache(key, expire=nil)
    if (value = get(key)).nil?
      value = yield(self)
      set(key, value)
      expire(key, expire) if expire
      value
    else
      value
    end
  end
end
