window = {};
importScripts('/assets/diff_match_patch.js');
importScripts('/assets/jsondiffpatch.js');

dmp = new diff_match_patch();

function log(msg){
    self.postMessage({'cmd':'log','msg':msg});
}

self.onmessage = function(e) {
    var data = e.data;
    switch(data.cmd){
        case 'diff':
            self.postMessage({'cmd':'diffed','patch': jsondiffpatch.diff(data.oldHtml,data.newHtml)});
            break;
        case 'apply_patch':
            self.postMessage({'cmd':'patched','json':jsondiffpatch.patch(data.html,data.patch),"patch":data.patch});
            break;
    }
}
