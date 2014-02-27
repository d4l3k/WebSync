// WebSync: Awe (similar to Prezi) handler
define(['websync'], function(websync) {
    $("body").append('<script src="/assets/three.js"></script>')
    $("body").append('<script src="/assets/tween.min.js"></script>')
    $("body").append('<script src="/assets/CSS3DRenderer.js"></script>')
    var self = {};
    temp = self;
    $(".content").hide().addClass("content-awesome").append($('<div class="content_container"></div>'))
    $("body").addClass("layout-awesome");
    $(document).on("modules_loaded", function() {
        self.scene = new THREE.Scene();
        self.css_scene = new THREE.Scene();
        var width = window.innerWidth,
            height = window.innerHeight - 96,
            aspect = width / height;
        self.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 10000);
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
        $(".content_container").prepend(self.css_renderer.domElement).bind("mousedown selectstart", function(e){
            e.stopPropagation();
        });
        $(".content_container").on("mousedown", ".awesome-slide", function(e){
            console.log(e);
            _.each(self.css_scene.getDescendants(), function(dec){
                if(dec.element==e.currentTarget){
                    self.focus(dec);
                }
            });
        });
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
        self.dom = self.css_renderer.domElement;
        $(".content_container").bind("wheel", function(e) {
            if (e.originalEvent.deltaY) {
                self.camera.position.add(new THREE.Vector3(0,0,e.originalEvent.deltaY).applyQuaternion(self.camera.quaternion));
            }
            console.log(e);
        }).bind("mousedown", function(e) {
            console.log(e);
            if(e.currentTarget == e.target.parentElement || e.currentTarget == e.target.parentElement.parentElement){
                self.active = true;
                self.start = {x: e.pageX, y: e.pageY};
                self.cam_start = self.camera.position.clone();
            }
        });
        $(document).bind('mousemove', function(e) {
            if(self.active){
                //self.camera.position.x = self.cam_start.x+(self.start.x-e.pageX);
                //self.camera.position.y = self.cam_start.y+(e.pageY-self.start.y);
                self.camera.position = self.cam_start.clone().add(new THREE.Vector3(self.start.x-e.pageX,e.pageY-self.start.y,0).applyQuaternion(self.camera.quaternion));
                e.preventDefault();
            }
        }).bind('mouseup', function(e){
            self.active = false;
        });
        var geometry = new THREE.CubeGeometry(200, 200, 200);
        var material = new THREE.MeshLambertMaterial({
            color: 0x00ff00
        });
        self.cube = new THREE.Mesh(geometry, material);
        self.scene.add(self.cube);
        self.cube.position.z = 200;
        var light = new THREE.PointLight(0xffffff);
        light.position.set(0, 400, 600);
        self.scene.add(light);
        self.camera.position.z = 500;
        
        var element = $("<div class='awesome awesome-slide' contenteditable=true>Some content</div>");

        self.elem = self.addCss(element[0]);
        self.elem.position.z = 70;
        
        var elemm = $("<div class='awesome awesome-slide' contenteditable=true>Some content</div>");

        self.elem2 = self.addCss(elemm[0]);
        self.elem2.position.z = -400;
        self.elem2.position.x = 800;
        self.elem2.rotation.y = Math.PI/8;
        self.render();
        $(".content").fadeIn();
        self.focus(self.elem2);
        NProgress.done();
    });
    self.addCss = function(element){
        var obj = new THREE.CSS3DObject(element);
        self.css_scene.add(obj);
        setTimeout(function(){
            var material = new THREE.MeshBasicMaterial({ color: 0 });
            material.opacity   = 0;
            material.blending  = THREE.NoBlending;
            var geometry = new THREE.PlaneGeometry( $(element).outerWidth(), $(element).outerHeight());
            var planeMesh = new THREE.Mesh( geometry, material );
            planeMesh.scale = obj.scale;
            planeMesh.position = obj.position;
            planeMesh.quaternion= obj.quaternion;
            self.scene.add(planeMesh);
        },1);
        return obj;
    }
    var t = 0;
    var dir = 1;
    self.render = function() {
        var td = 1.0;
        var c_time = new Date();
        if (self.lastRender) {
            td = (c_time - self.lastRender) / (16.66667)
        }
        TWEEN.update();
        self.lastRender = c_time;
        self.cube.rotation.y += 0.05 * td;
        t += 0.05 * td;
        requestAnimationFrame(self.render);
        self.renderer.render(self.scene, self.camera);
        self.css_renderer.render(self.css_scene, self.camera);
    }
    self.focus = function(obj){
        /*var qm = new THREE.Quaternion();
        THREE.Quaternion.slerp(self.camera.quaternion, obj.quaternion, qm, 0.07);
        self.camera.quaternion = qm;
        self.camera.quaternion.normalize();*/
        var target = (new THREE.Vector3(0,0,550)).applyQuaternion(obj.quaternion).add(obj.position);
        new TWEEN.Tween(self.camera.position).to(target, 1000).easing(TWEEN.Easing.Quadratic.InOut).start();
        new TWEEN.Tween( self.camera.quaternion ).to( obj.quaternion, 1000 ).easing( TWEEN.Easing.Quadratic.InOut).start();
    }
    return self;
});
