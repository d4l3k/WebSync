/*global define, $, _, document, WebSyncAuth, WebSyncData, window, THREE, TWEEN,
  NProgress, JST, requestAnimationFrame*/

//= require templates/awesome

// WebSync: Awe (similar to Prezi) handler
define(['websync'], function(WS) {
  'use strict';

  /**
   * Awe (similar to Prezi) plugin.
   * @exports awesome
   */

  var exports = {
    /**
     * Sets the current index of the Awesome slide.
     *
     * @param {Number} index - the index
     */
    setIndex: function(index) {
      if (index < 0) {
        index = 0;
      }
      var child_length = exports.css_scene.children.length;
      if (index >= child_length) {
        index = child_length - 1;
      }
      exports.activeIndex = index;
      if (child_length === 0) {
        return;
      }
      $('.slidePreview.active').removeClass('active');
      $('.slidePreview').eq(index).addClass('active')[0].scrollIntoViewIfNeeded();
      exports.focus(exports.css_scene.children[index]);
      exports.updateProperties();
    },

    // Updates the properties pane from the selected slide.
    updateProperties: function() {
      var obj = exports.css_scene.children[exports.activeIndex];
      _.each(['Position', 'Rotation'], function(type) {
        console.log(type);
        var info = obj[type.toLowerCase()];
        _.each(['x', 'y', 'z'], function(v) {
          $('.' + type + '.' + v).val(info[v]);
        });
      });
    },

    // Updates the position of the slide from the property pane.
    changePositionOfSlide: function() {
      var axis = 'x';
      if ($(this).hasClass('y')) {
        axis = 'y';
      }
      if ($(this).hasClass('z')) {
        axis = 'z';
      }
      var prop = $(this).hasClass('Position') ? 'position' : 'rotation';
      var obj = exports.css_scene.children[exports.activeIndex];
      obj[prop][axis] = eval($(this).val());
      return obj;
    },

    // Triggers a resize of the awesome document.
    resize: function() {
      var width = $('.content_container').width(),
        height = $('.content_container').height(),
        aspect = width / height;
      exports.renderer.setSize(width, height);
      exports.css_renderer.setSize(width, height);
      exports.camera.aspect = aspect;
      exports.camera.updateProjectionMatrix();
      exports.dirty = true;
    },

    /**
     * Add a HTML node to the CSS3D renderer.
     *
     * @param {Element} element - the node to add
     * @return {THREE.CSS3DObject}
     */
    addCss: function(element) {
      var obj = new THREE.CSS3DObject(element);
      exports.css_scene.add(obj);
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
        exports.scene.add(planeMesh);
      }, 1);
      return obj;
    },

    // Triggers the document to update the canvas and positions.
    render: function() {
      var td = 1.0;
      var c_time = new Date();
      if (exports.lastRender) {
        td = (c_time - exports.lastRender) / (16.66667);
      }
      TWEEN.update();
      exports.lastRender = c_time;
      if (exports.heli) {
        exports.heli.rotation.z += 0.01 * td;
      }
      requestAnimationFrame(exports.render);
      if (exports.dirty) {
        exports.dirty = false;
        exports.renderer.render(exports.scene, exports.camera);
        exports.css_renderer.render(exports.css_scene, exports.camera);
      }
    },

    // Whether the canvas is marked dirty.
    dirty: true,

    /**
     * Focus on the target object.
     *
     * @param {THREE.Object} object - the THREE.js object to focus on.
     */
    focus: function(obj) {
      var time = 800;
      var distToCenter = 740 / Math.sin(Math.PI / 180.0 * exports.camera.fov * 0.5) * 0.5;
      var target = (new THREE.Vector3(0, 0, distToCenter)).applyQuaternion(obj.quaternion).add(obj.position);

      function markDirty() {
        exports.dirty = true;
      }
      new TWEEN.Tween(exports.camera.position).to(target, time).
      easing(TWEEN.Easing.Quadratic.InOut).onUpdate(markDirty).start();
      new TWEEN.Tween(exports.camera.quaternion).to(obj.quaternion, time).
      easing(TWEEN.Easing.Quadratic.InOut).onUpdate(markDirty).start();
    },

    // Triggers an update on the menu.
    updateMenu: function() {
      $('#slideView').html('');
      $(exports.css_scene.children).each(function(index, slide_obj) {
        var slide = slide_obj.element;
        var preview = $("<div draggable='true' class='slidePreview " + ($(slide).hasClass('active') ? 'active' : '') + "'><div class='slide'>" + $(slide).html() + '</div></div>');
        preview.find('.slide-content').attr('contenteditable', null);
        preview.appendTo($('#slideView')).data({
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
      $('.slidePreview').on('dragstart', function() {
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
        var new_index = $(this).closest('.slidePreview').data().index;
        exports.css_scene.children.move(slide_index, new_index);
        e.preventDefault();
        exports.dirty = true;
        _.delay(exports.updateMenu, 50);
      });
      $('.slidePreview').eq(exports.activeIndex).addClass('active');
    }
  };

  WS.toJSON = function() {
    if (!exports.css_scene) {
      return;
    }
    // Slides/HTML
    WebSyncData.views = [];
    // 3D Objects
    WebSyncData.objects = [];
    _.each(exports.css_scene.children, function(child) {
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

  WS.fromJSON = function() {
    var i;
    for (i = exports.css_scene.children.length; i--; i > 0) {
      exports.css_scene.remove(exports.css_scene.children[i]);
    }
    _.each(WebSyncData.views, function(view) {
      var elemm = $("<div class='awesome slide'><div class='slide-content' contenteditable=true>" + WS.JSONToDOM(view.body) + '</div></div>');
      var elem = exports.addCss(elemm[0]);
      _.each(['position', 'quaternion', 'scale'], function(prop) {
        _.each(view[prop], function(v, k) {
          elem[prop][k] = v;
        });
      });
    });
    exports.dirty = true;
    setTimeout(exports.updateMenu, 50);
  };

  $('body').append(JST['templates/awesome']({}));
  $('.content').hide().addClass('content-awesome').append($('<div class="content_container"></div>'));
  $('body').addClass('layout-awesome');
  var hidden = false;
  $('.content_well').css({
    left: 250
  });
  $('#addSlide').click(function() {
    var elemm = $("<div class='awesome slide'><div class='slide-content' contenteditable=true></div></div>");
    exports.addCss(elemm[0]);
    exports.dirty = true;
    _.delay(exports.updateMenu, 50);
    _.delay(function() {
      exports.setIndex(exports.css_scene.getDescendants().length - 1);
    }, 100);
  });
  $('#remSlide').click(function() {
    exports.css_scene.remove(exports.css_scene.children[exports.activeIndex]);
    exports.setIndex(exports.activeIndex);
    _.delay(exports.updateMenu, 50);
  });
  $('#presentation-nav #slideView').delegate('.slidePreview', 'click', function() {
    exports.setIndex($(this).data().index);
  });
  $('#properties input').change(function() {
    exports.changePositionOfSlide();
  }).blur(function() {
    var obj = exports.changePositionOfSlide.call(this);
    exports.updateProperties();
    exports.focus(obj);
    exports.dirty = true;
  });
  $(document).keydown(function(e) {
    if (WebSyncAuth.view_op === 'view') {
      if (e.keyCode === 39 || e.keyCode === 32 || e.keyCode === 40) {
        // Move forward a slide
        exports.setIndex(exports.activeIndex + 1);
        e.preventDefault();
      } else if (e.keyCode === 37 || e.keyCode === 38) {
        // Move back a slide
        exports.setIndex(exports.activeIndex - 1);
        e.preventDefault();
      }
    }
  });
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
  $(document).on('viewmode', function() {
    if (WS.viewMode === 'Presentation') {
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
    exports.scene = new THREE.Scene();
    exports.css_scene = new THREE.Scene();
    exports.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 10000);
    // Normal renderer
    exports.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    $('.content_container').append(exports.renderer.domElement);
    exports.css_renderer = new THREE.CSS3DRenderer();
    $(exports.css_renderer.domElement).css({
      top: 0,
      position: 'absolute'
    });
    $('.content_container').prepend(exports.css_renderer.domElement).bind('mousedown selectstart', function(e) {
      e.stopPropagation();
    });
    $('.content_container').on('mousedown', '.slide', function(e) {
      console.log(e);
      _.each(exports.css_scene.getDescendants(), function(dec, i) {
        if (dec.element === e.currentTarget) {
          exports.setIndex(i);
        }
      });
    });


    $(window).resize(exports.resize);
    _.defer(exports.resize);

    exports.dom = exports.css_renderer.domElement;
    WS.fromJSON();
    $('.content_container').bind('wheel', function(e) {
      if (e.originalEvent.deltaY) {
        exports.camera.position.add(new THREE.Vector3(0, 0, e.originalEvent.deltaY).applyQuaternion(exports.camera.quaternion));
        exports.dirty = true;
      }
      console.log(e);
    }).bind('mousedown', function(e) {
      console.log(e);
      if (e.currentTarget === e.target.parentElement || e.currentTarget === e.target.parentElement.parentElement) {
        exports.active = true;
        exports.start = {
          x: e.pageX,
          y: e.pageY
        };
        exports.cam_start = exports.camera.position.clone();
      }
    });
    $(document).bind('mousemove', function(e) {
      if (exports.active) {
        var x = exports.start.x - e.pageX;
        var y = e.pageY - exports.start.y;
        exports.camera.position = exports.cam_start.clone().add(new THREE.Vector3(x, y, 0).applyQuaternion(exports.camera.quaternion));
        exports.dirty = true;
        e.preventDefault();
      }
    }).bind('mouseup', function() {
      exports.active = false;
    });
    var ambientLight = new THREE.AmbientLight(0x444444);
    exports.scene.add(ambientLight);
    var light = new THREE.DirectionalLight(0xffffff);
    light.position.set(1, 1, 1).normalize();
    exports.scene.add(light);
    exports.camera.position.z = 500;


    // Testing code. This is only here as a preview for similar functionality.
    /*var geometry = new THREE.CubeGeometry(200, 200, 200);
        var material = new THREE.MeshLambertMaterial({
            color: 0x00ff00
        });
        exports.cube = new THREE.Mesh(geometry, material);
        exports.scene.add(exports.cube);
        exports.cube.position.z = 200;*/

    /*// Helicopter
        var loader = new THREE.OBJMTLLoader();
        loader.load('assets/uh60.obj', 'assets/uh60.mtl', function(object) {
            object.position.z = 200;
            object.rotation.x = Math.PI / 2
            object.rotation.y = Math.PI;
            object.rotation.z = Math.PI / 2;
            object.scale.multiplyScalar(50);
            exports.heli = object;
            exports.scene.add(object);
        });*/

    exports.render();
    $('.content').fadeIn();
    _.delay(function() {
      exports.setIndex(0);
    }, 100);
    NProgress.done();
  });
  $(document).on('diffed', function() {
    exports.updateMenu();
  });
  return exports;
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
