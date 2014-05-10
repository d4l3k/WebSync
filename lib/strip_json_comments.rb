class JSONComments
    def self.strip(str)
        insideString = false
        insideComment = false
        ret = ''
        str.split("").each_with_index do |currentChar, i|
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
                    continue = true
            end

            if insideComment
                    continue = true
            end
            if not continue
                ret += currentChar
            end
        end
        ret
    end
end
