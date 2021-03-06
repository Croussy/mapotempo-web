if route.vehicle && @export_stores
  csv << [
    (route.vehicle.name if route.vehicle),
    route.ref || (route.vehicle && route.vehicle.name),
    0,
    nil,
    (route.start.strftime("%H:%M") if route.start),
    0,
    nil,
    route.vehicle.store_start.name,
    route.vehicle.store_start.street,
    nil,
    route.vehicle.store_start.postalcode,
    route.vehicle.store_start.city,
    route.vehicle.store_start.country,
    route.vehicle.store_start.lat,
    route.vehicle.store_start.lng,
    nil,
    nil,
    nil,
    nil,
    nil,
    nil,
    nil,
    nil,
    nil,
    nil
  ]
end

index = 0
route.stops.each { |stop|
  csv << [
    (route.vehicle.name if route.vehicle),
    route.ref || (route.vehicle && route.vehicle.name),
    (index+=1 if route.vehicle),
    ("%i:%02i" % [stop.wait_time/60/60, stop.wait_time/60%60] if route.vehicle && stop.wait_time),
    (stop.time.strftime("%H:%M") if route.vehicle && stop.time),
    (stop.distance if route.vehicle),
    stop.ref,
    stop.name,
    stop.street,
    stop.detail,
    stop.postalcode,
    stop.city,
    stop.country,
    stop.lat,
    stop.lng,
    stop.comment,
    stop.is_a?(StopDestination) ? (stop.destination.take_over ? stop.destination.take_over.strftime("%H:%M:%S") : nil) : route.vehicle.rest_duration.strftime("%H:%M:%S"),
    ((route.planning.customer.enable_orders ? (stop.order && stop.order.products.length > 0 ? stop.order.products.collect(&:code).join('/') : nil) : stop.destination.quantity) if stop.is_a?(StopDestination)),
    ((stop.active ? '1' : '0') if route.vehicle),
    (stop.open.strftime("%H:%M") if stop.open),
    (stop.close.strftime("%H:%M") if stop.close),
    (stop.destination.tags.collect(&:label).join('/') if stop.is_a?(StopDestination)),
    stop.out_of_window ? 'x' : '',
    stop.out_of_capacity ? 'x' : '',
    stop.out_of_drive_time ? 'x' : ''
  ]
}

if route.vehicle && @export_stores
  csv << [
    (route.vehicle.name if route.vehicle),
    route.ref || (route.vehicle && route.vehicle.name),
    index+1,
    nil,
    (route.end.strftime("%H:%M") if route.end),
    route.stop_distance,
    nil,
    route.vehicle.store_stop.name,
    route.vehicle.store_stop.street,
    nil,
    route.vehicle.store_stop.postalcode,
    route.vehicle.store_stop.city,
    route.vehicle.store_stop.country,
    route.vehicle.store_stop.lat,
    route.vehicle.store_stop.lng,
    nil,
    nil,
    nil,
    nil,
    nil,
    nil,
    nil,
    nil,
    nil,
    route.stop_out_of_drive_time ? 'x' : ''
  ]
end
