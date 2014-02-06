require 'selenium-webdriver'
require File.expand_path '../test_helper.rb', __FILE__
require 'pry'

describe "Complete Test" do
    it "should be able to edit a document" do
        driver = Selenium::WebDriver.for :firefox
        password = (rand*10**50).to_i.encode62
        driver.navigate.to "http://localhost:9292"
        # TODO: Test registration.
        User.all(email: 'test@websyn.ca').documents.destroy!
        User.all(email: 'test@websyn.ca').destroy!
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
        assert User.all(email: 'test@websyn.ca').documents.length == 1
        sleep 2
        # Test title
        driver.find_element(:css, "#name").click
        driver.find_element(:css, "#name").send_keys "Toast"
        driver.find_element(:css, ".page").click
        sleep 2
        assert User.all(email: 'test@websyn.ca').documents[0].name == driver.find_element(:css, "#name").text, "Document title did not sync. Connection error?"
        driver.find_element(:css, "#ribbon_buttons a").click
        driver.find_element(:css, "[href='delete']").click
        assert User.all(email: 'test@websyn.ca').documents.length == 0, "Document failed to be deleted."
        User.all(email: 'test@websyn.ca').documents.destroy!
        User.all(email: 'test@websyn.ca').destroy!

        driver.quit
    end
end
