require File.expand_path '../test_helper.rb', __FILE__

require 'capybara/rspec'
require 'capybara/poltergeist'
Capybara.javascript_driver = (ENV["DRIVER"] || :poltergeist).to_sym
Capybara.app = WebSync

include Rack::Test::Methods

def app
    WebSync
end
$config['websocket']['port'] = 1337
def loginuser
    user = $helpers.register 'test@websyn.ca', 'testboop'
    visit '/login?/settings'
    page.first(:fillable_field, 'email').set 'test@websyn.ca'
    page.first(:fillable_field, 'password').set 'testboop'
    click_button 'Sign In'
end
def wait_for_edit
    while not current_url.match /\/\S{1,3}\/edit$/
        sleep 0.01
    end
end
def wait_for_no_bar
    while all(".bar").length > 0
        sleep 0.01
    end
end
describe "WebSync Capybara Interface Tests", type: :feature do
    before(:all) do
        # Get backend path relative to binary.
        path = File.expand_path(File.dirname(__FILE__))
        backend = File.join(path, '../bin/backend.js')
        # Launch the backend daemon
        $backend_daemon = fork do
            exec "node #{backend} -p 1337"
        end
    end
    it "should successfully pass core.js tests", :js => true do
        loginuser
        visit '/new/1'
        wait_for_edit
        uri = URI.parse(current_url)
        doc_id = uri.path.split("/")[1].decode62
        doc = WSFile.get(doc_id)
        wait_for_no_bar
        # Title Test
        find("#name").set "Test Doc! 111"

        # Page Test
        find(".page").click
        find(".page").set "Moooop"
        page.evaluate_script("WS.checkDiff();")
        sleep 0.05
        # Title Check
        doc.reload.name.should eq  "Test Doc! 111"
        # Page Check
        doc.reload.body.should eq({"body"=>[{"nodeName"=>"#text", "textContent"=>"Moooop"}]})
    end
    it "should successfully pass tables.js tests", :js => true do
        loginuser
        visit '/new/1'
        wait_for_edit
        uri = URI.parse(current_url)
        doc_id = uri.path.split("/")[1].decode62
        doc = WSFile.get(doc_id)
        wait_for_no_bar
        # Table Test
        find('a', text: 'Insert').click
        find('.page').click

        # Insert table
        find('#table').click
        tds = all('.page table td')
        tds[1].click2
        all('th', text: 'Sheet 1').length.should eq 1

        # Test row & column insertion
        find('[data-original-title="Insert Row Above"]').click2
        all('.page table td').length.should eq 6
        find('[data-original-title="Insert Row Below"]').click2
        all('.page table td').length.should eq 8
        find('[data-original-title="Delete Row"]').click2
        all('.page table td').length.should eq 6
        all('.page table td')[0].click2
        find('[data-original-title="Insert Column Left"]').click2
        all('.page table td').length.should eq 9
        find('[data-original-title="Insert Column Right"]').click2
        all('.page table td').length.should eq 12
        find('[data-original-title="Delete Column"]').click2
        all('.page table td').length.should eq 9
        all('.page table td')[0].click2
        find('[data-original-title="Delete Table"]').click2
        all('.page table').length.should eq 0
    end
    after(:all) do
        Process.kill("TERM", $backend_daemon)
        destroy_testuser
    end
end

class Capybara::Node::Element
    def click2
        self.click
    rescue => e
        self.trigger("click")
    end
end
