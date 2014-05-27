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
        var elemm = $("<div class='awesome slide'><div class='slide-content' contenteditable=true></div></div>");
        var elem = self.addCss(elemm[0]);
        self.dirty = true;
        _.delay(self.updateMenu, 50);
        _.delay(function() {
            self.setIndex(self.css_scene.getDescendants().length - 1);
        }, 100);
    });
    $('#remSlide').click(function(e) {
        self.css_scene.remove(self.css_scene.children[self.activeIndex]);
        self.setIndex(self.activeIndex);
        _.delay(self.updateMenu, 50);
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
        $('.slidePreview').eq(index).addClass('active')[0].scrollIntoViewIfNeeded();
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
        self.focus(obj);
        self.dirty = true;
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
            var elemm = $("<div class='awesome slide'><div class='slide-content' contenteditable=true>" + WS.JSONToDOM(view.body) + '</div></div>');
            var elem = self.addCss(elemm[0]);
            _.each(['position', 'quaternion', 'scale'], function(prop) {
                _.each(view[prop], function(v, k) {
                    elem[prop][k] = v;
                });
            });
        });
        self.dirty = true;
        setTimeout(self.updateMenu, 50);
    };
    $('#presentation-nav .toggle-sidebar, .return_edit .menu').click(function() {
        $('#presentation-nav').toggleClass('offscreen');
        var pos = -250;
        if (hidden) {
            pos = 0;
        }
        hidden = !hidden;
        $('.content_well').css({
            left: pos + 250
        });
        _.delay(function() {
            $(window).trigger('resize');
        }, 200);
    });
    $(document).on('viewmode', function(e) {
        if (WS.viewMode == 'Presentation') {
            $('#presentation-nav').removeClass('offscreen');
            hidden = false;
            $('#presentation-nav .toggle-sidebar').click();
        } else {
            $('#presentation-nav').addClass('offscreen');
            hidden = true;
            $('#presentation-nav .toggle-sidebar').click();
        }
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
        $('.content_container').on('mousedown', '.slide', function(e) {
            console.log(e);
            _.each(self.css_scene.getDescendants(), function(dec, i) {
                if (dec.element == e.currentTarget) {
                    self.setIndex(i);
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
            self.dirty = true;
        }
        setTimeout(function() {
            resize();
        }, 1);
        $(window).resize(resize);
        self.dom = self.css_renderer.domElement;
        $('.content_container').bind('wheel', function(e) {
            if (e.originalEvent.deltaY) {
                self.camera.position.add(new THREE.Vector3(0, 0, e.originalEvent.deltaY).applyQuaternion(self.camera.quaternion));
                self.dirty = true;
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
                var x = self.start.x - e.pageX;
                var y = e.pageY - self.start.y;
                self.camera.position = self.cam_start.clone().add(new THREE.Vector3(x, y, 0).applyQuaternion(self.camera.quaternion));
                self.dirty = true;
                e.preventDefault();
            }
        }).bind('mouseup', function(e) {
            self.active = false;
        });
        var ambientLight = new THREE.AmbientLight(0x444444);
        self.scene.add(ambientLight);
        var light = new THREE.DirectionalLight(0xffffff);
        light.position.set(1, 1, 1).normalize();
        self.scene.add(light);
        self.camera.position.z = 500;

        WebSync.fromJSON();

        // Testing code. This is only here as a preview for similar functionality.
        /*var geometry = new THREE.CubeGeometry(200, 200, 200);
        var material = new THREE.MeshLambertMaterial({
            color: 0x00ff00
        });
        self.cube = new THREE.Mesh(geometry, material);
        self.scene.add(self.cube);
        self.cube.position.z = 200;*/

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
        _.delay(function() {
            self.setIndex(0);
        }, 100);
        NProgress.done();
    });
    // Add a HTML node to the CSS3D renderer.
    self.addCss = function(element) {
        var obj = new THREE.CSS3DObject(element);
        self.css_scene.add(obj);
        setTimeout(function() {
            var material = new THREE.MeshBasicMaterial({
                color: 0
            });
            material.opacity = 0;
            material.blending = THREE.NoBlending;
            var geometry = new THREE.PlaneGeometry($(element).outerWidth(), $(element).outerHeight());
            var planeMesh = new THREE.Mesh(geometry, material);
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
        if (self.dirty) {
            self.dirty = false;
            self.renderer.render(self.scene, self.camera);
            self.css_renderer.render(self.css_scene, self.camera);
        }
    };
    self.dirty = true;
    self.focus = function(obj) {
        /*var qm = new THREE.Quaternion();
        THREE.Quaternion.slerp(self.camera.quaternion, obj.quaternion, qm, 0.07);
        self.camera.quaternion = qm;
        self.camera.quaternion.normalize();*/
        var time = 800;
        var distToCenter = 740 / Math.sin(Math.PI / 180.0 * self.camera.fov * 0.5) * 0.5;
        var target = (new THREE.Vector3(0, 0, distToCenter)).applyQuaternion(obj.quaternion).add(obj.position);

        function markDirty() {
            self.dirty = true;
        }
        new TWEEN.Tween(self.camera.position).to(target, time)
            .easing(TWEEN.Easing.Quadratic.InOut).onUpdate(markDirty).start();
        new TWEEN.Tween(self.camera.quaternion).to(obj.quaternion, time)
            .easing(TWEEN.Easing.Quadratic.InOut).onUpdate(markDirty).start();
    };
    self.updateMenu = function() {
        $('#slideView').html('');
        $(self.css_scene.children).each(function(index, slide_obj) {
            var slide = slide_obj.element;
            var preview = $("<div draggable='true' class='slidePreview" + ($(slide).hasClass('active') ? 'active' : '') + "'><div class='slide'>" + $(slide).html() + '</div></div>');
            preview.find('.slide-content').attr('contenteditable', null);
            preview.appendTo($('#slideView'))
                .data({
                    index: index
                });
            var ratio = $(preview).outerWidth() / $(slide).outerWidth();
            var scale = 'scale(' + ratio.toFixed(7) + ')';
            preview.find('.slide').css({
                'transform': scale,
                '-webkit-transform': scale
            });
            preview.height(ratio * $(slide).outerHeight());
        });
        var drag_elem;
        $('.slidePreview').on('dragstart', function(e) {
            drag_elem = this;
        }).on('dragenter', function(e) {
            e.preventDefault();
        }).on('dragover', function(e) {
            e.preventDefault();
            $(this).addClass('over');
        }).on('dragleave', function(e) {
            $(this).removeClass('over');
            e.preventDefault();
        }).on('drop', function(e) {
            var slide_index = $(drag_elem).data().index;
            var new_index = $(this).closest(".slidePreview").data().index;
            self.css_scene.children.move(slide_index, new_index);
            e.preventDefault();
            self.dirty = true;
            _.delay(self.updateMenu, 50);
        });
        $('.slidePreview').eq(self.activeIndex).addClass('active');
    };
    return self;
});
// https://stackoverflow.com/questions/5306680/move-an-array-element-from-one-array-position-to-another
Array.prototype.move = function(old_index, new_index) {
    while (old_index < 0) {
        old_index += this.length;
    }
    while (new_index < 0) {
        new_index += this.length;
    }
    if (new_index >= this.length) {
        var k = new_index - this.length;
        while ((k--) + 1) {
            this.push(undefined);
        }
    }
    this.splice(new_index, 0, this.splice(old_index, 1)[0]);
    return this; // for testing purposes
};
