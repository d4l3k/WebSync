describe("bold button", function(){

  beforeAll(function(done) {
    helper.newDoc(done);
  });
  beforeEach(function() {
    //get the first text element out of the inner iframe
    var firstTextElement = helper.$(".page").first();

    // simulate key presses to delete content
    firstTextElement.sendkeys('{selectall}'); // select all
    firstTextElement.sendkeys('{del}'); // clear the first line
  });
  it("makes text bold, italic, underline, strikethrough on click", function(done) {

    //get the first text element out of the inner iframe
    var $firstTextElement = helper.$(".page").first();

    //select this text element
    $firstTextElement.sendkeys('a');
    $firstTextElement.sendkeys('{selectall}');

    //get the bold button and click it
    helper.$("#bold").click();
    helper.$("#italic").click();
    helper.$("#strikethrough").click();
    helper.$("#underline").click();

    //ace creates a new dom element when you press a button, so just get the first text element again
    var $newFirstTextElement = helper.$(".page").first();

    expect($newFirstTextElement.find("b").length).toEqual(1);
    expect($newFirstTextElement.find("u").length).toEqual(1);
    expect($newFirstTextElement.find("strike").length).toEqual(1);
    expect($newFirstTextElement.find("i").length).toEqual(1);

    //make sure the text hasn't changed
    expect($newFirstTextElement.text()).toEqual($firstTextElement.text());

    done();
  });
});
