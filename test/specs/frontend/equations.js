describe('Basic document editing', function() {
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
  it('can create equations by keypress', function(done) {
    var e = helper.$.Event('keydown');
    e.ctrlKey = true; // Control key
    e.shiftKey = true; // Shift key
    e.keyCode = 70; // f
    helper.$("body").parent().parent().trigger(e);

    helper.waitFor(function(){
      return helper.$(".mathquill-editable").first().length == 1;
    }, 2000).done(done);
  });
  it('can create equations by button', function(done) {
    helper.$("#insert_equation").click();

    helper.waitFor(function(){
      return helper.$(".mathquill-editable").first().length == 1;
    }, 2000).done(done);
  });
});
