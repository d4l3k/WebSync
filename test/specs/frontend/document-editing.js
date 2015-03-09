describe('Basic document editing', function() {
  beforeAll(function(done) {
    helper.newDoc(done);
  });
  it('the page should be visible', function(done) {
    helper.waitFor(function(){
      return helper.$('.page').is(':visible');
    }, 2000).done(done);
  });

  it('when you enter any char it appears right', function(done) {
    var expectedString = "abcdefghijklmnopqrstuvwxyz";

    //get the first text element out of the inner iframe
    var firstTextElement = helper.$(".page").first();

    // simulate key presses to delete content
    firstTextElement.sendkeys('{selectall}'); // select all
    firstTextElement.sendkeys('{del}'); // clear the first line
    firstTextElement.sendkeys(expectedString); // insert the string

    helper.waitFor(function(){
      return helper.$(".page").first().text() === expectedString;
    }, 2000).done(done);
  });
});
