require 'selenium-webdriver'
require File.expand_path '../test_helper.rb', __FILE__
require 'pry'

describe "Complete Test" do
    it "should be able to edit a document" do
        driver = Selenium::WebDriver.for :firefox
        password = (rand*10**50).to_i.encode62
        driver.navigate.to "http://localhost:9292"
        # TODO: Test registration.
        assert User.all(email: 'test@websyn.ca').documents.destroy!
        assert User.all(email: 'test@websyn.ca').destroy!
        user = User.first_or_create(email: 'test@websyn.ca', password: password)
        driver.find_element(:partial_link_text, 'Sign In').click
        
        assert driver.find_element(:css, ".panel-title").text=="Sign In"
        
        # Test Login
        driver.find_element(:name, "email").send_keys "test@websyn.ca"
        driver.find_element(:name, "password").send_keys password
        driver.find_element(:css, ".form-group button").click
        # Create Document
        driver.find_element(:css, ".btn-group button").click
        driver.find_element(:css, ".btn-group.open .dropdown-menu a").click
        sleep 1
        assert User.all(email: 'test@websyn.ca').documents.length == 1
        sleep 2

        # Test title change
        driver.find_element(:css, "#name").click
        driver.find_element(:css, "#name").send_keys "Toast"
        driver.find_element(:css, ".page").click
        sleep 2
        assert User.all(email: 'test@websyn.ca').documents[0].name == driver.find_element(:css, "#name").text, "Document title did not sync. Connection error?"

        # Test body change
        text = "I am quite fond of jelly bellies."
        page = driver.find_element(:css, ".page")
        page.click
        page.send_keys text
        sleep 1
        doc = User.all(email: 'test@websyn.ca').documents[0]
        assert doc.body["body"][0]["textContent"] == text, "Modify text"
        assert doc.changes.length == 1, "Create patch"

        # Test Permissions
        driver2 = Selenium::WebDriver.for :firefox
        driver2.navigate.to driver.execute_script("return window.location.href")
        assert driver2.find_element(:css, ".panel-title").text=="Sign In"
        driver.find_element(:id, "settingsBtn").click

        # Test Hidden viewing mode
        element = driver.find_element(:id, "access_mode")
        select=Selenium::WebDriver::Support::Select.new(element)
        select.select_by(:text, "Hidden (link only)")
        driver2.navigate.to driver.execute_script("return window.location.href")

        # This will throw an error if there is no button.
        assert driver2.find_elements(:id, "settingsBtn").length==1
        
        # Test Public viewing mode.
        select.select_by(:text, "Public")
        driver2.navigate.to driver.execute_script("return window.location.href")
        assert driver2.find_elements(:id, "settingsBtn").length==1
        
        # Close settings menu
        driver.find_element(:id, "settingsBtn").click
        
        # Test Chat
        driver.find_element(:id, "chat_btn").click
        driver2.find_element(:id, "chat_btn").click
        chat_input = driver.find_element(:id, "appendedInputButton")
        chat_input.click
        chat_input.send_keys "Hi there! How are you?"
        driver.find_element(:id, "msg_btn").click
        sleep 2
        assert driver2.find_elements(:partial_link_text, 'test@websyn.ca').length==1
        driver.find_element(:id, "chat_btn").click
        driver2.find_element(:id, "chat_btn").click
        
        # Test Deletion
        driver2.quit
        driver.find_element(:css, "#ribbon_buttons a").click
        driver.find_element(:css, "[href='delete']").click
        assert User.all(email: 'test@websyn.ca').documents.first.deleted, "Document failed to be deleted."
        assert User.all(email: 'test@websyn.ca').documents.destroy!
        assert User.all(email: 'test@websyn.ca').destroy!
        driver.quit
    end
end
