// WebSync: Awe (similar to Prezi) handler
define(['websync'], function(websync) {
    $('body').append('<script src="/assets/three.js"></script>');
    $('body').append('<script src="/assets/MTL.js"></script>');
    $('body').append('<script src="/assets/tween.min.js"></script>');
    $('body').append('<script src="/assets/CSS3DRenderer.js"></script>');
    var nav = '<div id="presentation-nav" class="sidebar"><button id="addSlide" class="btn btn-default" type="button"><i class="fa fa-plus fa-lg"></i></button> <button id="remSlide" class="btn btn-danger" type="button"><i class="fa fa-lg fa-trash-o"></i></button> <button class="btn btn-default toggle-sidebar"><i class="fa fa-bars fa-lg"></i></button><div id="slideView" class="slideWell panel panel-default"></div><div class="panel panel-default" id="properties"><h3>Properties</h3><hr>';
    _.each(['Position', 'Rotation'], function(v) {
        nav += '<h4>' + v + '</h4>';
        _.each(['x', 'y', 'z'], function(i) {
            nav += i.toUpperCase() + ": <input class='form-control " + v + ' ' + i + "'></input>";
        });
    });
    nav += '</div></div>';
    $('body').append($(nav));
    var self = {};
    temp = self;
    $('.content').hide().addClass('content-awesome').append($('<div class="content_container"></div>'));
    $('body').addClass('layout-awesome');
    var hidden = false;
    $('.content_well').css({
        left: 250
    });
    $('#addSlide').click(function(e) {
        var elemm = $("<div class='awesome awesome-slide' ><div class='slide-content' contenteditable=true></div></div>");
        var elem = self.addCss(elemm[0]);
        setTimeout(self.updateMenu, 50);
    });
    $('#presentation-nav #slideView').delegate('.slidePreview', 'click', function() {
        self.setIndex($(this).data().index);
    });
    self.setIndex = function(index) {
        if (index < 0) index = 0;
        var child_length = self.css_scene.children.length;
        if (index >= child_length) index = child_length - 1;
        self.activeIndex = index;
        if (child_length == 0) return;
        $('.slidePreview.active').removeClass('active');
        $('.slidePreview').eq(index).addClass('active');
        self.focus(self.css_scene.children[index]);
        self.updateProperties();
    };
    self.updateProperties = function() {
        var obj = self.css_scene.children[self.activeIndex];
        _.each(['Position', 'Rotation'], function(type) {
            console.log(type);
            var info = obj[type.toLowerCase()];
            _.each(['x', 'y', 'z'], function(v) {
                $('.' + type + '.' + v).val(info[v]);
            });
        });
    };
    $('#properties input').change(function(e) {
        console.log(e);
        var axis = 'x';
        if ($(this).hasClass('y')) axis = 'y';
        if ($(this).hasClass('z')) axis = 'z';
        var prop = $(this).hasClass('Position') ? 'position' : 'rotation';
        var obj = self.css_scene.children[self.activeIndex];
        obj[prop][axis] = eval($(this).val());
    }).blur(function(e) {
        var axis = 'x';
        if ($(this).hasClass('y')) axis = 'y';
        if ($(this).hasClass('z')) axis = 'z';
        var prop = $(this).hasClass('Position') ? 'position' : 'rotation';
        var obj = self.css_scene.children[self.activeIndex];
        obj[prop][axis] = eval($(this).val());
        self.updateProperties();
    });
    $(document).keydown(function(e) {
        if (WebSyncAuth.view_op == 'view') {
            if (e.keyCode == 39 || e.keyCode == 32 || e.keyCode == 40) {
                // Move forward a slide
                self.setIndex(self.activeIndex + 1);
                e.preventDefault();
            } else if (e.keyCode == 37 || e.keyCode == 38) {
                // Move back a slide
                self.setIndex(self.activeIndex - 1);
                e.preventDefault();
            }
        }
    });
    WebSync.toJSON = function() {
        // Slides/HTML
        WebSyncData.views = [];
        // 3D Objects
        WebSyncData.objects = [];
        _.each(self.css_scene.children, function(child) {
            var obj = {
                position: child.position,
                scale: child.scale,
                quaternion: {
                    w: child.quaternion.w,
                    x: child.quaternion.x,
                    y: child.quaternion.y,
                    z: child.quaternion.z
                },
                body: WS.DOMToJSON(child.element.children[0].childNodes)
            };
            WebSyncData.views.push(obj);
        });
    };
    WebSync.fromJSON = function() {
        for (var i = self.css_scene.children.length; i--; i > 0) {
            self.css_scene.remove(self.css_scene.children[i]);
        }
        _.each(WebSyncData.views, function(view) {
            var elemm = $("<div class='awesome awesome-slide'><div class='slide-content' contenteditable=true>" + WS.JSONToDOM(view.body) + '</div></div>');
            var elem = self.addCss(elemm[0]);
            _.each(['position', 'quaternion', 'scale'], function(prop) {
                _.each(view[prop], function(v, k) {
                    elem[prop][k] = v;
                });
            });
        });
        setTimeout(self.updateMenu, 50);
    };
    $('#presentation-nav .toggle-sidebar, .return_edit .menu').click(function() {
        var pos = -250;
        var button_pos = -53;
        if (hidden) {
            pos = 0;
            button_pos = 0;
        }
        $(this).animate({
            right: button_pos
        });
        $('#presentation-nav').animate({
            left: pos
        });
        $('.content_well').animate({
            left: pos + 250
        }, {
            step: function() {
                $(window).trigger('resize');
            }
        });
        hidden = !hidden;
    });
    $(document).on('modules_loaded', function() {
        self.scene = new THREE.Scene();
        self.css_scene = new THREE.Scene();
        self.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 10000);
        // Normal renderer
        self.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        $('.content_container').append(self.renderer.domElement);
        self.css_renderer = new THREE.CSS3DRenderer();
        $(self.css_renderer.domElement).css({
            top: 0,
            position: 'absolute'
        });
        $('.content_container').prepend(self.css_renderer.domElement).bind('mousedown selectstart', function(e) {
            e.stopPropagation();
        });
        $('.content_container').on('mousedown', '.awesome-slide', function(e) {
            console.log(e);
            _.each(self.css_scene.getDescendants(), function(dec) {
                if (dec.element == e.currentTarget) {
                    self.focus(dec);
                }
            });
        });

        function resize() {
            var width = $('.content_container').width(),
                height = $('.content_container').height(),
                aspect = width / height;
            self.renderer.setSize(width, height);
            self.css_renderer.setSize(width, height);
            self.camera.aspect = aspect;
            self.camera.updateProjectionMatrix();
        }
        setTimeout(function() {
            resize();
        }, 1);
        $(window).resize(resize);
        self.dom = self.css_renderer.domElement;
        $('.content_container').bind('wheel', function(e) {
            if (e.originalEvent.deltaY) {
                self.camera.position.add(new THREE.Vector3(0, 0, e.originalEvent.deltaY).applyQuaternion(self.camera.quaternion));
            }
            console.log(e);
        }).bind('mousedown', function(e) {
            console.log(e);
            if (e.currentTarget == e.target.parentElement || e.currentTarget == e.target.parentElement.parentElement) {
                self.active = true;
                self.start = {
                    x: e.pageX,
                    y: e.pageY
                };
                self.cam_start = self.camera.position.clone();
            }
        });
        $(document).bind('mousemove', function(e) {
            if (self.active) {
                //self.camera.position.x = self.cam_start.x+(self.start.x-e.pageX);
                //self.camera.position.y = self.cam_start.y+(e.pageY-self.start.y);
                self.camera.position = self.cam_start.clone().add(new THREE.Vector3(self.start.x - e.pageX, e.pageY - self.start.y, 0).applyQuaternion(self.camera.quaternion));
                e.preventDefault();
            }
        }).bind('mouseup', function(e) {
            self.active = false;
        });
        /*var geometry = new THREE.CubeGeometry(200, 200, 200);
        var material = new THREE.MeshLambertMaterial({
            color: 0x00ff00
        });
        self.cube = new THREE.Mesh(geometry, material);
        self.scene.add(self.cube);
        self.cube.position.z = 200;*/
        var ambientLight = new THREE.AmbientLight(0x444444);
        self.scene.add(ambientLight);
        var light = new THREE.DirectionalLight(0xffffff);
        light.position.set(1, 1, 1).normalize();
        self.scene.add(light);
        self.camera.position.z = 500;

        WebSync.fromJSON();
        /*// Helicopter
        var loader = new THREE.OBJMTLLoader();
        loader.load('assets/uh60.obj', 'assets/uh60.mtl', function(object) {
            object.position.z = 200;
            object.rotation.x = Math.PI / 2
            object.rotation.y = Math.PI;
            object.rotation.z = Math.PI / 2;
            object.scale.multiplyScalar(50);
            self.heli = object;
            self.scene.add(object);

        });*/

        self.render();
        $('.content').fadeIn();
        self.setIndex(0);
        NProgress.done();
    });
    self.addCss = function(element) {
        var obj = new THREE.CSS3DObject(element);
        self.css_scene.add(obj);
        setTimeout(function() {
            var material = new THREE.MeshLambertMaterial({
                color: 0xffffff
            });
            //material.opacity = 0;
            //material.blending = THREE.NoBlending;
            var planeFragmentShader = [

                'uniform vec3 diffuse;',
                'uniform float opacity;',

                THREE.ShaderChunk['color_pars_fragment'],
                THREE.ShaderChunk['map_pars_fragment'],
                THREE.ShaderChunk['lightmap_pars_fragment'],
                THREE.ShaderChunk['envmap_pars_fragment'],
                THREE.ShaderChunk['fog_pars_fragment'],
                THREE.ShaderChunk['shadowmap_pars_fragment'],
                THREE.ShaderChunk['specularmap_pars_fragment'],

                'void main() {',

                'gl_FragColor = vec4( 1.0, 1.0, 1.0, 1.0 );',

                THREE.ShaderChunk['map_fragment'],
                THREE.ShaderChunk['alphatest_fragment'],
                THREE.ShaderChunk['specularmap_fragment'],
                THREE.ShaderChunk['lightmap_fragment'],
                THREE.ShaderChunk['color_fragment'],
                THREE.ShaderChunk['envmap_fragment'],
                THREE.ShaderChunk['shadowmap_fragment'],
                THREE.ShaderChunk['linear_to_gamma_fragment'],
                THREE.ShaderChunk['fog_fragment'],

                //"gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 - shadowColor.x );",

                '}'

            ].join('\n');

            var betterFragmentShader = [
                '#define USE_SHADOWMAP',
                'uniform float opacity;',

                'varying vec3 vLightFront;',

                '#ifdef DOUBLE_SIDED',

                'varying vec3 vLightBack;',

                '#endif',

                THREE.ShaderChunk['color_pars_fragment'],
                THREE.ShaderChunk['map_pars_fragment'],
                THREE.ShaderChunk['lightmap_pars_fragment'],
                THREE.ShaderChunk['envmap_pars_fragment'],
                THREE.ShaderChunk['fog_pars_fragment'],
                THREE.ShaderChunk['shadowmap_pars_fragment'],
                THREE.ShaderChunk['specularmap_pars_fragment'],

                'void main() {',

                'gl_FragColor = vec4( 1.0, 1.0, 1.0, 1.0 );',

                THREE.ShaderChunk['map_fragment'],
                THREE.ShaderChunk['alphatest_fragment'],
                THREE.ShaderChunk['specularmap_fragment'],

                '#ifdef DOUBLE_SIDED',

                //"float isFront = float( gl_FrontFacing );",
                //"gl_FragColor.xyz *= isFront * vLightFront + ( 1.0 - isFront ) * vLightBack;",

                'if ( gl_FrontFacing )',
                'gl_FragColor.xyz *= vLightFront;',
                'else',
                'gl_FragColor.xyz *= vLightBack;',

                '#else',

                'gl_FragColor.xyz *= vLightFront;',

                '#endif',

                THREE.ShaderChunk['lightmap_fragment'],
                THREE.ShaderChunk['color_fragment'],
                THREE.ShaderChunk['envmap_fragment'],
                THREE.ShaderChunk['shadowmap_fragment'],

                THREE.ShaderChunk['linear_to_gamma_fragment'],

                THREE.ShaderChunk['fog_fragment'],
                //"gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 - shadowColor.x );",

                '}'

            ].join('\n');

            var planeMaterial = new THREE.ShaderMaterial({
                uniforms: THREE.ShaderLib['lambert'].uniforms,
                vertexShader: THREE.ShaderLib['lambert'].vertexShader,
                fragmentShader: betterFragmentShader,
                color: 0x0000FF
            });
            var geometry = new THREE.PlaneGeometry($(element).outerWidth(), $(element).outerHeight());
            var planeMesh = new THREE.Mesh(geometry, planeMaterial);
            planeMesh.scale = obj.scale;
            planeMesh.position = obj.position;
            planeMesh.quaternion = obj.quaternion;
            self.scene.add(planeMesh);
        }, 1);
        return obj;
    };
    var dir = 1;
    self.render = function() {
        var td = 1.0;
        var c_time = new Date();
        if (self.lastRender) {
            td = (c_time - self.lastRender) / (16.66667);
        }
        TWEEN.update();
        self.lastRender = c_time;
        if (self.heli) self.heli.rotation.z += 0.01 * td;
        requestAnimationFrame(self.render);
        self.renderer.render(self.scene, self.camera);
        self.css_renderer.render(self.css_scene, self.camera);
    };
    self.focus = function(obj) {
        /*var qm = new THREE.Quaternion();
        THREE.Quaternion.slerp(self.camera.quaternion, obj.quaternion, qm, 0.07);
        self.camera.quaternion = qm;
        self.camera.quaternion.normalize();*/
        var time = 800;
        var distToCenter = 740 / Math.sin(Math.PI / 180.0 * self.camera.fov * 0.5) * 0.5;
        var target = (new THREE.Vector3(0, 0, distToCenter)).applyQuaternion(obj.quaternion).add(obj.position);
        new TWEEN.Tween(self.camera.position).to(target, time).easing(TWEEN.Easing.Quadratic.InOut).start();
        new TWEEN.Tween(self.camera.quaternion).to(obj.quaternion, time).easing(TWEEN.Easing.Quadratic.InOut).start();
    };
    self.updateMenu = function() {
        $('#slideView').html('');
        $('.awesome-slide .slide-content').each(function(index, slide) {
            $("<div class='slidePreview " + ($(slide).hasClass('active') ? 'active' : '') + "'><div class='slide'>" + $(slide).html() + '</div></div>').attr('style', $(slide).attr('style')).appendTo($('#slideView')).data({
                index: index
            });
            /*var elem = $("<div class='slidePreview'><canvas width='1024' height='756'></div>").appendTo($("#slideView"))
            elem.data({
                index: index
            });
            setTimeout(function(){
                var canvas = elem.children().get(0);
                var ctx = canvas.getContext("2d");
                var data = "data:image/svg+xml," +
                   "<svg xmlns='http://www.w3.org/2000/svg' width='1024' height='756'>" +
                     "<foreignObject width='100%' height='100%'>" +
                       "<div xmlns='http://www.w3.org/1999/xhtml'>" +
                            $(slide).html() +
                       "</div>" +
                     "</foreignObject>" +
                   "</svg>";
                var img = new Image();
                img.src = data;
                img.onerror = function(e){
                    console.log("IMG ERR", e, $(slide).html());
                }
                img.onload = function() { ctx.drawImage(img, 0, 0);
                    alert("Loaded");
                }
                    $(img).appendTo("body")
            },50);*/
        });
    };
    return self;
});
