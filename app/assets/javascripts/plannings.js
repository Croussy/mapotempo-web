// Copyright © Mapotempo, 2013-2015
//
// This file is part of Mapotempo.
//
// Mapotempo is free software. You can redistribute it and/or
// modify since you respect the terms of the GNU Affero General
// Public License as published by the Free Software Foundation,
// either version 3 of the License, or (at your option) any later version.
//
// Mapotempo is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
// or FITNESS FOR A PARTICULAR PURPOSE.  See the Licenses for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with Mapotempo. If not, see:
// <http://www.gnu.org/licenses/agpl.html>
//
var plannings_form = function() {
  $('#planning_date').datepicker({
    language: defaultLocale,
    autoclose: true,
    calendarWeeks: true,
    todayHighlight: true
  });

  var formatNoMatches = I18n.t('web.select2.empty_result');
  $('select[name=planning\\[tag_ids\\]\\[\\]]').select2({
    theme: 'bootstrap',
    minimumResultsForSearch: -1,
    templateSelection: templateTag,
    templateResult: templateTag,
    formatNoMatches: function() {
      return formatNoMatches;
    },
    width: '100%'
  });
}

var plannings_new = function(params) {
  plannings_form();
}

var plannings_edit = function(params) {
  plannings_form();

  var planning_id = params.planning_id,
    zoning_id = params.zoning_id,
    map_layers = params.map_layers,
    map_lat = params.map_lat,
    map_lng = params.map_lng,
    route_ids = params.route_ids,
    vehicles_array = params.vehicles_array,
    vehicles_usages_map = params.vehicles_usages_map,
    url_click2call = params.url_click2call,
    colors = params.colors,
    layer_zoning,
    markers = {},
    stores = {},
    layers = {},
    layers_cluster = {},
    routes_layers,
    routes_layers_cluster,
    initial_zoning = $("#planning_zoning_id").val();

  // sidebar has to be created before map
  var sidebar = L.control.sidebar('edit-planning', {position: 'right'});
  sidebar.open('planning-pane');

  var map_layer;
  map_layers = $.map(map_layers, function(layer, i) {
    var l = L.tileLayer(layer.url, {
      maxZoom: 18,
      attribution: layer.attribution
    });
    l.name = layer.name;
    if(layer.default) {
      map_layer = l;
    }
    return l;
  });

  var map_layer_names = {};
  $.each(map_layers, function(i, layer) {
    map_layer_names[layer.name] = layer;
  });

  var map = new L.Map('map', {
    attributionControl: false,
    layers: map_layer
  }).setView([map_lat, map_lng], 13);
  //L.control.layers(map_layer_names).addTo(map);
  L.control.attribution({prefix: false, position: 'bottomleft'}).addTo(map);
  L.control.scale({
    imperial: false
  }).addTo(map);

  var fitBounds = (window.location.hash) ? false : true;
  new L.Hash(map);

  sidebar.addTo(map);

  var geocoder = L.Control.geocoder({
    geocoder: L.Control.Geocoder.nominatim({
      serviceUrl: "/api/0.1/geocoder/"
    }),
    position: 'topleft',
    placeholder: I18n.t('web.geocoder.search'),
    errorMessage: I18n.t('web.geocoder.empty_result')
  }).addTo(map);
  geocoder.markGeocode = function(result) {
    this._map.fitBounds(result.bbox.pad(1.1), {
      maxZoom: 15
    });
  };

  routes_layers = L.featureGroup();
  routes_layers_cluster = L.featureGroup();
  map.addLayer(routes_layers);

  map.on('zoomend', function(e) {
    if (map.getZoom() >= 17) {
      map.removeLayer(routes_layers);
      map.addLayer(routes_layers_cluster);
    } else {
      map.removeLayer(routes_layers_cluster);
      map.addLayer(routes_layers);
    }
  });

  $.each(route_ids, function(i, id) {
    layers[id] = L.featureGroup();
    layers_cluster[id] = L.featureGroup();
  });

  var enlighten_stop = function(stop_id) {
    var e = $(".routes [data-stop_id='" + stop_id + "']");
    e.css("background", "orange");
    setTimeout(function() {
      e.css("background", "");
    }, 1500);

    if (e.offset().top < 0 || e.offset().top > $(".sidebar-content").height()) {
      $(".sidebar-content").animate({
        scrollTop: e.offset().top + $(".sidebar-content").scrollTop() - 100
      });
    }
  }

  var display_zoning = function(zoning) {
    if (layer_zoning) {
      map.removeLayer(layer_zoning);
    }
    layer_zoning = new L.LayerGroup();
    $.each(zoning.zones, function(index, zone) {
      var geom = L.geoJson(JSON.parse(zone.polygon)).getLayers()[0];
      geom.setStyle({
        color: (zone.vehicle_id ? vehicles_usages_map[zone.vehicle_id].color : '#707070')
      });
      geom.addTo(layer_zoning);
    });
    layer_zoning.addTo(map);
  }

  $("#planning_zoning_id").change(function() {
    var id = $(this).val();
    if (id) {
      $("#zoning_new").hide();

      $("#zoning_edit")
        .show()
        .attr("href", "/zonings/" + id + "/edit/planning/" + planning_id + "?back=true");

      $.ajax({
        type: "get",
        url: "/api/0.1/zonings/" + id + ".json",
        beforeSend: beforeSendWaiting,
        success: display_zoning,
        complete: completeAjaxMap,
        error: ajaxError
      });
    } else {
      $("#zoning_edit").hide();
      $("#zoning_new").show();
      map.removeLayer(layer_zoning);
      layer_zoning = null;
    }
  });

  $("#optimize_each").click( function(event, ui) {
    if (!confirm(I18n.t('plannings.edit.optimize_each_confirm'))) {
      return false;
    }
    $.ajax({
      type: "get",
      url: '/plannings/' + planning_id + '/optimize_each.json',
      beforeSend: beforeSendWaiting,
      success: display_planning,
      complete: completeAjaxMap,
      error: ajaxError
    });
  });

  var update_planning = function(event, ui) {
    var item = $(ui.item),
      index = 0,
      route = item.closest('[data-route_id]'),
      stops = $('.sortable li[data-stop_id]', route),
      route_id = route.attr('data-route_id'),
      stop_id = item.closest("[data-stop_id]").attr("data-stop_id");
    while (stops[index].attributes['data-stop_id'].value != stop_id) {
      index++;
    }
    $.ajax({
      type: 'patch',
      url: '/plannings/' + planning_id + '/' + route_id + '/' + stop_id + '/move/' + (index + 1) + '.json',
      beforeSend: beforeSendWaiting,
      success: display_planning,
      complete: completeAjaxMap,
      error: function(request, status, error) {
        ajaxError(request, status, error);
        $("#out_of_route, .stops").sortable('cancel');
      }
    });
  }

  var display_route = function(data, route) {
      var color = route.color || (route.vehicle && route.vehicle.color) || '#707070';
      var vehicle_name;
      if (route.vehicle) {
        vehicle_name = route.vehicle.name;
      }

      routes_layers.removeLayer(layers[route.route_id]);
      routes_layers_cluster.removeLayer(layers_cluster[route.route_id]);
      layers[route.route_id] = L.featureGroup();
      layers_cluster[route.route_id] = new L.MarkerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 1,
        spiderfyDistanceMultiplier: 0.5,
        iconCreateFunction: function(cluster) {
          var markers = cluster.getAllChildMarkers();
          var n = [], i;
          for (i = 0; i < markers.length; i++) {
            if (markers[i].number) {
              if (n.length < 2) {
                n.push(markers[i].number);
              } else {
                n = [n[0], "…"];
                break;
              }
            }
          }
          return new L.NumberedDivIcon({
            number: n.join(","),
            iconUrl: '/images/point_large-' + color.substr(1) + '.svg',
            iconSize: new L.Point(24, 24),
            iconAnchor: new L.Point(12, 12),
            popupAnchor: new L.Point(0, -12),
            className: "large"
          });
        }
      });

      $.each(route.stops, function(index, stop) {
        if (stop.trace) {
          var polyline = new L.Polyline(L.PolylineUtil.decode(stop.trace, 6));
          L.polyline(polyline.getLatLngs(), {
            color: color
          }).addTo(layers[route.route_id]);
          L.polyline(polyline.getLatLngs(), {
            offset: 3,
            color: color
          }).addTo(layers_cluster[route.route_id]);
        }
        if (stop.destination && $.isNumeric(stop.lat) && $.isNumeric(stop.lng)) {
          stop.i18n = mustache_i18n;
          stop.color = stop.destination.color || color;
          stop.vehicle_name = vehicle_name;
          stop.route_id = route.route_id;
          stop.routes = data.routes;
          stop.planning_id = data.planning_id;
          var m = L.marker(new L.LatLng(stop.lat, stop.lng), {
            icon: new L.NumberedDivIcon({
              number: stop.number,
              iconUrl: '/images/' + (stop.destination.icon || 'point') + '-' + stop.color.substr(1) + '.svg',
              iconSize: new L.Point(12, 12),
              iconAnchor: new L.Point(6, 6),
              popupAnchor: new L.Point(0, -6),
              className: "small"
            })
          }).addTo(layers[route.route_id]).addTo(layers_cluster[route.route_id]).bindPopup(SMT['stops/show']({stop: stop}), {
            minWidth: 200,
            autoPan: false
          });
          m.number = stop.number;
          m.on('mouseover', function(e) {
            m.openPopup();
          }).on('mouseout', function(e) {
            if (!m.click) {
              m.closePopup();
            }
          }).off('click').on('click', function(e) {
            if (m.click) {
              m.closePopup();
            } else {
              m.click = true;
              m.openPopup();
              enlighten_stop(stop.stop_id);
            }
          }).on('popupopen', function(e) {
            $('.phone_number', e.popup._container).click(function(e) {
              phone_number_call(e.currentTarget.innerHTML, url_click2call, e.target);
            });
          }).on('popupclose', function(e) {
            m.click = false;
          });
          markers[stop.stop_id] = m;
        }
      });
      if (route.store_stop && route.store_stop.stop_trace) {
        var polyline = new L.Polyline(L.PolylineUtil.decode(route.store_stop.stop_trace, 6));
        L.polyline(polyline.getLatLngs(), {
          color: color
        }).addTo(layers[route.route_id]).addTo(layers_cluster[route.route_id]);
      }

      if (!route.hidden) {
        routes_layers_cluster.addLayer(layers_cluster[route.route_id]);
        routes_layers.addLayer(layers[route.route_id]);
      }
  }

  var display_planning = function(data) {
    if ($("#dialog-optimizer").size() == 0) {
      return; // Avoid render and loop with turbolink when page is over
    }
    if (!progress_dialog(data.optimizer, $("#dialog-optimizer"), display_planning, '/plannings/' + planning_id + '.json')) {
      return;
    }

    $.each(data.routes, function(i, route) {
      if (route.vehicle_id) {
        route.vehicle = vehicles_usages_map[route.vehicle_id];
        route.path = '/vehicle_usages/' + route.vehicle_usage_id + '/edit?back=true';
      }
    });

    data.i18n = mustache_i18n;
    data.planning_id = data.id;

    var empty_colors = colors.slice();
    empty_colors.unshift('');
    $.each(data.routes, function(i, route) {
      route.colors = $.map(empty_colors, function(color) {
        return {
          color: color,
          selected: route.color == color
        };
      });
      $.each(route.stops, function(i, stop) {
        if(stop.destination && stop.destination.color) {
          stop.destination.color_force = true;
        } else {
          stop.color = route.color;
        }
      });
    });

    $("#planning").html(SMT['plannings/edit'](data));


    var stores_marker = L.featureGroup();
    stores = {};
    $.each(data.stores, function(i, store) {
      store.store = true;
      store.planning_id = data.planning_id;
      if ($.isNumeric(store.lat) && $.isNumeric(store.lng)) {
        var m = L.marker(new L.LatLng(store.lat, store.lng), {
          icon: L.icon({
            iconUrl: '/images/marker-home' + (store.color ? ('-' + store.color.substr(1)) : '') + '.svg',
            iconSize: new L.Point(32, 32),
            iconAnchor: new L.Point(16, 16),
            popupAnchor: new L.Point(0, -12)
          })
        }).addTo(stores_marker).bindPopup(SMT['stops/show']({stop: store}), {
          minWidth: 200,
          autoPan: false
        });
        m.on('mouseover', function(e) {
          m.openPopup();
        }).on('mouseout', function(e) {
          if (!m.click) {
            m.closePopup();
          }
        }).off('click').on('click', function(e) {
          if (m.click) {
            m.closePopup();
          } else {
            m.click = true;
            m.openPopup();
          }
        }).on('popupclose', function(e) {
          m.click = false;
        });
        stores[store.id] = m;
      }
    });
    stores_marker.addTo(map);


    var templateSelectionColor = function(state) {
      if(state.id){
        return $("<span class='color_small' style='background:" + state.id + "'></span>");
      } else {
      }
    }

    var templateResultColor = function(state) {
      if(state.id){
        return $("<span class='color_small' style='background:" + state.id + "'></span>");
      } else {
        return $("<span class='color_small' data-color=''></span>");
      }
    }

    var formatNoMatches = I18n.t('web.select2.empty_result');
    $(".color_select").select2({
      minimumResultsForSearch: -1,
      templateSelection: templateSelectionColor,
      templateResult: templateResultColor,
      formatNoMatches: function() {
        return formatNoMatches;
      }
    });

    var templateSelectionVehicles = function(state) {
      if(state.id) {
        var color = $('.color_select', $(state.element).parent().parent()).val();
        if(color) {
          return $("<span/>").text(vehicles_usages_map[state.id].name);
        } else {
          return $("<span><span class='color_small' style='background:" + vehicles_usages_map[state.id].color + "'></span>&nbsp;</span>").append($("<span/>").text(vehicles_usages_map[state.id].name));
        }
      }
    }

    var templateResultVehicles = function(state) {
      if(state.id){
        return $("<span><span class='color_small' style='background:" + vehicles_usages_map[state.id].color + "'></span>&nbsp;</span>").append($("<span/>").text(vehicles_usages_map[state.id].name));
      } else {
        console.log(state);
      }
    }

    var formatNoMatches = I18n.t('web.select2.empty_result');
    $(".vehicle_select").select2({
      minimumResultsForSearch: -1,
      data: vehicles_array,
      templateSelection: templateSelectionVehicles,
      templateResult: templateResultVehicles,
      formatNoMatches: function() {
        return formatNoMatches;
      }
    });

    $.each(data.routes, function(i, route) {
      display_route(data, route);
    });

    if (data.stop_id_enlighten) {
      enlighten_stop(data.stop_id_enlighten);
    }

    $(".export_tomtom a").click(function() {
      var url = this.href;
      $.ajax({
        type: "get",
        url: url,
        beforeSend: function() {
          $("#dialog-tomtom").dialog("open");
        },
        success: function(data) {
          bootstrap_alert_success(I18n.t('plannings.edit.export.tomtom_success'));
        },
        complete: function() {
          $("#dialog-tomtom").dialog("close");
        },
        error: ajaxError
      });
      $(this).closest(".dropdown-menu").prev().dropdown("toggle");
      return false;
    });

    $(".export_masternaut a").click(function() {
      var url = this.href;
      $.ajax({
        type: "get",
        url: url,
        beforeSend: function() {
          $("#dialog-masternaut").dialog("open");
        },
        success: function(data) {
          bootstrap_alert_success(I18n.t('plannings.edit.export.masternaut_success'));
        },
        complete: function() {
          $("#dialog-masternaut").dialog("close");
        },
        error: ajaxError
      });
      $(this).closest(".dropdown-menu").prev().dropdown("toggle");
      return false;
    });

    $(".export_alyacom a").click(function() {
      var url = this.href;
      $.ajax({
        type: "get",
        url: url,
        beforeSend: function() {
          $("#dialog-alyacom").dialog("open");
        },
        success: function(data) {
          bootstrap_alert_success(I18n.t('plannings.edit.export.alyacom_success'));
        },
        complete: function() {
          $("#dialog-alyacom").dialog("close");
        },
        error: ajaxError
      });
      $(this).closest(".dropdown-menu").prev().dropdown("toggle");
      return false;
    });

    $(".vehicle_select").change(function() {
      var $this = $(this);
      var initial_value = $this.data("initial-value");
      if(initial_value != $this.val()) {
        $.ajax({
          type: "patch",
          data: JSON.stringify({
            route_id: $this.closest("[data-route_id]").attr("data-route_id"),
            vehicle_usage_id: vehicles_usages_map[$this.val()].vehicle_usage_id
          }),
          contentType: 'application/json',
          url: '/plannings/' + planning_id + '/switch.json',
          beforeSend: beforeSendWaiting,
          success: display_planning,
          complete: completeAjaxMap,
          error: ajaxError
        });
      }
    });

    $(".routes").sortable({
      disabled: true,
      items: "li.route"
    });

    $("#out_of_route .sortable").sortable({
      connectWith: ".sortable",
      update: update_planning
    }).disableSelection();

    var sortableUpdate = false;
    $(".stops.sortable").sortable({
      distance: 8,
      connectWith: ".sortable",
      items: "li",
      cancel: '.wait',
      start: function(event, ui) {
        sortableUpdate = false;
      },
      update: function(event, ui) {
        sortableUpdate = true;
      },
      stop: function(event, ui) {
        if (sortableUpdate) {
          update_planning(event, ui);
        }
      }
    }).disableSelection();

    $("#refresh").click(function(event, ui) {
      $.ajax({
        type: "get",
        url: '/plannings/' + planning_id + '/refresh.json',
        beforeSend: beforeSendWaiting,
        success: display_planning,
        complete: completeAjaxMap,
        error: ajaxError
      });
    });

    $(".routes")
      .on("click", ".toggle", function(event, ui) {
        var id = $(this).closest("[data-route_id]").attr("data-route_id");
        var li = $("ul.stops, ol.stops", $(this).closest("li"));
        li.toggle();
        var hidden = !li.is(":visible");
        $.ajax({
          type: "put",
          data: JSON.stringify({
            hidden: hidden
          }),
          contentType: 'application/json',
          url: '/api/0.1/plannings/' + planning_id + '/routes/' + id + '.json',
          error: ajaxError
        });

        var i = $("i", this);
        if (hidden) {
          i.removeClass("fa-eye").addClass("fa-eye-slash");
          routes_layers.removeLayer(layers[id]);
          routes_layers_cluster.removeLayer(layers_cluster[id]);
        } else {
          i.removeClass("fa-eye-slash").addClass("fa-eye");
          routes_layers.addLayer(layers[id]);
          routes_layers_cluster.addLayer(layers_cluster[id]);
        }
      })
      .on("click", ".marker", function(event, ui) {
        var stop_id = $(this).closest("[data-stop_id]").attr("data-stop_id");
        if (stop_id in markers) {
          map.setView(markers[stop_id].getLatLng(), 17, {
            reset: true
          });
          var route_id = $(this).closest("[data-route_id]").attr("data-route_id");
          layers_cluster[route_id].zoomToShowLayer(markers[stop_id], function() {
            markers[stop_id].openPopup();
          });
        } else {
          var store_id = $(this).closest("[data-store_id]").attr("data-store_id");
          if (store_id in stores) {
            map.setView(stores[store_id].getLatLng(), 17, {
              reset: true
            });
            stores[store_id].openPopup();
          }
        }
        return false;
      })
      .on("click", ".optimize", function(event, ui) {
        if (!confirm(I18n.t('plannings.edit.optimize_confirm'))) {
          return;
        }
        var id = $(this).closest("[data-route_id]").attr("data-route_id");
        $.ajax({
          type: "get",
          url: '/plannings/' + planning_id + '/' + id + '/optimize.json',
          beforeSend: beforeSendWaiting,
          success: display_planning,
          complete: completeAjaxMap,
          error: ajaxError
        });
      })
      .on("click", ".active_all, .active_reverse, .active_none, .reverse_order", function(event, ui) {
        var url = this.href;
        $.ajax({
          type: "patch",
          url: url,
          beforeSend: beforeSendWaiting,
          success: display_planning,
          complete: completeAjaxMap,
          error: ajaxError
        });
        return false;
      })
      .on("change", "[name=route\\\[ref\\\]]", function() {
        var id = $(this).closest("[data-route_id]").attr("data-route_id");
        var ref = this.value;
        $.ajax({
          type: "put",
          data: JSON.stringify({
            ref: ref
          }),
          contentType: 'application/json',
          url: '/api/0.1/plannings/' + planning_id + '/routes/' + id + '.json',
          error: ajaxError
        });
      })
      .on("change", "[name=route\\\[color\\\]]", function() {
        var vehicle_select = $('.vehicle_select', $(this).closest("[data-route_id]"));
        vehicle_select.trigger('change');
        var id = $(this).closest("[data-route_id]").attr("data-route_id");
        var color = this.value;
        $.ajax({
          type: "put",
          data: JSON.stringify({
            color: color
          }),
          contentType: 'application/json',
          url: '/api/0.1/plannings/' + planning_id + '/routes/' + id + '.json',
          error: ajaxError
        });
        var route = data.routes.reduce(function(found, el) {
          return found || (el.route_id == id && el);
        }, null);
        route.color = color;
        display_route(data, route);
        $('li[data-route_id=' + id + '] li[data-stop_id] .number:not(.color_force)').css('background', color || route.vehicle.color);
      });

    $(".lock").click(function(event, ui) {
      var id = $(this).closest("[data-route_id]").attr("data-route_id");
      var i = $("i", this);
      i.toggleClass("fa-lock");
      i.toggleClass("fa-unlock");
      $(this).toggleClass("btn-default");
      $(this).toggleClass("btn-warning");
      var locked = i.hasClass("fa-lock");
      $.ajax({
        type: "put",
        data: JSON.stringify({
          locked: locked
        }),
        contentType: 'application/json',
        url: '/api/0.1/plannings/' + planning_id + '/routes/' + id + '.json',
        error: ajaxError
      });
    });
  }

  $(".main").on("click", ".automatic_insert", function(event, ui) {
    var stop_id = $(this).closest("[data-stop_id]").attr("data-stop_id");
    $.ajax({
      type: "patch",
      url: '/plannings/' + planning_id + '/automatic_insert/' + stop_id + '.json',
      beforeSend: beforeSendWaiting,
      success: function(data) {
        data.stop_id_enlighten = stop_id;
        display_planning(data);
      },
      complete: completeAjaxMap,
      error: ajaxError
    });
  });

  $(".main").on('change', 'input:checkbox.stop_active', function(event, ui) {
    var route_id = $(event.target).closest("[data-route_id]").attr("data-route_id");
    var stop_id = $(event.target).closest("[data-stop_id]").attr("data-stop_id");
    var active = $(event.target).is(':checked');
    $.ajax({
      type: "patch",
      data: JSON.stringify({
        stop: {
          active: active
        }
      }),
      contentType: 'application/json',
      url: '/plannings/' + planning_id + '/' + route_id + '/' + stop_id + '.json',
      beforeSend: beforeSendWaiting,
      success: display_planning,
      complete: completeAjaxMap,
      error: ajaxError
    });
  });

  $(".main").on("click", ".send_to_route", function(event, ui) {
    var url = this.href;
    $.ajax({
      type: 'patch',
      url: url,
      beforeSend: beforeSendWaiting,
      success: display_planning,
      complete: completeAjaxMap,
      error: ajaxError
    });
    return false;
  });

  var display_planning_first_time = function(data) {
    display_planning(data);
    if (fitBounds) {
      var bounds = routes_layers.getBounds();
      if (bounds && bounds.isValid()) {
        map.invalidateSize();
        map.fitBounds(bounds.pad(1.1), {animate: false});
      }
    }
  }

  $('.btn.extend').click(function() {
    $('.sidebar').toggleClass('extended');
    if ($('.sidebar').hasClass('extended')) {
      $(".routes").sortable("enable");
    } else {
      $(".routes").sortable("disable");
    }
  });

  $.ajax({
    url: '/plannings/' + planning_id + '.json',
    beforeSend: beforeSendWaiting,
    success: display_planning_first_time,
    complete: completeAjaxMap,
    error: ajaxError
  });

  if (zoning_id) {
    $.ajax({
      type: "get",
      url: "/api/0.1/zonings/" + zoning_id + ".json",
      beforeSend: beforeSendWaiting,
      success: display_zoning,
      complete: completeAjaxMap,
      error: ajaxError
    });
  }

  $("#dialog-optimizer").dialog({
    autoOpen: false,
    modal: true
  });

  $("#dialog-tomtom").dialog({
    autoOpen: false,
    modal: true
  });

  $("#dialog-masternaut").dialog({
    autoOpen: false,
    modal: true
  });

  $("#dialog-alyacom").dialog({
    autoOpen: false,
    modal: true
  });

  $("form").submit(function(event) {
    var new_zoning = $("#planning_zoning_id").val();
    if (new_zoning && initial_zoning != new_zoning) {
      if (!confirm(I18n.t('plannings.edit.zoning_confirm'))) {
        return false;
      }
      $("#dialog-zoning").dialog({
        modal: true
      });
    }
  });

  hideAlert('.alert-success', timeAlert);
}

var plannings_show = function(params){
  window.print();
}

Paloma.controller('Planning').prototype.new = function() {
  plannings_new(this.params);
};

Paloma.controller('Planning').prototype.create = function() {
  plannings_new(this.params);
};

Paloma.controller('Planning').prototype.edit = function() {
  plannings_edit(this.params);
};

Paloma.controller('Planning').prototype.update = function() {
  plannings_edit(this.params);
};

Paloma.controller('Planning').prototype.show = function() {
  plannings_show(this.params);
};