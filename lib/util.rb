# String helper method
class String
    def escape_html
        Rack::Utils.escape_html(self)
    end
end
# Likely nolonger needed
def json_to_html_node obj
    html = "";
    if obj['name']=="#text"
        return obj['textContent']
    end
    html+="<"+obj['name']
    obj.each do |k,v|
        if k!="name"&&k!="textContent"&&k!="childNodes"
            html+=" "+k+"="+MultiJson.dump(v)
        end
    end

    if obj.has_key? 'childNodes'
        html+=">";
        obj['childNodes'].each do |elem|
            html+= json_to_html_node(elem)
        end
        html+="</"+obj['name']+">"
    else
        html+="/>"
    end
    return html
end
def json_to_html obj
    html = ""
    obj.each do |elem|
        html += json_to_html_node(elem)
    end
    return html
end

def node_to_json html
    if html.name=="text"
        return { name: "#text", textContent: html.to_s}
    end
    json = {
        name: html.name.upcase
    }
    if defined? html.attributes
        html.attributes.each do |name, attr|
            json[attr.name]=attr.value
        end
    end
    if html.children.length > 0
        json['childNodes']=[]
        html.children.each do |child|
            json['childNodes'].push( node_to_json(child) )
        end
    end
    return json
end

def html_to_json html
    dom = Nokogiri::HTML(html)
    json = []
    dom.document.children.each do |elem|
        json.push node_to_json(elem)
    end
    return json
end
