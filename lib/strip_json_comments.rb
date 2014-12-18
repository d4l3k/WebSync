# This is the Ruby implementation of sindresorhus's strip-json-comments for Node.JS.
# https://github.com/sindresorhus/strip-json-comments
# Ported by Tristan Rice (https://github.com/d4l3k)

class JSONComments

  # Strips the comments from the JSON file
  #
  # @param str [String] The JSON+Comments blob
  # @return [String] The cleaned JSON
  def self.strip(str)
    insideString = false
    insideComment = false
    skipOne = false
    ret = ''
    str.split("").each_with_index do |currentChar, i|
      if skipOne
        skipOne = false
        next
      end
      nextChar = str[i + 1].to_s
      continue = false
      if !insideComment && str[i - 1] != "\\" && currentChar == '"'
        insideString = !insideString
      end

      if insideString
        ret += currentChar
        continue = true
      end

      if !insideComment && currentChar + nextChar == '//'
        insideComment = 'single'
      elsif insideComment == 'single' && currentChar + nextChar == "\r\n"
        insideComment = false
      elsif insideComment == 'single' && currentChar == "\n"
        insideComment = false
      elsif !insideComment && currentChar + nextChar == '/*'
        insideComment = 'multi'
        continue = true
      elsif insideComment == 'multi' && currentChar + nextChar == '*/'
        insideComment = false
        skipOne = true
        continue = true
      end

      if !continue && !insideComment
        ret += currentChar
      end
    end
    ret
  end
end
