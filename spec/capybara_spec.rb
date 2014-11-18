require File.expand_path '../test_helper.rb', __FILE__

include Rack::Test::Methods

$config['websocket']['port'] = 1337
def loginuser
  user = $helpers.register 'test@websyn.ca', 'testboop'
  visit '/login?/settings'
  page.first(:fillable_field, 'email').set 'test@websyn.ca'
  page.first(:fillable_field, 'password').set 'testboop'
  click_button 'Sign In'
  user
end
def wait_for
  start = Time.now
  while !yield && (Time.now-start) < 5
    sleep 0.05
  end
  if Time.now-start >= 5
    puts "WAIT FOR TIMED OUT!"
  end
end
def wait_for_edit
  wait_for do
    current_url.match(/\/\S{1,3}\/edit$/)
  end
end
def wait_for_no_bar
  wait_for do
    all(".bar").length == 0
  end
  expect(all(".bar").length).to eq(0)
end
def new_doc type
  id = AssetGroup.all(name: type).first.id
  visit "/new/#{id}"
  wait_for_edit
  uri = URI.parse(current_url)
  doc_id = uri.path.split("/")[1].decode62
  doc = WSFile.get(doc_id)
  wait_for_no_bar
  doc
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
  it "should successfully pass Document core.js tests", :js => true do
    loginuser
    doc = new_doc 'Document'
    sleep 0.5
    # Title Test
    find("#name").set "Test Doc! 111"

    # Page Test
    find(".page").click
    find(".page").set "Moooop"
    # CSS Test
    find('#settingsBtn').click2
    page.evaluate_script('require("edit").editor.setValue("* { color: red; }")')

    # Permissions Test
    find('[href="#permissions"]').click2
    find('#access_mode').select('Hidden (link only)')
    find('#default_permissions').select('Editor')
    find('#share_email').set('moo@websyn.ca')
    find('#share_with').click2
    wait_for do
      all('#user_perms select').length >= 2
    end
    all("#user_perms tr").select do |a|
      a.all("td").length > 0 && a.all("td")[0].text == "moo@websyn.ca"
    end[0].find("select").select('Editor')
    sleep 0.1
    page.evaluate_script("WS.checkDiff();")
    sleep 0.1
    doc = doc.reload
    # Title Check
    expect(doc.name).to eq  "Test Doc! 111"
    # Page Check
    expect(doc.body["body"]).to eq([{"nodeName"=>"#text", "textContent"=>"Moooop"}])
    # CSS Check
    expect(doc.body["custom_css"]).to eq(["* { color: red; }"])
    # Permissions Check
    expect(doc.visibility).to eq("hidden")
    expect(doc.default_level).to eq("editor")
    perms = doc.permissions(user_email: 'moo@websyn.ca')
    expect(perms.length).to eq(1)
    expect(perms[0].level).to eq("editor")
    all('#user_perms a:not([disabled])').first.click2
    wait_for do
      all('#user_perms select').length == 1
    end
    expect(all('#user_perms select').length).to eq(1)

    # Libraries Check
    find('[href="#assets"]').click2
    wait_for do
      all('#assets tr').length >= 2
    end
    expect(all('#assets tr').length).to be >= 2

    # Changes Check
    find('[href="#diffs"]').click2
    wait_for do
      all('#diffs tr').length >= 2
    end
    expect(all('#diffs tr').length).to be >= 2

  end
  it "should successfully pass tables.js tests", :js => true do
    loginuser
    new_doc 'Document'
    # Table Test
    find('a', text: 'Insert').click
    find('.page').click

    # Insert table
    find('#table').click
    tds = all('.page table td')
    tds[1].click2
    expect(all('th', text: 'Table 1').length).to eq 1

    # Test row & column insertion
    find('[data-original-title="Insert Row Above"]').click2
    expect(all('.page table td').length).to eq 6
    find('[data-original-title="Insert Row Below"]').click2
    expect(all('.page table td').length).to eq 8
    find('[data-original-title="Delete Row"]').click2
    expect(all('.page table td').length).to eq 6
    all('.page table td')[0].click2
    find('[data-original-title="Insert Column Left"]').click2
    expect(all('.page table td').length).to eq 9
    find('[data-original-title="Insert Column Right"]').click2
    expect(all('.page table td').length).to eq 12
    find('[data-original-title="Delete Column"]').click2
    expect(all('.page table td').length).to eq 9
    all('.page table td')[0].click2
    find('[data-original-title="Delete Table"]').click2
    expect(all('.page table').length).to eq 0
  end
  it "should successfully load everything", js: true do
    loginuser
    %w{Spreadsheet Notebook}.each do |type|
      new_doc type
    end
  end
  after(:all) do
    Process.kill("TERM", $backend_daemon)
    destroy_testuser
  end
end

class Capybara::Node::Element
  def click2
    self.click
  rescue
    self.trigger("click")
  end
end
