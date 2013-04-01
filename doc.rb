#!/usr/bin/ruby
require 'erubis'
require 'uri'

raw_doc = `grep -nH -A1 -e " Function:" -e " Variable:" */*/*.js views/*.erb`.split "--"
scripts = {}
functions = {}
raw_doc.each do |doc_item|
    lines = doc_item.strip.split "\n"
    first_line = lines[0].split(':')
    file = first_line[0]
    line_number = first_line[1]
    type = first_line[2].delete('//').strip
    function = first_line[3].strip
    desc = lines[1].split('//')[1].strip
    desc.gsub!('TODO:','<span class="todo">TODO:</span>')
    desc.gsub!('internal','<span class="internal">internal</span>')
    functions[file]||=[]
    functions[file]<< [file,line_number,type,function,desc]
    #puts functions[file].to_s
    scripts[file]||= `cat #{file}`.strip
    #Kernel.exit
end
#puts raw_doc.to_s
#puts functions.to_s

puts "Outputting to: #{Dir.pwd}/doc_gen.html"
File.open('doc_gen.html','w') do |file|
    file.puts Erubis::Eruby.new(DATA.read).result(binding())
end

__END__

<html>
    <head>
        <script src="https://google-code-prettify.googlecode.com/svn/loader/run_prettify.js"></script>
        <script src="http://code.jquery.com/jquery-1.9.1.min.js"></script>
        <style>
            html {
                margin: 20px;
                overflow: auto !important;
            }
            ol.linenums {
                margin-left: 50px;
            }
            body .script {
                word-wrap:break-word;
                display:none;
            }
            .well {
                min-height: 20px;
                padding: 19px;
                margin-bottom: 20px;
                background-color: #f5f5f5;
                border: 1px solid #e3e3e3;
                -webkit-border-radius: 4px;
                -moz-border-radius: 4px;
                border-radius: 4px;
                -webkit-box-shadow: inset 0 1px 1px rgba(0,0,0,0.05);
                -moz-box-shadow: inset 0 1px 1px rgba(0,0,0,0.05);
                box-shadow: inset 0 1px 1px rgba(0,0,0,0.05);
            }
            .todo {
                background-color: yellow;
            }
            .internal {
                background-color: red;
            }
            body, html {
                font-family: 'Helvetica';
            }
        </style>
    </head>
    <body>
        <h1>Web-Sync Client API</h1>
        <p>Many of these functions are for internal use only and are provided merely for completeness.</p>
        <% script_num = 0
        scripts.each do |scriptname,script|
            script_num+=1%>
            <h3>File: <%=scriptname%></h3>
            <hr>
            <% functions[scriptname].each do |func_data| %>
                <div class='well'>
                <b><%=func_data[3]%></b>
                <br>
                <i>Type: <%=func_data[2]%>, Line: <%=func_data[1]%></i>
                <br>
                <span><%=func_data[4]%></span>
                </div>
            <%end%>
            <h4><a href="#" class="btn btn-primary" onclick="$('#<%=script_num%>').toggle(); false">View Source</a></h4>
            <pre class="script prettyprint linenums" id="<%= script_num %>"><%= script.gsub('<','&#60;').gsub('>','&#62') %></pre>
        <% end %>
        <script type='text/javascript'>
            $("a").click(function(e){
                e.preventDefault();
            });
        </script>
    </body>
</html>
