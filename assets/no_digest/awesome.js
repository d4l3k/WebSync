// WebSync: Notebook layout handler
define(['websync'], function(websync) {
    $("body").append('<script src="/assets/three.js"></script>')
    $("body").append('<script src="/assets/CSS3DRenderer.js"></script>')
    var self = {};
    $(".content").hide().addClass("content-awesome").append($('<div class="content_container"></div>'))
    $("body").addClass("layout-awesome");
    $(document).on("modules_loaded", function() {
        self.scene = new THREE.Scene();
        self.css_scene = new THREE.Scene();
        self.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        // Normal renderer
        self.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        $(".content_container").append(self.renderer.domElement);
        self.css_renderer = new THREE.CSS3DRenderer();
        $(self.css_renderer.domElement).css({
            top: 0,
            position: 'absolute'
        });
        $(".content_container").prepend(self.css_renderer.domElement);

        function resize() {
            var width = window.innerWidth,
                height = window.innerHeight - 96,
                aspect = width / height;
            self.renderer.setSize(width, height);
            self.css_renderer.setSize(width, height);
            self.camera.aspect = aspect;
            self.camera.updateProjectionMatrix();
        }
        resize();
        $(window).resize(resize);
        self.dom = self.renderer.domElement;
        $(self.dom).bind("wheel", function(e) {
            if (e.originalEvent.deltaY) {
                self.camera.position.z += e.originalEvent.deltaY / 120;
            }
            console.log(e);
        });
        var geometry = new THREE.CubeGeometry(1, 1, 1);
        var material = new THREE.MeshLambertMaterial({
            color: 0x00ff00
        });
        self.cube = new THREE.Mesh(geometry, material);
        self.scene.add(self.cube);
        var light = new THREE.PointLight(0xffffff);
        light.position.set(0, 2, 3);
        self.scene.add(light);
        self.camera.position.z = 5;

        // Css Renderer
        var element = document.createElement('img');
        element.src = 'https://secure.gravatar.com/avatar/b280c8b6b26d1ec3d2fcd45f5c56053f?size=500';

        self.cssObject = new THREE.CSS3DObject(element);
        self.cssObject.scale = new THREE.Vector3(0.002, 0.002, 0.002);
        self.cssObject.position.y = 1;
        //self.cssObject.position = planeMesh.position;
        //self.cssObject.rotation = planeMesh.rotation;
        // add it to the css scene
        self.css_scene.add(self.cssObject);



        self.render();
        $(".content").fadeIn();
        NProgress.done();
    });
    var t = 0;
    self.render = function() {
        var td = 1.0;
        var c_time = new Date();
        if (self.lastRender) {
            td = (c_time - self.lastRender) / (16.66667)
        }
        self.lastRender = c_time;
        self.cube.rotation.y += 0.05 * td;
        t += 0.05 * td;
        self.cssObject.rotation.z -= 0.05 * td;
        self.cssObject.position.x = Math.sin(t) * 2;
        self.cssObject.position.y = Math.cos(t) * 2;
        requestAnimationFrame(self.render);
        self.renderer.render(self.scene, self.camera);
        self.css_renderer.render(self.css_scene, self.camera);
    }
    return self;
});
