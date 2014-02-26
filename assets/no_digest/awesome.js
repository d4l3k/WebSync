// WebSync: Notebook layout handler
define(['websync'], function(websync) {
    $("body").append('<script src="/assets/three.js"></script>')
    var self = {};
    $(".content").hide().addClass("content-awesome").append($('<div class="content_container"></div>'))
    $("body").addClass("layout-awesome");
    $(document).on("modules_loaded",function(){
        self.scene = new THREE.Scene();
        self.camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
        // Normal renderer
        self.renderer = new THREE.WebGLRenderer({antialias:true, alpha: true});
        function resize(){
            var width = window.innerWidth, height = window.innerHeight - 96, aspect = width/height;
            self.renderer.setSize( width, height);
            self.camera.aspect = aspect;
            self.camera.updateProjectionMatrix();
        }
        resize();
        $(window).resize(resize);
        $(".content_container").append( self.renderer.domElement );
        self.dom = self.renderer.domElement;
        $(self.dom).bind("wheel",function(e){
            if(e.originalEvent.deltaY){
                self.camera.position.z += e.originalEvent.deltaY/120;
            }
            console.log(e);
        });
        var geometry = new THREE.CubeGeometry(1,1,1);
        var material = new THREE.MeshLambertMaterial( { color: 0x00ff00 } );
        self.cube = new THREE.Mesh( geometry, material );
        self.scene.add( self.cube );
        var light = new THREE.PointLight(0xffffff);
        light.position.set(0,2,3);
        self.scene.add(light);
        self.camera.position.z = 5;
        
        // Css Renderer

        
        
        self.render();
        $(".content").fadeIn();
        NProgress.done();
    });
    self.render = function(){
        self.cube.rotation.y += 0.05;
        requestAnimationFrame(self.render);
        self.renderer.render(self.scene, self.camera);
    }
    return self;
});
